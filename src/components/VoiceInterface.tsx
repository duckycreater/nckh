/**
 * VoiceInterface - Multilingual voice I/O for BMO Robot
 *
 * Uses native Web Speech API (zero-dependency, no cloud):
 *   - SpeechRecognition: STT (Chrome/Edge/Safari)
 *   - SpeechSynthesis: TTS (universal)
 *
 * Multilingual: Vietnamese (vi-VN) + English (en-US)
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, VolumeX, X, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

type Lang = "vi-VN" | "en-US";

interface Props {
  lang?: Lang;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onCommand?: (cmd: VoiceCommand) => void;
  onClose?: () => void;
}

export interface VoiceCommand {
  type:
    | "classify"       // "phân loại cái này" / "classify this"
    | "explain"        // "giải thích" / "explain why"
    | "start_game"     // "bắt đầu game" / "start game"
    | "show_stats"     // "thống kê" / "show stats"
    | "open_card"      // "mở thẻ" / "open card"
    | "help"           // "trợ giúp" / "help"
    | "unknown";
  raw: string;
  lang: Lang;
  confidence: number;
}

const COMMAND_PATTERNS: Record<VoiceCommand["type"], RegExp[]> = {
  classify: [/phân loại|classify|categorize|what is this|cái gì/i],
  explain: [/giải thích|explain|why|tại sao|lý do/i],
  start_game: [/bắt đầu|start|chơi|play|game/i],
  show_stats: [/thống kê|stats|điểm|score|points/i],
  open_card: [/mở thẻ|open card|show card|thẻ bài/i],
  help: [/trợ giúp|help|hướng dẫn/i],
  unknown: [],
};

function detectCommand(text: string): VoiceCommand {
  for (const [type, patterns] of Object.entries(COMMAND_PATTERNS) as [VoiceCommand["type"], RegExp[]][]) {
    if (type === "unknown") continue;
    for (const p of patterns) {
      if (p.test(text)) {
        return { type, raw: text, lang: "vi-VN", confidence: 0.85 };
      }
    }
  }
  return { type: "unknown", raw: text, lang: "vi-VN", confidence: 0 };
}

export function VoiceInterface({ lang: initialLang = "vi-VN", onTranscript, onCommand, onClose }: Props) {
  const { t } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lang, setLang] = useState<Lang>(initialLang);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  // ── Initialize Speech Recognition ──────────────────────────────────────────
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("Trình duyệt không hỗ trợ nhận diện giọng nói");
      return;
    }

    const rec = new SR();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e: any) => {
      const last = e.results[e.results.length - 1];
      const text = last[0].transcript;
      setTranscript(text);
      onTranscript?.(text, last.isFinal);
      if (last.isFinal) {
        const cmd = detectCommand(text);
        onCommand?.(cmd);
      }
    };

    rec.onerror = (e: any) => {
      console.error("[Voice] Recognition error:", e.error);
      setError(`Lỗi: ${e.error}`);
      setIsListening(false);
    };

    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;

    return () => {
      try { rec.stop(); } catch {}
    };
  }, [lang, onTranscript, onCommand]);

  // ── Speak (TTS) ───────────────────────────────────────────────────────────
  const speak = (text: string) => {
    if (!voiceEnabled) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = 1.0;
    utter.pitch = 1.1;
    utter.volume = 1.0;

    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);

    synthesisRef.current = utter;
    window.speechSynthesis.speak(utter);
  };

  // Expose speak globally for other components
  useEffect(() => {
    (window as any).__bmoSpeak = speak;
    return () => { delete (window as any).__bmoSpeak; };
  }, [lang, voiceEnabled]);

  // ── Toggle listening ──────────────────────────────────────────────────────
  const toggleListening = () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (isListening) {
      rec.stop();
      setIsListening(false);
    } else {
      setError(null);
      setTranscript("");
      try {
        rec.start();
        setIsListening(true);
      } catch (e) {
        console.error("[Voice] start failed:", e);
      }
    }
  };

  const toggleVoice = () => {
    setVoiceEnabled((v) => {
      if (v && typeof window !== "undefined") window.speechSynthesis.cancel();
      return !v;
    });
  };

  const toggleLang = () => setLang((l) => (l === "vi-VN" ? "en-US" : "vi-VN"));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed bottom-4 left-4 z-50 flex flex-col items-end gap-2"
      >
        {/* Transcript bubble */}
        {(transcript || error) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xs rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-lg dark:border-slate-700 dark:bg-slate-800"
          >
            <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
              {error || transcript}
            </p>
          </motion.div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-200 text-slate-700 shadow-md transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200"
            >
              <X size={18} />
            </button>
          )}
          <button
            onClick={toggleLang}
            className="flex h-11 items-center gap-1 rounded-full bg-slate-200 px-3 text-xs font-bold text-slate-700 shadow-md transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200"
            title={t("voice.title")}
          >
            <Languages size={14} />
            {lang === "vi-VN" ? t("voice.lang.vi") : t("voice.lang.en")}
          </button>
          <button
            onClick={toggleVoice}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-200 text-slate-700 shadow-md transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200"
            title={voiceEnabled ? t("voice.off") : t("voice.on")}
          >
            {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            onClick={toggleListening}
            className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all ${
              isListening
                ? "bg-rose-500 text-white ring-4 ring-rose-300 animate-pulse"
                : "bg-gradient-to-br from-violet-500 to-indigo-500 text-white hover:scale-105"
            }`}
            title={isListening ? "Dừng nghe" : "Bắt đầu nói"}
          >
            {isListening ? <MicOff size={22} /> : <Mic size={22} />}
          </button>
        </div>

        {/* Speaking indicator */}
        {isSpeaking && (
          <div className="flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 dark:bg-indigo-900/40">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
            </span>
            <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
              Đang nói...
            </span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}