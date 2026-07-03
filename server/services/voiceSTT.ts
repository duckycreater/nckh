/**
 * voiceSTT - Groq Whisper integration for multilingual speech-to-text
 *
 * Phase 3 deliverable: turn 50+ languages into text for BMO multimodal assistant.
 *
 * Why Groq Whisper?
 *   - whisper-large-v3-turbo: 50+ languages, ≤500ms, very cheap (~$0.04/hour)
 *   - Auto language detection: no need to know the user's locale up front
 *   - Robust to noise, accents, children's voices
 *
 * Endpoints exposed (in server routes):
 *   POST /api/voice/transcribe   - audio blob → { text, language }
 */

import Groq from "groq-sdk";

const WHISPER_MODEL = "whisper-large-v3-turbo";

let client: Groq | null = null;

function getClient(): Groq | null {
  if (!client && process.env.GROQ_API_KEY) {
    client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return client;
}

export interface STTResult {
  text: string;
  language: string;          // ISO 639-1 (e.g., "vi", "en")
  languageName: string;
  durationSec: number;
  model: string;
  cost: number;              // USD (rough estimate)
}

/**
 * Supported language code → human-readable name (subset of 50+ Whisper languages).
 * Used for downstream locale routing.
 */
const LANG_NAME: Record<string, string> = {
  vi: "Tiếng Việt", en: "English", es: "Español", fr: "Français",
  zh: "中文", hi: "हिन्दी", ar: "العربية", sw: "Kiswahili",
  lo: "ລາວ", km: "ខ្មែរ", id: "Bahasa Indonesia",
  ja: "日本語", ko: "한국어", ru: "Русский", pt: "Português",
  de: "Deutsch", it: "Italiano", th: "ไทย", tl: "Filipino",
};

export function languageName(code: string | undefined): string {
  if (!code) return "Unknown";
  return LANG_NAME[code] || code.toUpperCase();
}

/**
 * Transcribe an audio buffer (WAV/WebM/MP3) using Groq Whisper.
 * Audio is accepted as Buffer (e.g., from multer in-memory upload).
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string = "audio/webm",
  hintLanguage?: string
): Promise<STTResult> {
  const groq = getClient();
  if (!groq) {
    throw new Error("GROQ_API_KEY not configured; voice STT unavailable");
  }

  const file = new File([audioBuffer], `audio.${mimeType.split("/")[1] || "webm"}`, {
    type: mimeType,
  });

  const transcription = await groq.audio.transcriptions.create({
    file,
    model: WHISPER_MODEL,
    language: hintLanguage, // optional hint; Whisper auto-detects otherwise
    response_format: "verbose_json",
  });

  const text = transcription.text?.trim() || "";
  const language = (transcription as any).language || hintLanguage || "vi";
  const durationSec = (transcription as any).duration ?? 0;

  // Rough cost estimate: $0.04 / hour audio
  const cost = (durationSec / 3600) * 0.04;

  return {
    text,
    language,
    languageName: languageName(language),
    durationSec,
    model: WHISPER_MODEL,
    cost,
  };
}

/**
 * Lightweight intent detection from transcribed text.
 * Uses regex patterns for common commands in 6 languages.
 */
export type VoiceIntent =
  | "classify_waste"
  | "explain"
  | "play_game"
  | "show_stats"
  | "open_card"
  | "help"
  | "small_talk"
  | "unknown";

const INTENT_PATTERNS: Record<VoiceIntent, RegExp[]> = {
  classify_waste: [
    /phân loại|classify|categorize|cái này là gì|what is this/i,
    /这是什么|categorizar|clasificar|classer/i,
  ],
  explain: [
    /giải thích|explain|why|tại sao|how/i,
    /解释|por qué|pourquoi/i,
  ],
  play_game: [
    /chơi|play|game|trò chơi|bắt đầu|start/i,
    /jugar|jouer|玩游戏/i,
  ],
  show_stats: [
    /thống kê|stats|điểm|score|points|tổng/i,
    /estadísticas|statistiques|统计/i,
  ],
  open_card: [
    /mở thẻ|open card|show card|thẻ bài/i,
    /abrir carta|ouvrir carte/i,
  ],
  help: [
    /trợ giúp|help|hướng dẫn|how to/i,
    /ayuda|aide|帮助/i,
  ],
  small_talk: [
    /xin chào|hello|hi |hey|chào/i,
    /hola|bonjour|你好/i,
  ],
  unknown: [],
};

export function detectIntent(text: string): { intent: VoiceIntent; confidence: number } {
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS) as [VoiceIntent, RegExp[]][]) {
    if (intent === "unknown") continue;
    for (const p of patterns) {
      if (p.test(text)) return { intent, confidence: 0.85 };
    }
  }
  return { intent: "unknown", confidence: 0 };
}

export function isVoiceConfigured(): boolean {
  return !!process.env.GROQ_API_KEY;
}