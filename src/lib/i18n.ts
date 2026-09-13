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

export const SUPPORTED_LANGUAGE_CODES: readonly LanguageCode[] = LANGUAGES.map((l) => l.code);

type LocaleMessages = Record<string, unknown>;
const localeLoaders: Partial<Record<LanguageCode, () => Promise<LocaleMessages>>> = {
  zh: () => import("../locales/zh.json").then((module) => module.default as LocaleMessages),
  es: () => import("../locales/es.json").then((module) => module.default as LocaleMessages),
  fr: () => import("../locales/fr.json").then((module) => module.default as LocaleMessages),
  ja: () => import("../locales/ja.json").then((module) => module.default as LocaleMessages),
  ko: () => import("../locales/ko.json").then((module) => module.default as LocaleMessages),
  id: () => import("../locales/id.json").then((module) => module.default as LocaleMessages),
};
const loadedLanguages = new Set<LanguageCode>(["vi", "en"]);

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
  } catch {
    // localStorage may be unavailable in private browsing or SSR.
  }
  return "vi";
}

function humanizeMissingKey(key: string): string {
  const leaf = key.split(".").at(-1) || key;
  const words = leaf
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Nội dung";
}

const initialLanguage = getInitialLanguage();

if (!i18n.isInitialized) {
  // For the newer locale packs (es/fr/ja/ko/id) we deliberately ship a
  // partial JSON. i18next will fallback per-key to "en" for any missing
  // translation, which keeps the bundle lean and lets translators fill in
  // namespaces incrementally without breaking the UI.
  i18n.use(initReactI18next).init({
    resources: {
      vi: { translation: vi },
      en: { translation: en },
    },
    // The two canonical locales are bundled for an immediate first paint.
    // Other packs are fetched only when selected, saving roughly 270 KB of
    // translation JSON on the common Vietnamese/English startup path.
    lng: loadedLanguages.has(initialLanguage) ? initialLanguage : "en",
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
    // Last-resort protection for dynamic keys that static coverage cannot
    // enumerate. Never expose implementation paths such as `feature.fooBar`
    // to users, even if a future locale entry is accidentally omitted.
    parseMissingKeyHandler: humanizeMissingKey,
    // Silence "key not found" warnings in dev for the partial locale packs.
    // Production builds still ship the keys, so the only visible effect is
    // a more focused dev console.
    partialBundledLanguages: true,
  });
}

/**
 * Per-locale map of <title> + <meta name=description>. Layer 1.4 — we
 * deliberately ship one string per locale here rather than calling
 * `t("meta.title")` because the meta tags are visible to the browser
 * before i18next has hydrated and we want the right title to render on
 * the very first paint.
 */
const META: Record<string, { title: string; description: string }> = {
  vi: {
    title: "BMO Robot — Phân loại rác thông minh",
    description:
      "BMO Robot là nền tảng phân loại rác thông minh với AI on-device, federated learning và bảo vệ quyền riêng tư.",
  },
  en: {
    title: "BMO Robot — Smart Waste Sorting",
    description:
      "BMO Robot — smart Vietnamese-waste sorting PWA with on-device AI, federated learning, and differential-privacy analytics.",
  },
  zh: {
    title: "BMO Robot — 智能垃圾分类",
    description: "BMO Robot 是一款智能垃圾分类 PWA,内置端侧 AI、联邦学习和差分隐私分析。",
  },
  es: {
    title: "BMO Robot — Clasificación inteligente de residuos",
    description:
      "BMO Robot — PWA de clasificación inteligente de residuos con IA en el dispositivo, aprendizaje federado y privacidad diferencial.",
  },
  fr: {
    title: "BMO Robot — Tri intelligent des déchets",
    description:
      "BMO Robot — PWA de tri intelligent des déchets avec IA embarquée, apprentissage fédéré et confidentialité différentielle.",
  },
  ja: {
    title: "BMO Robot — スマート分別",
    description:
      "BMO Robot — オンデバイス AI、フェデレーテッド ラーニング、差分プライバシーを備えたスマート分別 PWA。",
  },
  ko: {
    title: "BMO Robot — 스마트 폐기물 분류",
    description:
      "BMO Robot — 온디바이스 AI, 연합 학습, 차등 개인정보 보호 분석을 갖춘 스마트 폐기물 분류 PWA.",
  },
  id: {
    title: "BMO Robot — Pemilahan sampah pintar",
    description:
      "BMO Robot — PWA pemilahan sampah pintar dengan AI di perangkat, federated learning, dan privasi diferensial.",
  },
};

/** Apply per-locale `<title>` + `<meta name=description>` to <head>. */
function syncDocumentMeta(lng: string) {
  if (typeof document === "undefined") return;
  const meta = META[lng] ?? META.en!;
  document.title = meta.title;
  const descEl = document.querySelector('meta[name="description"]');
  if (descEl) descEl.setAttribute("content", meta.description);
  // Update <html lang> as well so screen readers and search engines get
  // the right language.
  document.documentElement.setAttribute("lang", lng);
}

/** Change UI language and persist. Notifies subscribers (LanguageSwitcher). */
export async function changeLanguage(code: LanguageCode): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Keep the in-memory language when persistence is unavailable.
  }
  if (!loadedLanguages.has(code)) {
    const loader = localeLoaders[code];
    if (!loader) throw new Error(`No locale loader registered for ${code}`);
    const messages = await loader();
    i18n.addResourceBundle(code, "translation", messages, true, true);
    loadedLanguages.add(code);
  }
  await i18n.changeLanguage(code);

  // Update <html dir> attribute before notifying the rest of the app.
  if (typeof document !== "undefined") {
    const rtlCodes = new Set(["ar", "he", "fa", "ur", "yi"]);
    document.documentElement.setAttribute("dir", rtlCodes.has(code) ? "rtl" : "ltr");
  }
  // Update <title>, <meta description>, <html lang>.
  syncDocumentMeta(code);
  // Notify listeners outside React (e.g. main.tsx sets <html dir>).
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("bmo:languageChanged", { detail: code }));
  }
}

// Apply the initial language once, after i18next has had a chance to fire
// `languageChanged`. This makes the very first paint show the correct title
// even when the persisted language differs from the default.
i18n.on("languageChanged", syncDocumentMeta);
if (typeof document !== "undefined") {
  // Cover the boot race where `languageChanged` has already fired before
  // we attached the listener (i18next is synchronous on init).
  syncDocumentMeta(getCurrentLanguage());
}

if (!loadedLanguages.has(initialLanguage)) {
  void changeLanguage(initialLanguage).catch((error) => {
    console.warn(`[i18n] Failed to load ${initialLanguage}; using English fallback.`, error);
  });
}

export function getCurrentLanguage(): LanguageCode {
  return (i18n.language as LanguageCode) || "vi";
}

/** Subscribe to language changes outside React. */
export function onLanguageChanged(handler: (code: LanguageCode) => void) {
  const wrapped = (lng: string) => handler(lng as LanguageCode);
  i18n.on("languageChanged", wrapped);
  return () => i18n.off("languageChanged", wrapped);
}

export default i18n;
