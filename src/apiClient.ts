/**
 * apiClient.ts — Single import for all BMO HTTP calls.
 *
 *   import { api } from "@/apiClient";
 *   const data = await api.login({ login_nickname, login_password });
 *
 * All methods funnel through `apiFetch` which:
 *   - JSON-encodes the body,
 *   - injects the Authorization header from localStorage,
 *   - retries idempotent GETs up to 2 times with exponential backoff,
 *   - throws `ApiError` on non-2xx responses (no silent fallback).
 */

import type {
  AuditTimelineResponse,
  ClassifyImageRequest,
  ClassifyImageResponse,
  DatasetConsentRequest,
  DatasetConsentResponse,
  DatasetStatusResponse,
  FederatedStatsResponse,
  FederatedSubmitRequest,
  FederatedSubmitResponse,
  LoginRequest,
  LoginResponseOk,
  ModelListResponse,
  RegisterRequest,
  RegisterResponseOk,
  SignedManifestResponse,
} from "./apiContract";

const API_BASE =
  (typeof import.meta !== "undefined" &&
    (import.meta as {env?: {VITE_API_BASE_URL?: string}}).env?.VITE_API_BASE_URL) ||
  "";

export class ApiError extends Error {
  status: number;
  endpoint: string;
  payload: unknown;

  constructor(status: number, endpoint: string, payload: unknown, message?: string) {
    super(message || `HTTP ${status} from ${endpoint}`);
    this.name = "ApiError";
    this.status = status;
    this.endpoint = endpoint;
    this.payload = payload;
  }
}

interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  /** Disable auth header (default true). */
  withAuth?: boolean;
  /** Extra headers. */
  headers?: Record<string, string>;
  /** Number of retries for idempotent GETs. Default 2. */
  retries?: number;
  signal?: AbortSignal;
}

async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const {method = "GET", body, withAuth = true, headers = {}, retries = 2, signal} = opts;

  const finalHeaders: Record<string, string> = {...headers};
  let payload: BodyInit | undefined;
  if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  if (withAuth && typeof localStorage !== "undefined") {
    const token = localStorage.getItem("bmo_token") || localStorage.getItem("auth_token");
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  let attempt = 0;
  let lastError: unknown;
  const maxAttempts = method === "GET" ? retries + 1 : 1;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const r = await fetch(`${API_BASE}${path}`, {
        method,
        headers: finalHeaders,
        body: payload,
        signal,
      });
      const text = await r.text();
      let parsed: unknown = text;
      if (text && r.headers.get("content-type")?.includes("application/json")) {
        try {
          parsed = JSON.parse(text);
        } catch {
          // leave as text
        }
      }
      if (!r.ok) {
        throw new ApiError(r.status, path, parsed);
      }
      return parsed as T;
    } catch (e) {
      lastError = e;
      if (e instanceof ApiError) throw e; // 4xx/5xx not retried
      if (attempt >= maxAttempts) break;
      // exponential backoff for transient network errors
      await new Promise((r) => setTimeout(r, 250 * 2 ** (attempt - 1)));
    }
  }
  throw lastError;
}

/* ─── Typed methods ─── */

const post = <Req, Res>(path: string) => (body: Req, opts?: FetchOptions) =>
  apiFetch<Res>(path, {...opts, method: "POST", body});
const get = <Res>(path: string) => (opts?: FetchOptions) =>
  apiFetch<Res>(path, {...opts, method: "GET"});

export const api = {
  // Auth
  login: post<LoginRequest, LoginResponseOk>("/api/login"),
  register: post<RegisterRequest, RegisterResponseOk>("/api/register"),
  logout: post<{}, {ok: true}>("/api/logout"),

  // Dataset
  getDatasetStatus: (nickname: string) =>
    get<DatasetStatusResponse>(`/api/dataset/status?nickname=${encodeURIComponent(nickname)}`),
  grantDatasetConsent: post<DatasetConsentRequest, DatasetConsentResponse>("/api/dataset/consent"),
  revokeDatasetConsent: post<{}, DatasetConsentResponse>("/api/dataset/revoke"),

  // Federated
  submitFederated: post<FederatedSubmitRequest, FederatedSubmitResponse>("/api/federated/submit"),
  getFederatedStats: get<FederatedStatsResponse>("/api/federated/status"),

  // Vision
  classifyImage: post<ClassifyImageRequest, ClassifyImageResponse>("/api/vision/classify"),

  // Models
  listModels: get<ModelListResponse>("/api/models"),
  getSignedManifest: (name: string) =>
    get<SignedManifestResponse>(`/api/models/${encodeURIComponent(name)}`),

  // Audit
  getAuditTimeline: (cursor?: string) =>
    get<AuditTimelineResponse>(
      `/api/audit/timeline${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
    ),

  /** Escape hatch for one-off routes not yet typed here. */
  rawFetch: apiFetch,
};

export { apiFetch };