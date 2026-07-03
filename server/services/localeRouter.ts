/**
 * localeRouter - Locale detection + cultural adaptation
 *
 * Phase 3 deliverable: BMO responds in the user's language with culturally
 * appropriate phrasing. Detection cascades:
 *
 *   1. Explicit user preference (localStorage `bmo_locale` or auth profile)
 *   2. Accept-Language header (RFC 4647)
 *   3. GeoIP (via Cloudflare/Vercel `x-vercel-ip-country` header → default)
 *   4. Fallback: "vi" (Vietnam default)
 *
 * Cultural adaptations (sample):
 *   - ar (Arabic): avoid the word "robot" — use "BMO" directly
 *   - sw (Swahili): emphasize community/county-level impact
 *   - es (Spanish): use "tú" instead of "vosotros" for Latin America
 */

export type LocaleCode =
  | "vi" | "en" | "es" | "fr" | "zh" | "hi" | "ar" | "sw"
  | "lo" | "km" | "id" | "ja" | "ko" | "ru" | "pt" | "de"
  | "it" | "th" | "tl";

export const SUPPORTED_LOCALES: LocaleCode[] = [
  "vi", "en", "es", "fr", "zh", "hi", "ar", "sw",
  "lo", "km", "id", "ja", "ko", "ru", "pt", "de", "it", "th", "tl",
];

const LOCALE_NAMES: Record<LocaleCode, string> = {
  vi: "Tiếng Việt", en: "English", es: "Español", fr: "Français",
  zh: "中文", hi: "हिन्दी", ar: "العربية", sw: "Kiswahili",
  lo: "ລາວ", km: "ខ្មែរ", id: "Bahasa Indonesia",
  ja: "日本語", ko: "한국어", ru: "Русский", pt: "Português",
  de: "Deutsch", it: "Italiano", th: "ไทย", tl: "Filipino",
};

export { LOCALE_NAMES };

const LOCALE_FLAGS: Record<LocaleCode, string> = {
  vi: "🇻🇳", en: "🇬🇧", es: "🇪🇸", fr: "🇫🇷",
  zh: "🇨🇳", hi: "🇮🇳", ar: "🇸🇦", sw: "🇰🇪",
  lo: "🇱🇦", km: "🇰🇭", id: "🇮🇩",
  ja: "🇯🇵", ko: "🇰🇷", ru: "🇷🇺", pt: "🇵🇹",
  de: "🇩🇪", it: "🇮🇹", th: "🇹🇭", tl: "🇵🇭",
};

export { LOCALE_FLAGS };

/** Country ISO → default locale (for GeoIP fallback). */
const COUNTRY_TO_LOCALE: Record<string, LocaleCode> = {
  VN: "vi", US: "en", GB: "en", AU: "en", CA: "en",
  ES: "es", MX: "es", AR: "es", CO: "es",
  FR: "fr", BE: "fr",
  CN: "zh", TW: "zh", HK: "zh",
  IN: "hi",
  SA: "ar", AE: "ar", EG: "ar",
  KE: "sw", TZ: "sw",
  LA: "lo",
  KH: "km",
  ID: "id",
  JP: "ja",
  KR: "ko",
  RU: "ru",
  PT: "pt", BR: "pt",
  DE: "de", AT: "de",
  IT: "it",
  TH: "th",
  PH: "tl",
};

export interface LocaleContext {
  locale: LocaleCode;
  languageName: string;
  flag: string;
  bcp47: string;
  source: "preference" | "header" | "geo" | "fallback";
}

/**
 * BCP-47 conversion for TTS/STT providers.
 */
export function toBCP47(locale: LocaleCode): string {
  const map: Record<LocaleCode, string> = {
    vi: "vi-VN", en: "en-US", es: "es-ES", fr: "fr-FR",
    zh: "cmn-CN", hi: "hi-IN", ar: "ar-SA", sw: "sw-KE",
    lo: "lo-LA", km: "km-KH", id: "id-ID",
    ja: "ja-JP", ko: "ko-KR", ru: "ru-RU", pt: "pt-BR",
    de: "de-DE", it: "it-IT", th: "th-TH", tl: "fil-PH",
  };
  return map[locale] || "en-US";
}

