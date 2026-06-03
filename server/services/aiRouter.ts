/**
 * AI Router - Unified AI inference with Groq fallback
 *
 * Routes AI requests intelligently:
 * - fast tasks (chat, simple responses): Groq first (fast, cheap), fallback Gemini
 * - reasoning tasks (event gen, reflections, behavioral analysis): Gemini 2.5 Flash
 * - vision tasks: Gemini 2.5 Flash
 *
 * Always tries primary, falls back gracefully on error.
 */

import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

export type TaskType = "chat" | "reasoning" | "vision" | "reflection";

const GEMINI_MODEL = "gemini-2.5-flash";
const GROQ_MODEL = "llama-3.3-70b-versatile"; // Groq's best for reasoning + chat

let groqClient: Groq | null = null;
let geminiAi: GoogleGenAI | null = null;

function getGroq(): Groq | null {
  if (!groqClient && process.env.GROQ_API_KEY) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

function getGemini(): GoogleGenAI | null {
  if (!geminiAi && process.env.GEMINI_API_KEY) {
    geminiAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiAi;
}

export interface GenerateOptions {
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Generate text using the best available AI provider.
 * - chat: Groq -> Gemini fallback
 * - reasoning/vision/reflection: Gemini only (Groq lacks vision)
 */
export async function generateText(
  taskType: TaskType,
  prompt: string,
  options: GenerateOptions = {}
): Promise<string> {
  const { systemInstruction, temperature = 0.7, maxTokens = 2048 } = options;

  // For vision and reasoning tasks: use Gemini directly
  if (taskType === "vision" || taskType === "reasoning" || taskType === "reflection") {
    return generateGemini(prompt, systemInstruction, temperature, maxTokens);
  }

  // For chat: try Groq first, fallback to Gemini
  const groq = getGroq();
  if (groq) {
    try {
      return await generateGroqChat(groq, prompt, systemInstruction, temperature, maxTokens);
    } catch (e) {
      console.warn("[AIRouter] Groq failed, falling back to Gemini:", (e as Error).message);
    }
  }

  // Fallback to Gemini
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
