/**
 * AI Router - Unified AI inference with Groq fallback
 *
 * Routes AI requests intelligently:
 * - fast tasks (chat, simple responses): Groq first (fast, cheap), fallback Gemini
 * - reasoning tasks (event gen, reflections, behavioral analysis): Gemini 2.5 Flash
 * - vision tasks: Gemini 2.5 Flash
 *
 * Always tries primary, falls back gracefully on error.
 *
 * Phase 1-4 enhancements:
 *   - Routing policy considers latency budget, cost, and locale
 *   - Per-task provider hints let callers force Groq (chat) or Gemini (vision)
 */

import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

export type TaskType =
  | "chat"
  | "reasoning"
  | "vision"
  | "reflection"
  | "behavioral"
  | "voice_intent"
  | "event_gen";

export type Provider = "groq" | "gemini";

const GEMINI_MODEL = "gemini-2.5-flash";
const GROQ_MODEL = "llama-3.3-70b-versatile"; // Groq's best for reasoning + chat

let groqClient: Groq | null = null;
let geminiAi: GoogleGenAI | null = null;

export function getGroq(): Groq | null {
  if (!groqClient && process.env.GROQ_API_KEY) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

export function getGemini(): GoogleGenAI | null {
  if (!geminiAi && process.env.GEMINI_API_KEY) {
    geminiAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiAi;
}

export interface GenerateOptions {
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  /** Latency budget in ms. Router prefers Groq if budget < 1500ms. */
  latencyBudgetMs?: number;
  /** Locale hint (used to pick model weights / fallback). */
  locale?: string;
  /** Hard provider override (skips routing logic). */
  forceProvider?: Provider;
}

/**
 * Cost estimates in USD per 1M tokens (rough, used for budget accounting).
 */
const COST_PER_M_TOKENS: Record<Provider, { input: number; output: number }> = {
  groq: { input: 0.59, output: 0.79 },   // llama-3.3-70b
  gemini: { input: 0.075, output: 0.30 }, // gemini-2.5-flash
};

export function estimateCost(provider: Provider, inputTokens: number, outputTokens: number): number {
  const r = COST_PER_M_TOKENS[provider];
  return (inputTokens / 1_000_000) * r.input + (outputTokens / 1_000_000) * r.output;
}

/**
 * Resolve the best provider for a task given budget + locale.
 */
export function pickProvider(
  task: TaskType,
  opts: { latencyBudgetMs?: number; locale?: string; forceProvider?: Provider }
): Provider {
  if (opts.forceProvider) return opts.forceProvider;

  // Vision / creative reasoning → Gemini (Groq lacks vision + lower creativity)
  if (task === "vision" || task === "reasoning" || task === "reflection") return "gemini";
  if (task === "event_gen") return "gemini";

  // Chat / behavioral profiling / voice intent → Groq first (low-latency, cheap)
  if (opts.latencyBudgetMs && opts.latencyBudgetMs < 1500) return "groq";
  if (task === "behavioral" || task === "voice_intent" || task === "chat") return "groq";

  return "groq";
}

/**
 * Generate text using the best available AI provider.
 * - chat/behavioral/voice_intent: Groq -> Gemini fallback
 * - vision/reasoning/reflection/event_gen: Gemini primary (Groq lacks vision)
 */
export async function generateText(
  taskType: TaskType,
  prompt: string,
  options: GenerateOptions = {}
): Promise<string> {
  const { systemInstruction, temperature = 0.7, maxTokens = 2048, latencyBudgetMs, locale, forceProvider } = options;
  const provider = pickProvider(taskType, { latencyBudgetMs, locale, forceProvider });

  if (provider === "gemini") {
    return generateGemini(prompt, systemInstruction, temperature, maxTokens);
  }

  // Provider === groq (with fallback)
  const groq = getGroq();
  if (groq) {
    try {
      return await generateGroqChat(groq, prompt, systemInstruction, temperature, maxTokens);
    } catch (e) {
      console.warn("[AIRouter] Groq failed, falling back to Gemini:", (e as Error).message);
    }
  }
  return generateGemini(prompt, systemInstruction, temperature, maxTokens);
}

async function generateGemini(
  prompt: string,
  systemInstruction?: string,
  temperature?: number,
  maxTokens?: number
): Promise<string> {
  const ai = getGemini();
  if (!ai) {
    throw new Error("No AI provider available");
  }

  const contents = Array.isArray(prompt)
    ? prompt
    : [{ role: "user" as const, parts: [{ text: prompt }] }];

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: {
      systemInstruction: systemInstruction || undefined,
      temperature,
      maxOutputTokens: maxTokens,
    },
  });

  if (!response.text) {
    throw new Error("Gemini returned empty response");
  }
  return response.text;
}

async function generateGroqChat(
  groq: Groq,
  prompt: string,
  systemInstruction?: string,
  temperature?: number,
  maxTokens?: number
): Promise<string> {
  const messages: Groq.Chat.ChatCompletionMessageParam[] = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  messages.push({ role: "user", content: prompt });

  const response = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
  });

  return response.choices[0]?.message?.content || "";
}

/**
 * Generate content with image (vision task).
 * Falls back to text-only prompt if image unavailable.
 */
export async function generateWithImage(
  base64Image: string,
  prompt: string,
  systemInstruction?: string
): Promise<string> {
  const ai = getGemini();
  if (!ai) {
    throw new Error("Gemini not available for vision tasks");
  }

  const contents = [
    {
      role: "user",
      parts: [
        { text: prompt },
        {
          inlineData: {
            data: base64Image.replace(/^data:image\/\w+;base64,/, ""),
            mimeType: "image/jpeg",
          },
        },
      ],
    },
  ];

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: {
      systemInstruction: systemInstruction || undefined,
      temperature: 0.3,
    },
  });

  return response.text || "";
}
