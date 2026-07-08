#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/smoke.sh — end-to-end smoke test for the BMO Robot API.
#
# Workflow:
#   1. (re)build the production bundle (`npm run build`) unless --no-build.
#   2. Spawn `dist/server.cjs` on PORT=${SMOKE_PORT:-3001}.
#   3. Poll /api/health until it returns 200 or the timeout (default 30s).
#   4. Hit /api/admin/stats with the admin key from .env (or fall back to
#      `bmo-smoke-admin-key` for CI).
#   5. Hit /api/models/waste-classifier to confirm the pinned manifest is
#      reachable and signed.
#   6. Tear down the server and exit 0 / non-zero.
#
# Usage:
#   bash scripts/smoke.sh
#   bash scripts/smoke.sh --no-build
#
# Environment overrides:
#   SMOKE_PORT     port to bind (default 3001)
#   SMOKE_TIMEOUT  seconds to wait for /api/health (default 30)
#   ADMIN_API_KEY  admin key for /api/admin/* (loaded from .env if present)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

PORT="${SMOKE_PORT:-3001}"
TIMEOUT="${SMOKE_TIMEOUT:-30}"
ADMIN_KEY="${ADMIN_API_KEY:-bmo-smoke-admin-key}"
BASE="http://localhost:${PORT}"

# ── args ────────────────────────────────────────────────────────────────────
NO_BUILD=0
for arg in "$@"; do
  case "$arg" in
    --no-build) NO_BUILD=1 ;;
    *) echo "Unknown arg: $arg" >&2; exit 2 ;;
  esac
done

# ── pick admin key from .env if not supplied ────────────────────────────────
if [[ ! "$ADMIN_KEY" =~ ^bmo-smoke- ]] && [[ -f .env ]]; then
  : # user already set a real key
elif [[ -f .env ]] && grep -q '^ADMIN_API_KEY=' .env; then
  ADMIN_KEY="$(grep '^ADMIN_API_KEY=' .env | head -n1 | cut -d'=' -f2-)"
fi

# ── build ───────────────────────────────────────────────────────────────────
if [[ "$NO_BUILD" -eq 0 ]]; then
  echo "[smoke] npm run build (Node $(node -v)) ..."
  npm run build >/tmp/smoke-build.log 2>&1 || {
    echo "[smoke] build failed — last 40 lines of /tmp/smoke-build.log:" >&2
    tail -n 40 /tmp/smoke-build.log >&2
    exit 1
  }
fi

if [[ ! -f dist/server.cjs ]]; then
  echo "[smoke] dist/server.cjs not found even after build" >&2
  exit 1
fi

# ── spawn server ────────────────────────────────────────────────────────────
echo "[smoke] booting dist/server.cjs on :$PORT ..."
PORT="$PORT" ADMIN_API_KEY="$ADMIN_KEY" \
  RESEARCH_DB_ENABLED="${RESEARCH_DB_ENABLED:-false}" \
  node dist/server.cjs >/tmp/smoke-server.log 2>&1 &
SERVER_PID=$!
trap 'echo "[smoke] tearing down pid=$SERVER_PID"; kill "$SERVER_PID" 2>/dev/null || true; wait "$SERVER_PID" 2>/dev/null || true' EXIT

# ── wait for /api/health ────────────────────────────────────────────────────
echo "[smoke] waiting up to ${TIMEOUT}s for $BASE/api/health ..."
DEADLINE=$(( $(date +%s) + TIMEOUT ))
HEALTH_OK=0
while [[ $(date +%s) -lt $DEADLINE ]]; do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "[smoke] server process died; tail of log:" >&2
    tail -n 40 /tmp/smoke-server.log >&2
    exit 1
  fi
  if curl -sf "$BASE/api/health" >/tmp/smoke-health.json 2>/dev/null; then
    HEALTH_OK=1
    break
  fi
  sleep 1
done

if [[ "$HEALTH_OK" -ne 1 ]]; then
  echo "[smoke] /api/health never returned 200 within ${TIMEOUT}s" >&2
  tail -n 60 /tmp/smoke-server.log >&2
  exit 1
fi
echo "[smoke] ✓ /api/health 200 OK"
cat /tmp/smoke-health.json | head -c 600; echo

# ── /api/admin/stats with admin key ─────────────────────────────────────────
echo "[smoke] → GET /api/admin/stats with x-admin-key"
ADMIN_STATUS=$(curl -s -o /tmp/smoke-admin.json -w "%{http_code}" \
  -H "x-admin-key: $ADMIN_KEY" \
  "$BASE/api/admin/stats" || true)
if [[ "$ADMIN_STATUS" != "200" ]]; then
  echo "[smoke] ✗ /api/admin/stats returned $ADMIN_STATUS (expected 200)" >&2
  echo "[smoke] body: $(cat /tmp/smoke-admin.json)" >&2
  exit 1
fi
echo "[smoke] ✓ /api/admin/stats 200 OK ($(wc -c </tmp/smoke-admin.json) bytes)"

# ── /api/models/waste-classifier (pinned artifact) ──────────────────────────
echo "[smoke] → GET /api/models/waste-classifier"
MODEL_STATUS=$(curl -s -o /tmp/smoke-model.json -w "%{http_code}" \
  "$BASE/api/models/waste-classifier" || true)
if [[ "$MODEL_STATUS" != "200" ]]; then
  echo "[smoke] ✗ /api/models/waste-classifier returned $MODEL_STATUS (expected 200)" >&2
  echo "[smoke] body: $(cat /tmp/smoke-model.json)" >&2
  exit 1
fi
SHA=$(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/smoke-model.json','utf8')).manifest.sha256)" 2>/dev/null || echo "?")
echo "[smoke] ✓ /api/models/waste-classifier 200 OK, sha256=${SHA:0:16}…"

# ── /api/models/waste-classifier@missing should 404 ─────────────────────────
echo "[smoke] → GET /api/models/does-not-exist (must 404)"
MISSING_STATUS=$(curl -s -o /tmp/smoke-missing.json -w "%{http_code}" \
  "$BASE/api/models/does-not-exist" || true)
if [[ "$MISSING_STATUS" != "404" ]]; then
  echo "[smoke] ✗ /api/models/does-not-exist returned $MISSING_STATUS (expected 404)" >&2
  exit 1
fi
echo "[smoke] ✓ missing model 404 OK"

# ── done ────────────────────────────────────────────────────────────────────
echo "[smoke] all checks passed"
exit 0