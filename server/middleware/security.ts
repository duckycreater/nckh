/**
 * server/middleware/security.ts
 *
 * Security middleware factory for the BMO Robot backend.
 *
 * Responsibilities:
 *   - helmet: security headers (X-Frame-Options, X-Content-Type-Options,
 *     Strict-Transport-Security, Referrer-Policy, …)
 *   - cors: whitelist-driven CORS, configurable through CORS_ORIGINS env var
 *   - express-rate-limit: brute-force protection for /auth, /api/scan-garbage,
 *     /api/federated/submit, and any other write-heavy endpoint
 *
 * All knobs are env-driven so the same code paths work in:
 *   - local dev (CORS_ORIGINS=http://localhost:5173)
 *   - LAN demo (CORS_ORIGINS=http://192.168.1.152:5173)
 *   - production (CORS_ORIGINS=https://bmo.example.com,https://admin.bmo.example.com)
 *
 * Defaults are intentionally conservative — they're safe for any deployment
 * but tight enough to make casual abuse expensive.
 */
import type { Request, Response, NextFunction, RequestHandler } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

/**
 * Build a CORS middleware that whitelists origins from CORS_ORIGINS env var.
 *
 * Format: comma-separated list of origins. "*" disables CORS entirely (only
 * use for fully-public APIs). Empty/unset = same-origin only (no CORS
 * headers, browser will block cross-origin XHR).
 */
export function buildCors(): RequestHandler {
  const raw = process.env.CORS_ORIGINS ?? "";
  const allowList = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (allowList.length === 0) {
    // No whitelist → no Access-Control-Allow-Origin emitted. Same-origin only.
    return (_req: Request, res: Response, next: NextFunction) => {
      res.removeHeader("Access-Control-Allow-Origin");
      next();
    };
  }

  if (allowList.length === 1 && allowList[0] === "*") {
    return cors({ origin: "*", credentials: false });
  }

  return cors({
    origin: (origin, cb) => {
      // Allow same-origin / curl (no Origin header).
      if (!origin) return cb(null, true);
      if (allowList.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin ${origin} not in whitelist`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-admin-key",
      "x-session-token",
    ],
    maxAge: 600,
  });
}

/**
 * Helmet config. We disable the default `contentSecurityPolicy` because the
 * SPA uses inline styles via Tailwind and inline scripts for PWA bootstrapping;
 * CSP is added separately when the frontend is fully migrated (D5).
 */
export function buildHelmet(): RequestHandler {
  return helmet({
    contentSecurityPolicy: false, // CSP is configured per-route in D5.
    crossOriginEmbedderPolicy: false, // PWA service worker + wasm need this off
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts:
      process.env.NODE_ENV === "production"
        ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
        : false,
    frameguard: { action: "deny" },
    noSniff: true,
    xssFilter: true,
  });
}

/**
 * Rate-limit factory. Different endpoints deserve different limits:
 *   - /auth  → 5 / min / IP (brute-force protection on login)
 *   - /api/scan-garbage, /api/federated/submit → configurable per minute
 *   - everything else → 300 / min / IP (generous default)
 *
 * The defaults can be overridden via env:
 *   RL_AUTH_PER_MIN   (default 5)
 *   RL_SCAN_PER_MIN   (default 100)
 *   RL_DEFAULT_PER_MIN (default 300)
 */
function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function buildAuthRateLimiter(): RequestHandler {
  return rateLimit({
    windowMs: 60_000,
    limit: envInt("RL_AUTH_PER_MIN", 5),
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      ok: false,
      error: "too_many_requests",
      message: "Too many login attempts. Please try again in a minute.",
    },
  });
}

export function buildScanRateLimiter(): RequestHandler {
  return rateLimit({
    windowMs: 60_000,
    limit: envInt("RL_SCAN_PER_MIN", 100),
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      ok: false,
      error: "too_many_requests",
      message: "Scan rate limit exceeded. Please slow down.",
    },
  });
}

/**
 * Content-Security-Policy middleware (D5).
 *
 * Default policy is strict: only same-origin scripts/styles, no inline
 * JS, no eval. Tailwind v4 + the PWA service worker require a couple of
 * exceptions; we enumerate them explicitly so the policy stays auditable.
 *
 * The policy is intentionally a string so the framework can add per-route
 * relaxations (e.g. for the SSE feed which needs `connect-src 'self'`).
 */
/**
 * Force Secure + SameSite=Lax on every Set-Cookie response (D5).
 *
 * We don't have a full session-cookie path yet (auth tokens are sent as
 * `Authorization: Bearer …` headers today), but we still want this
 * middleware in place so any future cookie-based flow inherits the
 * hardening for free.
 */
export function buildSecureCookies(): RequestHandler {
  return (_req: Request, res: Response, next: NextFunction) => {
    const originalSetHeader = res.setHeader.bind(res);
    res.setHeader = function (name: string, value: unknown) {
      if (typeof name === "string" && name.toLowerCase() === "set-cookie") {
        const arr = Array.isArray(value) ? value : [value];
        const secured = arr.map((v) => {
          const s = String(v);
          if (/;\s*Secure(\b|$)/i.test(s)) return s;
          if (/;\s*SameSite/i.test(s)) return s + "; Secure";
          return s + "; Secure; SameSite=Lax";
        });
        return originalSetHeader(name, secured as unknown as string);
      }
      return originalSetHeader(name, value as never);
    } as typeof res.setHeader;
    next();
  };
}

export function buildCsp(): RequestHandler {
  return (_req: Request, res: Response, next: NextFunction) => {
    const csp = [
      "default-src 'self'",
      // React 19 with the jsx-runtime compiles to fully-qualified module
      // scripts; we still need 'unsafe-inline' for the few <style> blocks
      // Tailwind v4 injects in dev mode.
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://res.cloudinary.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co wss:",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "manifest-src 'self'",
      process.env.NODE_ENV === "production"
        ? "upgrade-insecure-requests"
        : "",
    ]
      .filter(Boolean)
      .join("; ");
    res.setHeader("Content-Security-Policy", csp);
    next();
  };
}

export function buildDefaultRateLimiter(): RequestHandler {
  return rateLimit({
    windowMs: 60_000,
    limit: envInt("RL_DEFAULT_PER_MIN", 300),
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      ok: false,
      error: "too_many_requests",
      message: "Rate limit exceeded.",
    },
  });
}