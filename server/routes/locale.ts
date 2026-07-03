/**
 * Locale Routes - Phase 3: locale resolution + supported-locales listing
 *
 *   GET  /api/locale/resolve      - Accept-Language + GeoIP → LocaleContext
 *   GET  /api/locale/supported    - list of supported locales + flags
 *   POST /api/locale/translate-prompt - build a locale-aware system prompt
 */

import { Router } from "express";
import {
  resolveLocale,
  buildLocaleSystemPrompt,
  SUPPORTED_LOCALES,
  LOCALE_NAMES,
  LOCALE_FLAGS,
  type LocaleCode,
} from "../services/localeRouter.js";

export function localeRouter(): Router {
  const router = Router();

  // GET /api/locale/resolve - returns locale context for current request
  router.get("/resolve", (req, res) => {
    const country =
      (req.headers["x-vercel-ip-country"] as string) ||
      (req.headers["cf-ipcountry"] as string) ||
      (req.query.country as string) ||
      null;
    const acceptLanguage = (req.headers["accept-language"] as string) || null;
    const preference = (req.headers["x-bmo-locale"] as string) || null;

    const ctx = resolveLocale({
      preference,
      acceptLanguage,
      country,
    });
    res.json(ctx);
  });

  // GET /api/locale/supported - list of supported locales
  router.get("/supported", (_req, res) => {
    const list = SUPPORTED_LOCALES.map((code: LocaleCode) => ({
      code,
      name: LOCALE_NAMES[code],
      flag: LOCALE_FLAGS[code],
    }));
    res.json({ locales: list });
  });

  // POST /api/locale/translate-prompt - build a localized system prompt for LLMs
  router.post("/translate-prompt", (req, res) => {
    const { locale, base } = req.body || {};
    if (!locale) return res.status(400).json({ error: "locale required" });
    const fullPrompt = (base || "") + "\n\n" + buildLocaleSystemPrompt(locale);
    res.json({ prompt: fullPrompt, locale });
  });

  return router;
}