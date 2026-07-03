/**
 * voiceTTS - Text-to-Speech for elderly / illiterate users
 *
 * Phase 3 deliverable: BMO speaks the answer aloud in the user's language.
 *
 * Uses Google Cloud Text-to-Speech as the primary provider (broad language support,
 * stable pricing) with a Groq PlayHT fallback when Groq's audio API is generally
 * available. We also support a "browser TTS" mode (Web Speech API on the client)
 * which is the default to avoid burning API budget when not needed.
 *
 * Endpoints exposed (in server routes):
 *   POST /api/voice/speak   - text → { audioBase64, mimeType }
 */

export interface TTSResult {
  audioBase64: string;
  mimeType: string;
  language: string;
  voice: string;
  cost: number; // USD estimate
}

export type TTSProvider = "google" | "groq" | "browser";

/**
 * Map our short locale codes to BCP-47 tags + voice names that Google TTS accepts.
 * Source: https://cloud.google.com/text-to-speech/docs/voices
 */
const GOOGLE_VOICE_MAP: Record<string, { languageCode: string; name: string }> = {
  vi: { languageCode: "vi-VN", name: "vi-VN-Wavenet-A" },
  en: { languageCode: "en-US", name: "en-US-Wavenet-D" },
  es: { languageCode: "es-ES", name: "es-ES-Wavenet-B" },
  fr: { languageCode: "fr-FR", name: "fr-FR-Wavenet-A" },
  zh: { languageCode: "cmn-CN", name: "cmn-CN-Wavenet-A" },
  hi: { languageCode: "hi-IN", name: "hi-IN-Wavenet-A" },
  ar: { languageCode: "ar-XA", name: "ar-XA-Wavenet-B" },
  sw: { languageCode: "sw-KE", name: "sw-KE-Standard-A" },
  lo: { languageCode: "lo-LA", name: "lo-LA-Standard-A" },
  km: { languageCode: "km-KH", name: "km-KH-Standard-A" },
  id: { languageCode: "id-ID", name: "id-ID-Wavenet-A" },
  ja: { languageCode: "ja-JP", name: "ja-JP-Wavenet-A" },
  ko: { languageCode: "ko-KR", name: "ko-KR-Wavenet-A" },
  pt: { languageCode: "pt-BR", name: "pt-BR-Wavenet-A" },
  de: { languageCode: "de-DE", name: "de-DE-Wavenet-A" },
  ru: { languageCode: "ru-RU", name: "ru-RU-Wavenet-A" },
  th: { languageCode: "th-TH", name: "th-TH-Standard-A" },
  tl: { languageCode: "fil-PH", name: "fil-PH-Wavenet-A" },
};

export function getVoiceForLocale(locale: string) {
  return GOOGLE_VOICE_MAP[locale] || GOOGLE_VOICE_MAP.en;
}

/**
 * Synthesize speech via Google Cloud TTS.
 * Requires GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_TTS_API_KEY env var.
 */
export async function synthesizeGoogle(
  text: string,
  locale: string = "vi"
): Promise<TTSResult> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_TTS_API_KEY not configured");
  const voice = getVoiceForLocale(locale);

  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: voice.languageCode, name: voice.name },
      audioConfig: { audioEncoding: "MP3", speakingRate: 1.0, pitch: 0 },
    }),
  });
  if (!r.ok) throw new Error(`Google TTS error: ${r.status} ${await r.text()}`);
  const data = await r.json();
  // Cost: ~$4.00 per 1M characters (Wavenet). MP3 returned base64.
  const cost = (text.length / 1_000_000) * 4.0;
  return {
    audioBase64: data.audioContent,
    mimeType: "audio/mpeg",
    language: voice.languageCode,
    voice: voice.name,
    cost,
  };
}

/**
 * Provider dispatcher. Currently uses Google; Groq PlayHT integration
 * can be enabled when that beta API is generally available.
 */
export async function synthesizeSpeech(
  text: string,
  locale: string = "vi",
  provider: TTSProvider = "google"
): Promise<TTSResult> {
  if (!text?.trim()) {
    throw new Error("Empty text for TTS");
  }
  switch (provider) {
    case "google":
      return synthesizeGoogle(text, locale);
    case "groq":
      // TODO: integrate when Groq audio API is GA
      throw new Error("Groq TTS not yet available; falling back to browser");
    case "browser":
      throw new Error("Browser TTS handled client-side via Web Speech API");
  }
}

export function isTTSConfigured(): boolean {
  return !!process.env.GOOGLE_TTS_API_KEY;
}