/**
 * Resolve locale from any combination of: preference, header, country.
 */
export function resolveLocale(opts: {
  preference?: string | null;
  acceptLanguage?: string | null;
  country?: string | null;
}): LocaleContext {
  const fallback: LocaleContext = {
    locale: "vi",
    languageName: LOCALE_NAMES.vi,
    flag: LOCALE_FLAGS.vi,
    bcp47: toBCP47("vi"),
    source: "fallback",
  };

  // 1) explicit preference
  if (opts.preference && SUPPORTED_LOCALES.includes(opts.preference as LocaleCode)) {
    const loc = opts.preference as LocaleCode;
    return {
      locale: loc, languageName: LOCALE_NAMES[loc], flag: LOCALE_FLAGS[loc],
      bcp47: toBCP47(loc), source: "preference",
    };
  }

  // 2) Accept-Language header
  if (opts.acceptLanguage) {
    const parsed = parseAcceptLanguage(opts.acceptLanguage);
    for (const tag of parsed) {
      const code = tag.split("-")[0].toLowerCase();
      if (SUPPORTED_LOCALES.includes(code as LocaleCode)) {
        const loc = code as LocaleCode;
        return {
          locale: loc, languageName: LOCALE_NAMES[loc], flag: LOCALE_FLAGS[loc],
          bcp47: toBCP47(loc), source: "header",
        };
      }
    }
  }

  // 3) country
  if (opts.country && COUNTRY_TO_LOCALE[opts.country.toUpperCase()]) {
    const loc = COUNTRY_TO_LOCALE[opts.country.toUpperCase()];
    return {
      locale: loc, languageName: LOCALE_NAMES[loc], flag: LOCALE_FLAGS[loc],
      bcp47: toBCP47(loc), source: "geo",
    };
  }

  return fallback;
}

function parseAcceptLanguage(header: string): string[] {
  return header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";");
      const quality = q?.includes("q=") ? parseFloat(q.split("=")[1]) : 1.0;
      return { tag: tag.trim(), q: isNaN(quality) ? 1 : quality };
    })
    .sort((a, b) => b.q - a.q)
    .map((entry) => entry.tag)
    .filter(Boolean);
}

/**
 * Build the system prompt injection for a given locale.
 * Adds cultural adaptation hints for the underlying LLM.
 */
export function buildLocaleSystemPrompt(locale: LocaleCode): string {
  const base = `[User locale: ${LOCALE_NAMES[locale]} (${locale}). Respond in this language unless asked otherwise.]`;
  const cultural: Partial<Record<LocaleCode, string>> = {
    ar: "Do NOT use the word 'robot' — refer to the assistant as 'BMO'. Use respectful, family-friendly language.",
    sw: "Emphasize community impact and county-level statistics. Use 'BMO' and 'jamii' (community).",
    es: "Use Latin American Spanish (use 'tú' instead of 'vosotros').",
    hi: "Use respectful Hindi with आप (formal you). Avoid English code-mixing unless asked.",
    zh: "Use Simplified Chinese. Be concise and warm.",
    vi: "Thân thiện, ngắn gọn, dùng 'bạn' (informal friendly). Tránh tiếng Anh nếu không cần thiết.",
  };
  return base + " " + (cultural[locale] || "");
}

/**
 * Express middleware: attaches req.locale to incoming requests.
 * Uses Accept-Language + Cloudflare/Vercel country header.
 */
export function localeMiddleware(req: any, res: any, next: () => void) {
  const country =
    req.headers["x-vercel-ip-country"] ||
    req.headers["cf-ipcountry"] ||
    req.headers["x-country"] ||
    null;
  const acceptLanguage = req.headers["accept-language"] || null;
  req.locale = resolveLocale({
    preference: req.headers["x-bmo-locale"] || null,
    acceptLanguage,
    country: country as string | null,
  });
  next();
}