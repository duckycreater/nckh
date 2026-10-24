/**
 * health.ts — Liveness + dependency probe.
 *
 * GET /api/health
 *
 * Returns 200 if the process is alive and the critical services
 * are reachable; 503 if any required component is degraded. Used
 * by `scripts/smoke.sh` and by uptime monitors (Render / Railway /
 * Docker healthcheck).
 *
 * The endpoint is intentionally cheap: no DB roundtrip unless the
 * DB is already known-healthy, no federation roundtrip, no cloud
 * calls. Components we surface:
 *   - db               : research Postgres connection (Supabase / pg)
 *   - federated        : in-memory federated aggregator lastHeartbeat
 *   - fl_server_python : optional Python FL server (VITE_FL_URL)
 *
 * The response is JSON-safe for any client; it never throws.
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { getDb, getFirestore, isDbConnected } from "../db.js";
import { federatedAggregator } from "../services/federatedAggregator.js";

interface HealthPayload {
  ok: boolean;
  uptime: number;
  now: number;
  version: string;
  components: {
    db: ComponentStatus;
    primary_store: ComponentStatus;
    federated: ComponentStatus;
    fl_server_python: ComponentStatus;
  };
  warnings: string[];
}

interface ComponentStatus {
  ok: boolean;
  detail: string;
  latency_ms?: number;
}

const START = Date.now();
const VERSION = process.env.BMO_VERSION || "0.1.0";

async function probePrimaryStore(): Promise<ComponentStatus> {
  const startedAt = Date.now();
  const firestore = getFirestore();
  if (!firestore) {
    const localStoreAllowed =
      process.env.NODE_ENV !== "production" || Boolean(process.env.BMO_DATA_FILE?.trim());
    return {
      ok: localStoreAllowed,
      detail: localStoreAllowed
        ? "local test/development store"
        : "Firestore is required in production",
      latency_ms: Date.now() - startedAt,
    };
  }
  try {
    await Promise.race([
      firestore.collection("system_migrations").doc("readiness").get(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Firestore readiness timeout")), 2_000),
      ),
    ]);
    return { ok: true, detail: "Firestore reachable", latency_ms: Date.now() - startedAt };
  } catch (error) {
    return {
      ok: false,
      detail: `Firestore error: ${(error as Error).message || "unknown"}`,
      latency_ms: Date.now() - startedAt,
    };
  }
}

async function probeDb(): Promise<ComponentStatus> {
  const t0 = Date.now();
  try {
    const db = getDb();
    if (!db) {
      const configured = Boolean(
        process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
      );
      if (process.env.RESEARCH_DB_ENABLED === "false" || !configured) {
        return {
          ok: true,
          detail: "optional research database disabled",
          latency_ms: Date.now() - t0,
        };
      }
      return {
        ok: false,
        detail: "configured research database not initialised",
        latency_ms: Date.now() - t0,
      };
    }
    if (!isDbConnected()) {
      return {
        ok: false,
        detail: "DB module exists but connection not established",
        latency_ms: Date.now() - t0,
      };
    }
    // Cheap ping — research_users is always present after schema migration.
    await db.query("SELECT 1 AS ping");
    return { ok: true, detail: "Postgres reachable", latency_ms: Date.now() - t0 };
  } catch (err) {
    return {
      ok: false,
      detail: `DB error: ${(err as Error).message ?? "unknown"}`,
      latency_ms: Date.now() - t0,
    };
  }
}

function probeFederated(): ComponentStatus {
  // The aggregator maintains its own last-round timestamp via
  // `getStats().latestVersion.createdAt`; we treat "fresh within
  // 5 minutes" as healthy. When no round has happened yet (cold
  // start) we still report ok=true — the service is alive, just idle.
  try {
    const stats = federatedAggregator.getStats();
    if (!stats.latestVersion) {
      return { ok: true, detail: "no rounds yet (cold start)" };
    }
    const age = Date.now() - stats.latestVersion.createdAt;
    return {
      ok: age < 5 * 60 * 1000,
      detail: `latestVersion=${stats.latestVersion.version} age=${age}ms`,
    };
  } catch (err) {
    return { ok: false, detail: `aggregator error: ${(err as Error).message ?? "unknown"}` };
  }
}

async function probeFlServer(): Promise<ComponentStatus> {
  const url = process.env.VITE_FL_URL;
  if (!url) return { ok: true, detail: "VITE_FL_URL not configured (optional)" };
  const t0 = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2000);
    const r = await fetch(`${url.replace(/\/$/, "")}/health`, { signal: ctrl.signal });
    clearTimeout(timer);
    return {
      ok: r.ok,
      detail: `${url} → ${r.status}`,
      latency_ms: Date.now() - t0,
    };
  } catch (err) {
    return {
      ok: false,
      detail: `${url} unreachable: ${(err as Error).message ?? "unknown"}`,
      latency_ms: Date.now() - t0,
    };
  }
}

export function healthRouter(): Router {
  const router = Router();

  router.get("/live", (_req, res) => {
    res.json({ ok: true, uptime: Date.now() - START, now: Date.now(), version: VERSION });
  });

  const readiness = async (_req: Request, res: Response) => {
    const [primaryStore, db, fl] = await Promise.all([
      probePrimaryStore(),
      probeDb(),
      probeFlServer(),
    ]);
    const fed = probeFederated();
    const components = { primary_store: primaryStore, db, federated: fed, fl_server_python: fl };
    // Research, federation and the optional Python service can degrade while
    // authentication, points, scans and rewards remain usable.
    const ok = primaryStore.ok;
    const warnings: string[] = [];
    if (!primaryStore.ok) warnings.push("primary Firestore unavailable");
    if (!db.ok) warnings.push("research DB unavailable");
    if (!fl.ok) warnings.push("Python FL server unreachable");
    if (!fed.ok) warnings.push("federated aggregator heartbeat stale");

    const payload: HealthPayload = {
      ok,
      uptime: Date.now() - START,
      now: Date.now(),
      version: VERSION,
      components,
      warnings,
    };
    res.status(ok ? 200 : 503).json(payload);
  };

  router.get("/ready", readiness);
  router.get("/", readiness);

  return router;
}
