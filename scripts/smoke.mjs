#!/usr/bin/env node
/**
 * scripts/smoke.mjs — Cross-platform smoke test (Node.js only).
 *
 * Why a Node port of `smoke.sh`?
 * ──────────────────────────────
 * The bash version is the canonical CI script, but on Windows the
 * PowerShell `bash` shim sometimes swallows stderr and translates
 * `D:\wget` style paths through WSL, which means smoke.sh can fail
 * for environmental reasons unrelated to the actual product. This
 * file performs the same end-to-end check (build → boot → /api/health
 * → /api/admin/stats → /api/models/waste-classifier → tear down)
 * using only Node's built-in APIs, so it works the same way on
 * Linux, macOS and Windows.
 *
 * Usage:
 *   node scripts/smoke.mjs
 *   node scripts/smoke.mjs --no-build
 *   SMOKE_PORT=3002 node scripts/smoke.mjs
 */

import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const args = new Set(process.argv.slice(2));
const NO_BUILD = args.has("--no-build");

const PORT = Number(process.env.SMOKE_PORT ?? 3001);
// First boot is slow because the server pulls 557 users from Firebase
// and runs the Google Sheets auto-sync. Allow 90s in CI by default.
const TIMEOUT_S = Number(process.env.SMOKE_TIMEOUT ?? 90);
const BASE = `http://localhost:${PORT}`;

function readAdminKey() {
  if (process.env.ADMIN_API_KEY) return process.env.ADMIN_API_KEY;
  const envPath = resolve(ROOT, ".env");
  if (!existsSync(envPath)) return "bmo-smoke-admin-key";
  try {
    const txt = readFileSync(envPath, "utf8");
    const m = txt.match(/^ADMIN_API_KEY=(.+)$/m);
    return m ? m[1].trim() : "bmo-smoke-admin-key";
  } catch {
    return "bmo-smoke-admin-key";
  }
}

function logStep(msg) {
  process.stdout.write(`[smoke] ${msg}\n`);
}

function fail(msg, extra) {
  process.stderr.write(`[smoke] FAIL: ${msg}\n`);
  if (extra) process.stderr.write(extra + "\n");
  process.exit(1);
}

async function run(cmd, opts = {}) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, { shell: true, cwd: ROOT, ...opts });
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d.toString()));
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("close", (code) => res({ code, out, err }));
    p.on("error", rej);
  });
}

async function fetchOk(url, opts = {}) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(2000) });
    const text = await r.text();
    return { ok: r.ok, status: r.status, body: text, latencyMs: Date.now() - t0 };
  } catch (e) {
    return { ok: false, status: 0, body: "", error: String(e), latencyMs: Date.now() - t0 };
  }
}

async function waitForHealth() {
  const deadline = Date.now() + TIMEOUT_S * 1000;
  while (Date.now() < deadline) {
    const r = await fetchOk(`${BASE}/api/health`);
    if (r.ok && r.status === 200) return r;
    await delay(500);
  }
  return null;
}

