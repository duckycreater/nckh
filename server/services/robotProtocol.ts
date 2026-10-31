import crypto from "node:crypto";
import { z } from "zod";

const Id = z
  .string()
  .trim()
  .min(8)
  .max(160)
  .regex(/^[A-Za-z0-9._:-]+$/);
const TimestampMs = z.number().int().positive();

export const RobotIdentityRequestSchema = z
  .object({
    session_id: Id,
    device_id: Id,
    method: z.enum(["badge", "pin"]),
    badge: z
      .object({
        student_name: z.string().trim().min(2).max(100),
        class_name: z.string().trim().min(2).max(20),
        observation_id: Id,
        observed_at_ms: TimestampMs,
        source_camera: z.string().trim().min(2).max(80),
        confidence: z.number().min(0).max(1),
      })
      .optional(),
    account_id: z.string().trim().min(4).max(100).optional(),
    pin: z
      .string()
      .regex(/^\d{6}$/)
      .optional(),
  })
  .superRefine((value, context) => {
    if (value.method === "badge" && !value.badge) {
      context.addIssue({ code: "custom", path: ["badge"], message: "badge is required" });
    }
    if (value.method === "pin" && (!value.account_id || !value.pin)) {
      context.addIssue({
        code: "custom",
        path: ["account_id"],
        message: "account_id and pin are required",
      });
    }
  });

export const RobotEventRequestSchema = z.object({
  event_id: Id,
  session_id: Id,
  device_id: Id,
  identity_token: z.string().min(32).max(256),
  observed_at_ms: TimestampMs,
  completed_at_ms: TimestampMs,
  waste_name: z.string().trim().min(1).max(120),
  waste_category: z.enum(["organic", "inorganic"]),
  actual_bin: z.enum(["organic", "inorganic"]).nullable(),
  decision: z.enum(["confirmed", "withdrawn", "uncertain", "timeout", "cancelled"]),
  recognition_confidence: z.number().min(0).max(1),
  tracking_quality: z.number().min(0).max(1),
  calibration_version: z.string().trim().min(1).max(120),
  evidence_hash: z.string().regex(/^[a-f0-9]{64}$/i),
  client_version: z.string().trim().min(1).max(80),
});

export type RobotIdentityRequest = z.infer<typeof RobotIdentityRequestSchema>;
export type RobotEventRequest = z.infer<typeof RobotEventRequestSchema>;

/** Stable JSON is part of the wire protocol; never replace it with raw JSON.stringify. */
export function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(",")}}`;
}

export function robotSignatureInput(
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  body: unknown,
): string {
  return [method.toUpperCase(), path.split("?", 1)[0], timestamp, nonce, stableJson(body)].join(
    "\n",
  );
}

export function signRobotRequest(
  secret: string,
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  body: unknown,
): string {
  return crypto
    .createHmac("sha256", secret)
    .update(robotSignatureInput(method, path, timestamp, nonce, body))
    .digest("hex");
}

export function verifyRobotRequest(input: {
  secret: string;
  method: string;
  path: string;
  timestamp?: string;
  nonce?: string;
  signature?: string;
  body: unknown;
  nowMs?: number;
  maxSkewMs?: number;
}): { ok: true; nonce: string; timestampMs: number } | { ok: false; reason: string } {
  const timestamp = input.timestamp?.trim() || "";
  const nonce = input.nonce?.trim() || "";
  const signature = input.signature?.trim().toLowerCase() || "";
  if (!/^\d{13}$/.test(timestamp)) return { ok: false, reason: "bad_timestamp" };
  if (!/^[A-Za-z0-9._:-]{16,160}$/.test(nonce)) return { ok: false, reason: "bad_nonce" };
  if (!/^[a-f0-9]{64}$/.test(signature)) return { ok: false, reason: "bad_signature" };
  const timestampMs = Number(timestamp);
  const nowMs = input.nowMs ?? Date.now();
  if (Math.abs(nowMs - timestampMs) > (input.maxSkewMs ?? 5 * 60_000)) {
    return { ok: false, reason: "expired_timestamp" };
  }
  const expected = signRobotRequest(
    input.secret,
    input.method,
    input.path,
    timestamp,
    nonce,
    input.body,
  );
  const actualBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return { ok: false, reason: "signature_mismatch" };
  }
  return { ok: true, nonce, timestampMs };
}

export function robotPayloadHash(body: unknown): string {
  return crypto.createHash("sha256").update(stableJson(body)).digest("hex");
}

export function identityTokenHash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function expectedBin(category: "organic" | "inorganic"): "organic" | "inorganic" {
  return category;
}

export function robotScore(event: RobotEventRequest, canEarnPoints: boolean): number {
  return event.decision === "confirmed" &&
    event.actual_bin === expectedBin(event.waste_category) &&
    canEarnPoints
    ? 10
    : 0;
}
