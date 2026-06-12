import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import vi from "../locales/vi.json";
import en from "../locales/en.json";
import zh from "../locales/zh.json";

const STORAGE_KEY = "ecoquest_language";

export const LANGUAGES = [
  { code: "vi", label: "Tiếng Việt", flag: "VN" },
  { code: "en", label: "English", flag: "GB" },
  { code: "zh", label: "中文", flag: "CN" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

function getInitialLanguage(): LanguageCode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ["vi", "en", "zh"].includes(stored)) {
      return stored as LanguageCode;
    }
  } catch {}
  return "vi";
}

i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: getInitialLanguage(),
  fallbackLng: "vi",
  interpolation: {
    escapeValue: false,
  },
});

export function changeLanguage(code: LanguageCode) {
  i18n.changeLanguage(code);
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {}
}

export function getCurrentLanguage(): LanguageCode {
  return i18n.language as LanguageCode;
}

export default i18n;