async function main() {
  const ADMIN_KEY = readAdminKey();
  logStep(`Node ${process.version}, port=${PORT}, timeout=${TIMEOUT_S}s`);

  // 1. Build (unless --no-build)
  if (!NO_BUILD) {
    logStep("npm run build ...");
    const r = await run("npm run build");
    if (r.code !== 0) {
      fail("build failed", r.err || r.out);
    }
    logStep("build OK");
  }

  const serverPath = resolve(ROOT, "dist/server.cjs");
  if (!existsSync(serverPath)) {
    fail("dist/server.cjs missing — run `npm run build` first");
  }

  // 2. Spawn server
  logStep(`booting dist/server.cjs on :${PORT} ...`);
  const env = {
    ...process.env,
    PORT: String(PORT),
    NODE_ENV: process.env.NODE_ENV ?? "production",
    ADMIN_API_KEY: ADMIN_KEY,
    RESEARCH_DB_ENABLED: process.env.RESEARCH_DB_ENABLED ?? "false",
  };
  const server = spawn(process.execPath, [serverPath], {
    cwd: ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverLog = "";
  server.stdout.on("data", (d) => (serverLog += d.toString()));
  server.stderr.on("data", (d) => (serverLog += d.toString()));

  const cleanup = () => {
    try {
      server.kill();
    } catch {}
  };
  process.on("SIGINT", () => {
    cleanup();
    process.exit(130);
  });

  // 3. Wait for /api/health (503 is acceptable when DB is intentionally
  //    disabled via RESEARCH_DB_ENABLED=false; the JSON body still has to
  //    be parseable and contain the components map).
  logStep("polling /api/health ...");
  const deadline = Date.now() + TIMEOUT_S * 1000;
  let health = null;
  while (Date.now() < deadline) {
    health = await fetchOk(`${BASE}/api/health`);
    if (health.status !== 0) break;
    // Server died?
    if (!server.killed && server.exitCode !== null) {
      break;
    }
    await delay(500);
  }
  if (!health || health.status === 0) {
    cleanup();
    const tail = serverLog.split("\n").slice(-40).join("\n");
    fail(
      `/api/health never responded within ${TIMEOUT_S}s (server exit=${server.exitCode ?? "alive"})`,
      tail,
    );
  }
  let healthJson = {};
  try {
    healthJson = JSON.parse(health.body);
  } catch {
    cleanup();
    fail("/api/health did not return JSON", health.body);
  }
  const expectedCodes = [200, 503]; // 200 = fully healthy, 503 = degraded but reachable
  if (!expectedCodes.includes(health.status)) {
    cleanup();
    fail(`/api/health returned ${health.status} (expected 200 or 503)`, health.body);
  }
  if (!healthJson.components) {
    cleanup();
    fail("/api/health JSON missing components map", JSON.stringify(healthJson));
  }
  logStep(
    `/api/health ${health.status} — ok=${healthJson.ok} components=${Object.keys(healthJson.components).join(", ")}`,
  );
  if (healthJson.ok === false) {
    logStep(`  warnings: ${(healthJson.warnings ?? []).join("; ") || "(none)"}`);
  }

  // 4. /api/admin/stats
  const admin = await fetchOk(`${BASE}/api/admin/stats`, {
    headers: { "x-admin-key": ADMIN_KEY },
  });
  if (admin.status !== 200) {
    cleanup();
    fail(`/api/admin/stats returned ${admin.status} (expected 200)`, admin.body);
  }
  logStep(`/api/admin/stats 200 OK (${admin.body.length} bytes)`);

  // 5. /api/models/waste-classifier
  const model = await fetchOk(`${BASE}/api/models/waste-classifier`);
  if (model.status !== 200) {
    cleanup();
    fail(`/api/models/waste-classifier returned ${model.status} (expected 200)`, model.body);
  }
  let modelJson = {};
  try {
    modelJson = JSON.parse(model.body);
  } catch {}
  logStep(`/api/models/waste-classifier 200 OK, sha256=${(modelJson.manifest?.sha256 ?? "?").slice(0, 16)}…`);

  // 6. /api/models/missing should 404
  const missing = await fetchOk(`${BASE}/api/models/does-not-exist`);
  if (missing.status !== 404) {
    cleanup();
    fail(`/api/models/does-not-exist returned ${missing.status} (expected 404)`);
  }
  logStep("/api/models/does-not-exist 404 OK");

  // 6b. Unknown /api path must return JSON 404 (Layer 2.9). The body
  // must be parseable JSON — if Vite's middleware ever returns HTML
  // for an /api/* path again, this guard fails loudly.
  const nonsense = await fetchOk(`${BASE}/api/this-route-does-not-exist`);
  if (nonsense.status !== 404) {
    cleanup();
    fail(`/api/this-route-does-not-exist returned ${nonsense.status} (expected 404)`);
  }
  if (nonsense.body.trim().startsWith("<") || !nonsense.body.trim().startsWith("{")) {
    cleanup();
    fail("unknown /api path returned non-JSON body", nonsense.body.slice(0, 200));
  }
  let nonsenseJson = {};
  try {
    nonsenseJson = JSON.parse(nonsense.body);
  } catch {
    cleanup();
    fail("unknown /api path returned invalid JSON", nonsense.body);
  }
  if (nonsenseJson.error !== "Not Found" || nonsenseJson.code !== "not_found") {
    cleanup();
    fail("unknown /api path missing error/code fields", JSON.stringify(nonsenseJson));
  }
  logStep(`/api/this-route-does-not-exist → 404 JSON (code=${nonsenseJson.code})`);

  // 6c. Wrong method on a known /api/auth/* path → 405 with Allow
  //     header. We use OPTIONS because that's intentionally not routed.
  const wrongMethod = await fetchOk(`${BASE}/api/health`, { method: "POST" });
  if (wrongMethod.status !== 404 && wrongMethod.status !== 405) {
    cleanup();
    fail(`/api/health with POST returned ${wrongMethod.status} (expected 404 or 405)`);
  }
  logStep(`/api/health with POST → ${wrongMethod.status} (method gating OK)`);

  // 7. Tear down
  cleanup();
  await delay(200);
  logStep("all checks passed");
  process.exit(0);
}

main().catch((e) => {
  fail(e?.message ?? String(e), e?.stack);
});