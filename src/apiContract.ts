/**
 * apiContract.ts — Typed surface for the BMO HTTP API.
 *
 * This file is consumed by BOTH the client (src/apiClient.ts) and
 * the server (server/apiContract.ts uses it for request validation
 * with the same shapes). Keeping a single source of truth avoids
 * drift between client expectations and server guarantees.
 *
 * Conventions:
 *   - All paths are RELATIVE to "/api". The runtime prepends the
 *     origin / Vite proxy.
 *   - Request bodies use snake_case (the server's style).
 *   - Successful responses always carry `{ok: true, ...}`; errors
 *     carry `{ok: false, error: "..."}`.  Existing endpoints that
 *     use ad-hoc shapes are wrapped at the call site.
 */

export type Nickname = string;
export type Category = "plastic" | "paper" | "glass" | "metal" | "organic" | "hazard";

/* ───── Auth ───── */

export interface LoginRequest {
  login_nickname: Nickname;
  login_password: string;
}
export interface LoginResponseOk {
  success: true;
  token: string;
  account_id: Nickname;
  nickname: string;
  role: "user" | "admin";
  points: number;
  email?: string;
  full_name?: string;
  class_grade?: string;
  selectedAvatar?: string;
  selectedFrame?: string;
}

export interface RegisterRequest {
  reg_nickname: Nickname;
  reg_password: string;
  reg_name: string;
  reg_full_name?: string;
  reg_class_grade?: string;
  reg_email?: string;
}

export interface RegisterResponseOk {
  success: true;
  message: string;
}

export interface GenericError {
  ok?: false;
  error: string;
  message?: string;
}

/* ───── Dataset consent (GDPR-style) ───── */

export interface DatasetStatusResponse {
  ok: true;
  consent: boolean;
  totalContributions: number;
}

export interface DatasetConsentRequest {
  consent: boolean;
}

export interface DatasetConsentResponse {
  ok: true;
  consent: boolean;
  consentDate: string | null;
}

/* ───── Federated ───── */

export interface FederatedSubmitRequest {
  delta: number[];
  numSamples: number;
  computedAt: number;
  epochLoss: number;
}

export interface FederatedSubmitResponse {
  ok: true;
  bufferSize: number;
  minClients: number;
}

export interface FederatedStatsResponse {
  ok: true;
  bufferSize: number;
  minClients: number;
  latestVersion: {version: string; trainedOn: number; createdAt: number} | null;
  dp: {epsilon: number; delta: number; clipNorm: number};
}

/* ───── Vision ───── */

export interface ClassifyImageRequest {
  image: string; // base64 data URL
  hint?: Category;
}

export interface ClassifyImageResponse {
  ok: true;
  category: Category;
  confidence: number;
  alternatives: {category: Category; confidence: number}[];
  latencyMs: number;
  backend: string;
  xai?: {overallScore: number; explanationReliable: boolean};
}

/* ───── Audit ───── */

export interface AuditEvent {
  id: string;
  ts: number;
  type: string;
  payload: Record<string, unknown>;
}

export interface AuditTimelineResponse {
  ok: true;
  events: AuditEvent[];
  cursor: string | null;
}

/* ───── Models ───── */

export interface ModelManifestDto {
  name: string;
  version: string;
  framework: "onnx" | "tfjs" | "tflite";
  expectedInputSize: [number, number];
  url: string;
  sha256: string;
  license: string;
  trainedOnSamples?: number;
}

export interface ModelListResponse {
  ok: true;
  models: ModelManifestDto[];
}

export interface SignedManifestResponse {
  manifest: ModelManifestDto;
  signature: string;
}