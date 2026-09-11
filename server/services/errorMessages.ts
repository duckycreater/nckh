/**
 * errorMessages.ts — Locale-aware error message lookup for the API layer.
 *
 * Phase 3 of the i18n plan. Replaces hard-coded Vietnamese strings sprinkled
 * through `server/bootstrap.ts` with stable keys that resolve to the user's
 * locale via `req.locale?.locale`.
 *
 * Lookup order:
 *   1. server/locales/{locale}.json (read at runtime via fs.readFileSync,
 *      survives both `tsx server.ts` and `node dist/server.cjs`)
 *   2. en.json (universal English fallback)
 *   3. raw key (last-ditch — should never happen in practice)
 *
 * Adding a new key:
 *   - Add to all 10 server locale files (vi/en/zh/es/fr/ja/ko/id/ar/pt).
 *   - Use `getErrorMessage("error.clan.full", req.locale?.locale)` from routes.
 *
 * The JSON files are read off disk so the bundled CJS output does NOT need
 * any `import.meta` support (which esbuild CJS can't preserve) and the
 * list of supported locales can be added to without re-bundling the JS.
 */
import fs from "node:fs";
import path from "node:path";

export type LocaleCode = "vi" | "en" | "zh" | "es" | "fr" | "ja" | "ko" | "id" | "ar" | "pt";

export const SERVER_SUPPORTED_LOCALES: readonly LocaleCode[] = [
  "vi",
  "en",
  "zh",
  "es",
  "fr",
  "ja",
  "ko",
  "id",
  "ar",
  "pt",
];

/**
 * Locate the directory of the current module, whether we're loaded as:
 *   - Dev  (`tsx server.ts`, ESM)
 *   - Prod (`node dist/server.cjs`, CJS — esbuild injects `__dirname`)
 *
 * Strategy: `require.resolve` of a sentinel JSON file that's physically
 * next to this module. The resolved path lands inside the `server/`
 * directory in both modes regardless of `process.cwd()` and without
 * any `import.meta` magic.
 */
function moduleDir(): string {
  // `require.resolve` is unavailable in the native ESM dev server.  Both the
  // tsx entrypoint and the bundled production entrypoint run from the project
  // root, so an explicit environment override plus cwd-relative fallback is
  // deterministic in both modes.
  return process.env.BMO_LOCALES_DIR || path.join(process.cwd(), "server", "locales");
}

const LOCALES_DIR = moduleDir();

const cache = new Map<LocaleCode, Record<string, unknown>>();

function loadLocale(code: LocaleCode): Record<string, unknown> {
  const hit = cache.get(code);
  if (hit) return hit;
  const file = path.join(LOCALES_DIR, `${code}.json`);
  try {
    const raw = fs.readFileSync(file, "utf8");
    const data = JSON.parse(raw) as Record<string, unknown>;
    cache.set(code, data);
    return data;
  } catch {
    return {};
  }
}

function resolveKey(obj: Record<string, unknown>, dotted: string): string | null {
  const parts = dotted.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return null;
    }
  }
  return typeof cur === "string" ? cur : null;
}

/**
 * Get a localized error message for a given dotted key.
 *
 * @param key   Dotted key (e.g. "error.clan.full").
 * @param locale Locale code from `req.locale?.locale`; falls back to "en".
 */
export function getErrorMessage(key: string, locale?: string | null): string {
  const normalized = (locale || "en").toLowerCase().split("-")[0] as LocaleCode;
  const loc = (SERVER_SUPPORTED_LOCALES as readonly string[]).includes(normalized)
    ? (normalized as LocaleCode)
    : "en";

  // 1) Try the requested locale
  const direct = resolveKey(loadLocale(loc), key);
  if (direct) return direct;
  // 2) Fall back to English (universal)
  if (loc !== "en") {
    const en = resolveKey(loadLocale("en"), key);
    if (en) return en;
  }
  // 3) Last-ditch: return the key so the developer sees the missing entry.
  return key;
}

/**
 * Send a localized JSON error response. Convenience wrapper for the common
 * pattern `res.status(4xx).json({ error: getErrorMessage(...) })`.
 */
export function localizedError(
  res: { status: (code: number) => { json: (body: unknown) => unknown } },
  status: number,
  key: string,
  locale?: string | null,
): unknown {
  return res.status(status).json({ error: getErrorMessage(key, locale) });
}

/**
 * Helper to attach the resolved locale to an Express request from any of
 * the supported upstream sources. Safe to call with an existing locale.
 */
export function localeOf(req: { locale?: { locale?: string } } | null | undefined): string | null {
  return req?.locale?.locale ?? null;
}

/** Short alias: `err("error.notFound", req, res)` */
export function err(
  res: { status: (code: number) => { json: (body: unknown) => unknown } },
  status: number,
  key: string,
  req?: { locale?: { locale?: string } } | null,
): unknown {
  return localizedError(res, status, key, localeOf(req ?? null));
}
