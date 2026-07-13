/**
 * errorMessages.ts — Locale-aware error message lookup for the API layer.
 *
 * Phase 3 of the i18n plan. Replaces hard-coded Vietnamese strings sprinkled
 * through `server/bootstrap.ts` with stable keys that resolve to the user's
 * locale via `req.locale?.locale`.
 *
 * Lookup order:
 *   1. locale/{locale}.json
 *   2. locale/en.json (universal English fallback)
 *   3. raw key (last-ditch — should never happen in practice)
 *
 * Adding a new key:
 *   - Add to all 10 server locale files (vi/en/zh/es/fr/ja/ko/id/ar/pt).
 *   - Add to `ErrorKey` union below so TS will flag missing entries.
 *   - Use `getErrorMessage("CLAN_FULL", req.locale?.locale)` from routes.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type LocaleCode =
  | "vi" | "en" | "zh" | "es" | "fr" | "ja" | "ko" | "id" | "ar" | "pt";

export const SERVER_SUPPORTED_LOCALES: readonly LocaleCode[] = [
  "vi", "en", "zh", "es", "fr", "ja", "ko", "id", "ar", "pt",
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.resolve(__dirname, "..", "locales");

const cache = new Map<LocaleCode, Record<string, unknown>>();

function loadLocale(code: LocaleCode): Record<string, unknown> {
  if (cache.has(code)) return cache.get(code)!;
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