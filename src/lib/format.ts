/**
 * src/lib/format.ts — Locale-aware number / date / currency formatters.
 *
 * Built on `Intl.*` so behavior is consistent with the user's browser locale
 * and matches the locale selected in i18n.
 *
 * Usage:
 *   import { formatNumber, formatCurrency, formatDate, formatRelative, isRTL } from "@/lib/format";
 *   formatNumber(12345.6, "vi") // "12.345,6"
 *   formatCurrency(50, "VND", "vi") // "50 ₫"
 *   formatDate(new Date(), "vi", "short") // "12/07/2026"
 *   isRTL("ar") // true
 */
import type { LanguageCode } from "./i18n";

const RTL_LANGS = new Set(["ar", "he", "fa", "ur", "yi"]);

export function isRTL(locale: string | LanguageCode | null | undefined): boolean {
  if (!locale) return false;
  return RTL_LANGS.has(String(locale).toLowerCase().split("-")[0]);
}

/**
 * Format a number with locale grouping and decimal separators.
 * Returns a string (or the value as-is when given a non-number input).
 */
export function formatNumber(
  value: number | string,
  locale: string | LanguageCode = "vi",
  options?: Intl.NumberFormatOptions,
): string {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return String(value);
  return new Intl.NumberFormat(toBCP47(locale), options).format(num);
}

/**
 * Format a currency amount. Defaults to no currency symbol when `currency`
 * is omitted — useful for "points" / virtual currencies that just need
 * grouping (e.g. "1,234").
 */
export function formatCurrency(
  value: number,
  locale: string | LanguageCode = "vi",
  currency?: string,
  options?: Omit<Intl.NumberFormatOptions, "style" | "currency">,
): string {
  const opts: Intl.NumberFormatOptions = {
    ...options,
    style: currency ? "currency" : "decimal",
  };
  if (currency) opts.currency = currency;
  return new Intl.NumberFormat(toBCP47(locale), opts).format(value);
}

/**
 * Format a date in one of three presets:
 *   "short"   → 12/07/2026
 *   "medium"  → 12 Jul 2026
 *   "long"    → 12 July 2026
 *   "full"    → Sunday, 12 July 2026
 * Or pass custom Intl.DateTimeFormatOptions.
 */
export function formatDate(
  date: Date | number | string,
  locale: string | LanguageCode = "vi",
  style: "short" | "medium" | "long" | "full" | Intl.DateTimeFormatOptions = "medium",
): string {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return String(date);
  const presets: Record<string, Intl.DateTimeFormatOptions> = {
    short: { day: "2-digit", month: "2-digit", year: "numeric" },
    medium: { day: "numeric", month: "short", year: "numeric" },
    long: { day: "numeric", month: "long", year: "numeric" },
    full: { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  };
  const opts = typeof style === "string" ? presets[style] ?? presets.medium : style;
  return new Intl.DateTimeFormat(toBCP47(locale), opts).format(d);
}

/**
 * Relative time ("yesterday", "hôm qua", "昨日") with locale-correct
 * relative units. Uses Intl.RelativeTimeFormat under the hood.
 */
export function formatRelative(
  date: Date | number,
  locale: string | LanguageCode = "vi",
  now: Date = new Date(),
): string {
  const target = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(target.getTime())) return String(date);
  const diffMs = target.getTime() - now.getTime();
  const rtf = new Intl.RelativeTimeFormat(toBCP47(locale), { numeric: "auto" });
  const abs = Math.abs(diffMs);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 1000 * 60 * 60 * 24 * 365],
    ["month", 1000 * 60 * 60 * 24 * 30],
    ["day", 1000 * 60 * 60 * 24],
    ["hour", 1000 * 60 * 60],
    ["minute", 1000 * 60],
    ["second", 1000],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms || unit === "second") {
      return rtf.format(Math.round(diffMs / ms), unit);
    }
  }
  return rtf.format(0, "second");
}

/** Internal helper: keep formatting consistent with `localeRouter.toBCP47`. */
export function toBCP47(locale: string): string {
  const m: Record<string, string> = {
    vi: "vi-VN",
    en: "en-US",
    es: "es-ES",
    fr: "fr-FR",
    zh: "zh-CN",
    ja: "ja-JP",
    ko: "ko-KR",
    id: "id-ID",
  };
  return m[String(locale).toLowerCase().split("-")[0]] ?? locale;
}

/**
 * Apply `<html dir>` based on locale. Call once at boot and on every
 * `languageChanged` event.
 */
export function applyDocumentDirection(locale: string | LanguageCode) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("dir", isRTL(locale) ? "rtl" : "ltr");
}