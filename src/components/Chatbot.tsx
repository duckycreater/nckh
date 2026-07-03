import { useState, useEffect, useRef } from "react";
import { Bot, X, Send, Trash2, Mic, MicOff } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "react-i18next";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function Chatbot({ currentUser }: { currentUser?: string }) {
  const { t } = useTranslation();
  const storageKey = `ecoquest:chat:${currentUser || "guest"}`;
  const [isOpen, setIsOpen] = useState(false);
  const getWelcomeContent = (user?: string): string =>
    user
      ? t("chatbot.greetingUser", { user })
      : t("chatbot.greeting");

  const SUGGESTED_QUESTIONS = [
    t("chatbot.quickQ1"),
    t("chatbot.quickQ2"),
    t("chatbot.quickQ3"),
    t("chatbot.quickQ4"),
  ];

  const [messages, setMessages] = useState<Message[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (initialized) return;
    setInitialized(true);
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Message[];
        if (parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn('[Chatbot] Failed to load chat history:', e);
    }
    setMessages([{ role: "assistant", content: getWelcomeContent(currentUser) }]);
  }, [storageKey, initialized, currentUser, getWelcomeContent]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessages: Message[] = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          nickname: currentUser,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: t("chatbot.errorResponse", { error: data.error }) }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: t("chatbot.connectionError") }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClear = () => {
      setMessages([{ role: "assistant", content: getWelcomeContent(currentUser) }]);
    localStorage.removeItem(storageKey);
  };

  const handleSuggestion = (question: string) => {
    setInput(question);
  };

  // ── Phase 3: Voice input via MediaRecorder → /api/voice/transcribe ─────
  const startRecording = async () => {
    setVoiceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await sendVoiceBlob(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (e) {
      setVoiceError(t("chatbot.voiceError") || "Microphone unavailable");
    }
  };

  const stopRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop();
    }
    setIsRecording(false);
  };

  const sendVoiceBlob = async (blob: Blob) => {
    try {
      const fd = new FormData();
      fd.append("audio", blob, "voice.webm");
      const r = await fetch("/api/voice/transcribe", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) {
        setVoiceError(data.error || "Voice failed");
        return;
      }
      const text = String(data.text || "").trim();
      if (text) setInput(text);
    } catch (e) {
      setVoiceError("Voice failed");
    }
  };

  const toggleRecording = () => {
    if (isRecording) stopRecording(); else startRecording();
  };

  return (
    <div className="fixed bottom-[5.5rem] right-2 z-50 sm:bottom-6 sm:right-6 md:bottom-6 md:right-6">
      {isOpen && (
        <div className="mb-4 flex h-[34rem] w-80 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl sm:w-96">
          <div className="bg-[linear-gradient(135deg,#0f8f68,#179a73)] px-4 py-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 font-semibold">
                  <span className="inline-flex rounded-full bg-white p-1.5 text-emerald-600">
                    <Bot size={20} />
                  </span>
                  {t("chatbot.title")}
                </div>
                <p className="mt-2 text-sm text-emerald-50/85">{t("chatbot.subtitle")}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClear}
                  className="rounded-full bg-white/10 p-2 text-emerald-100 transition hover:bg-white/20 hover:text-white"
                  aria-label={t("chatbot.deleteHistory")}
                >
                  <Trash2 size={18} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-full bg-white/10 p-2 text-emerald-100 transition hover:bg-white/20 hover:text-white"
                  aria-label={t("chatbot.closeChatbot")}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="thin-scrollbar flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,#f8fbfa,#f3f7f5)] p-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                Tư vấn tức thì
              </span>
              <span className="text-xs font-medium text-slate-400">{t("chatbot.perSession")}</span>
            </div>

            {/* Quick reply suggestions — shown when user has only seen the welcome message */}
            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSuggestion(q)}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 hover:border-emerald-300"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-100 text-emerald-600">
                    <Bot size={18} />
                  </div>
                )}
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-sm ${msg.role === "user" ? "rounded-br-none bg-emerald-600 text-white" : "rounded-bl-none border border-slate-100 bg-white text-gray-800"}`}
                >
                  {msg.role === "user" ? (
                    <p className="text-sm leading-6">{msg.content}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none text-gray-800 prose-p:leading-6 prose-strong:text-slate-900">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center justify-start">
                <div className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-100 text-emerald-600">
                  <Bot size={18} />
                </div>
                <div className="flex gap-1 rounded-2xl rounded-bl-none border border-slate-100 bg-white px-4 py-3 shadow-sm">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "0ms" }} />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "150ms" }} />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-100 bg-white p-4">
            {voiceError && (
              <p className="mb-2 rounded bg-rose-50 px-2 py-1 text-[10px] text-rose-600">{voiceError}</p>
            )}
            <div className="flex overflow-hidden rounded-full border border-transparent bg-slate-100 transition-all focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/15">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={t("chatbot.askPlaceholder")}
                className="flex-1 bg-transparent px-4 py-3 text-sm text-gray-700 focus:outline-none"
              />
              <button
                onClick={toggleRecording}
                title={isRecording ? "Dừng thu âm" : "Nhập bằng giọng nói"}
                className={`m-1 h-10 rounded-full px-3 transition ${
                  isRecording
                    ? "bg-rose-500 text-white animate-pulse"
                    : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                }`}
              >
                {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="m-1 h-10 rounded-full bg-emerald-600 px-4 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative rounded-full bg-[linear-gradient(135deg,#10b981,#0f8f68)] p-4 text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl"
          aria-label={t("chatbot.openChatbot")}
        >
          <Bot size={28} />
          <span className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-white bg-red-500" />
        </button>
      )}
    </div>
  );
}
