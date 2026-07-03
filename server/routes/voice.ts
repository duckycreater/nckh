/**
 * Voice Routes - Phase 3: STT + TTS endpoints
 *
 *   POST /api/voice/transcribe   - audio blob → { text, language }
 *   POST /api/voice/speak        - text → { audioBase64, mimeType }
 *   POST /api/voice/intent       - text → { intent, confidence }
 *   GET  /api/voice/health       - feature status
 */

import { Router } from "express";
import multer from "multer";
import { transcribeAudio, detectIntent, isVoiceConfigured } from "../services/voiceSTT.js";
import { synthesizeSpeech, isTTSConfigured } from "../services/voiceTTS.js";
import { resolveLocale } from "../services/localeRouter.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

export function voiceRouter(): Router {
  const router = Router();

  router.get("/health", async (_req, res) => {
    res.json({
      stt: isVoiceConfigured(),
      tts: isTTSConfigured(),
    });
  });

  // POST /api/voice/transcribe - multipart upload "audio" + optional "language" hint
  router.post("/transcribe", upload.single("audio"), async (req, res) => {
    try {
      if (!isVoiceConfigured()) {
        return res.status(503).json({ error: "Voice STT not configured (GROQ_API_KEY missing)" });
      }
      if (!req.file) {
        return res.status(400).json({ error: "No audio file uploaded" });
      }
      const hint = (req.body?.language as string) || undefined;
      const result = await transcribeAudio(req.file.buffer, req.file.mimetype, hint);
      const intent = detectIntent(result.text);
      res.json({ ...result, intent });
    } catch (e) {
      console.error("[voice/transcribe]", (e as Error).message);
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // POST /api/voice/intent - text-only intent detection (for non-audio clients)
  router.post("/intent", async (req, res) => {
    const { text } = req.body || {};
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "text required" });
    }
    res.json(detectIntent(text));
  });

  // POST /api/voice/speak - text → synthesized audio
  router.post("/speak", async (req, res) => {
    try {
      const { text, locale } = req.body || {};
      if (!text) return res.status(400).json({ error: "text required" });
      const loc = resolveLocale({
        preference: locale,
        acceptLanguage: req.headers["accept-language"],
      });
      const result = await synthesizeSpeech(text, loc.locale, "google");
      res.json(result);
    } catch (e) {
      console.error("[voice/speak]", (e as Error).message);
      res.status(500).json({ error: (e as Error).message });
    }
  });

  return router;
}