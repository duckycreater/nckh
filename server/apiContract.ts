/**
 * apiContract.ts — Single source of truth for every HTTP route BMO
 * exposes. Each endpoint declares the request shape, response shape,
 * method and auth requirements. Both the Express server and the React
 * client import these tables (see `validateBody` below) so we cannot
 * accidentally mismatch a payload.
 *
 * Why hand-rolled instead of codegen?
 *   - Avoid an extra build step for a project this small.
 *   - The set of endpoints is bounded (~40 routes).
 *   - Zod schemas double as runtime validators for both sides.
 */

import { z } from "zod";

/* ─── Domain enums ───────────────────────────────────────────────── */
export const WasteCategoryEnum = z.enum(["plastic", "paper", "glass", "metal", "organic", "hazard"]);
export type WasteCategory = z.infer<typeof WasteCategoryEnum>;

/* ─── Per-endpoint schemas ───────────────────────────────────────── */
export const Contracts = {
  "POST /api/chat": {
    body: z.object({
      messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1) })).min(1),
      nickname: z.string().min(1).optional(),
    }),
    response: z.object({ message: z.string() }).passthrough(),
    auth: false,
  },
  "POST /api/federated/submit": {
    body: z.object({
      round: z.number().int().nonnegative().optional(),
      weights: z.array(z.array(z.number())).min(1),
      numSamples: z.number().int().positive(),
      metrics: z.object({ loss: z.number(), accuracy: z.number(), durationMs: z.number() }).optional(),
      privacy: z.object({ epsilon: z.number(), delta: z.number(), noiseSigma: z.number() }).optional(),
    }),
    response: z.object({ accepted: z.boolean(), queuedForRound: z.number().int() }).passthrough(),
    auth: true,
  },
  "GET /api/federated/latest": {
    response: z
      .object({ version: z.string().nullable(), trainedOnSamples: z.number(), scores: z.record(z.string(), z.number()) })
      .passthrough(),
    auth: false,
  },
  "GET /api/federated/status": {
    response: z
      .object({
        bufferSize: z.number().int(),
        config: z.object({ minClients: z.number().int(), dpEpsilon: z.number(), dpDelta: z.number(), clipNorm: z.number() }).passthrough(),
        latestVersion: z
          .object({ version: z.string(), trainedOn: z.number(), createdAt: z.number(), scores: z.record(z.string(), z.number()) })
          .nullable(),
      })
      .passthrough(),
    auth: false,
  },
  "GET /api/federated/rounds": {
    response: z.object({
      rounds: z.array(
        z
          .object({
            round_number: z.number().int(),
            participants_count: z.number().int().nullable(),
            validation_accuracy: z.number().nullable(),
            dp_epsilon: z.number().nullable(),
            completed_at: z.string().nullable(),
            model_version_after: z.string().nullable(),
          })
          .passthrough()
      ),
    }),
    auth: false,
  },
  "GET /api/impact/summary": {
    query: z.object({ cohort: z.string().default("global"), sinceDays: z.coerce.number().int().positive().default(30) }),
    response: z.record(z.string(), z.unknown()),
    auth: false,
  },
  "GET /api/audit/merkle-root": {
    response: z.object({ rootHex: z.string(), total: z.number().int() }),
    auth: false,
  },
  "GET /api/audit/user/:userId": {
    response: z.object({
      events: z.array(
        z
          .object({
            seq: z.number(),
            ts: z.string(),
            kind: z.string(),
            payload: z.record(z.string(), z.unknown()),
            merkleRoot: z.string(),
          })
          .passthrough()
      ),
    }),
    auth: false,
  },
  "POST /api/cards/gacha-pull": {
    body: z.object({
      nickname: z.string().min(1),
      count: z.number().int().min(1).max(10).default(1),
    }),
    response: z
      .object({
        success: z.boolean(),
        cards: z.array(
          z
            .object({
              id: z.number().int(),
              name: z.string(),
              elementId: z.string(),
              elementName: z.string(),
              elementIcon: z.string(),
              rarityId: z.string(),
              rarityName: z.string(),
              hp: z.number(),
              atk: z.number(),
              isNew: z.boolean(),
              shardsAwarded: z.number().int().nonnegative(),
              cardLevel: z.number().int().positive().optional(),
            })
            .passthrough()
        ),
        totalShardsAwarded: z.number().int().nonnegative(),
        progress: z.record(z.string(), z.unknown()).optional(),
      })
      .passthrough(),
    auth: false,
  },
} as const;

export type ContractKey = keyof typeof Contracts;

export interface Contract<K extends ContractKey> {
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  response: z.ZodTypeAny;
  auth: boolean;
}

/* ─── Helpers ────────────────────────────────────────────────────── */

export function validateBody<K extends ContractKey>(key: K, body: unknown): unknown {
  const def = Contracts[key];
  if (!("body" in def) || !def.body) return null;
  const parsed = (def.body as z.ZodTypeAny).safeParse(body);
  if (!parsed.success) {
    throw new Error(`[apiContract] ${key} body invalid: ${parsed.error.message}`);
  }
  return parsed.data;
}

export function validateQuery<K extends ContractKey>(key: K, query: Record<string, string | undefined>): unknown {
  const def = Contracts[key];
  if (!("query" in def) || !def.query) return {};
  const parsed = (def.query as z.ZodTypeAny).safeParse(query);
  if (!parsed.success) {
    throw new Error(`[apiContract] ${key} query invalid: ${parsed.error.message}`);
  }
  return parsed.data;
}

export function validateResponse<K extends ContractKey>(key: K, raw: unknown): unknown {
  const def = Contracts[key] as Contract<K>;
  const parsed = def.response.safeParse(raw);
  if (!parsed.success) {
    // Soft-fail in production: schema drift shouldn't crash UI.
    if (typeof console !== "undefined") console.warn(`[apiContract] ${key} response drift:`, parsed.error.message);
    return raw;
  }
  return parsed.data;
}
