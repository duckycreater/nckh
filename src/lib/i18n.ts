/**
 * i18n bootstrap — singleton i18next instance + React binding.
 *
 * Locale packs: vi, en, zh, es, fr, ja, ko, id (8 packs).
 *  - Persistent storage key: `bmo_language` (legacy `ecoquest_language`
 *    is read once at boot for backward compatibility and migrated).
 *  - Direction (LTR/RTL) is derived in `src/lib/format.ts` and applied to
 *    `<html dir>` from `i18n.on('languageChanged')` in `main.tsx`.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import vi from "../locales/vi.json";
import en from "../locales/en.json";
import zh from "../locales/zh.json";
import es from "../locales/es.json";
import fr from "../locales/fr.json";
import ja from "../locales/ja.json";
import ko from "../locales/ko.json";
import id from "../locales/id.json";

/** Persistent storage key. Migrate from legacy `ecoquest_language`. */
const STORAGE_KEY = "bmo_language";
const LEGACY_KEY = "ecoquest_language";

export const LANGUAGES = [
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳", dir: "ltr" as const },
  { code: "en", label: "English", flag: "🇬🇧", dir: "ltr" as const },
  { code: "zh", label: "中文", flag: "🇨🇳", dir: "ltr" as const },
  { code: "es", label: "Español", flag: "🇪🇸", dir: "ltr" as const },
  { code: "fr", label: "Français", flag: "🇫🇷", dir: "ltr" as const },
  { code: "ja", label: "日本語", flag: "🇯🇵", dir: "ltr" as const },
  { code: "ko", label: "한국어", flag: "🇰🇷", dir: "ltr" as const },
  { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩", dir: "ltr" as const },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const SUPPORTED_LANGUAGE_CODES: readonly LanguageCode[] = LANGUAGES.map(
  (l) => l.code,
);

function migrateLegacyKey() {
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy && !localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, legacy);
    }
    // Optionally clean up
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* localStorage unavailable (private mode etc.) */
  }
}

function getInitialLanguage(): LanguageCode {
  try {
    migrateLegacyKey();
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(stored)) {
      return stored as LanguageCode;
    }
  } catch {}
  return "vi";
}

if (!i18n.isInitialized) {
  // For the newer locale packs (es/fr/ja/ko/id) we deliberately ship a
  // partial JSON. i18next will fallback per-key to "en" for any missing
  // translation, which keeps the bundle lean and lets translators fill in
  // namespaces incrementally without breaking the UI.
  i18n.use(initReactI18next).init({
    resources: {
      vi: { translation: vi },
      en: { translation: en },
      zh: { translation: zh },
      es: { translation: es },
      fr: { translation: fr },
      ja: { translation: ja },
      ko: { translation: ko },
      id: { translation: id },
    },
    lng: getInitialLanguage(),
    fallbackLng: ["en", "vi"],
    supportedLngs: [...SUPPORTED_LANGUAGE_CODES, "en"],
    interpolation: {
      escapeValue: false,
      prefix: "{",
      suffix: "}",
    },
    react: {
      useSuspense: false,
    },
    returnNull: false,
    saveMissing: false,
    // Silence "key not found" warnings in dev for the partial locale packs.
    // Production builds still ship the keys, so the only visible effect is
    // a more focused dev console.
    partialBundledLanguages: true,
  });
}

/** Change UI language and persist. Notifies subscribers (LanguageSwitcher). */
export function changeLanguage(code: LanguageCode) {
  i18n.changeLanguage(code);
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {}
  // Update <html dir> attribute synchronously so the next paint is RTL-correct.
  if (typeof document !== "undefined") {
    const rtlCodes = new Set(["ar", "he", "fa", "ur", "yi"]);
    document.documentElement.setAttribute("dir", rtlCodes.has(code) ? "rtl" : "ltr");
  }
  // Notify listeners outside React (e.g. main.tsx sets <html dir>).
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("bmo:languageChanged", { detail: code }));
  }
}

export function getCurrentLanguage(): LanguageCode {
  return (i18n.language as LanguageCode) || "vi";
}

/** Subscribe to language changes outside React. */
export function onLanguageChanged(handler: (code: LanguageCode) => void) {
  i18n.on("languageChanged", (lng) => handler(lng as LanguageCode));
  return () => i18n.off("languageChanged", handler);
}

export default i18n;