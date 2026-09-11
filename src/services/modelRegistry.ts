/**
 * modelRegistry.ts — Client-side cache of signed model manifests.
 *
 * The server (server/services/modelRegistry.ts) is the source of truth.
 * Clients cache the manifest locally and verify the SHA-256 digest of the
 * downloaded model bytes before passing them to ONNX Runtime. The server-side
 * HMAC is intentionally not reproduced in the browser: a browser cannot keep
 * an HMAC secret, and a production secret would make the old client fallback
 * reject valid manifests.
 */

import type { ModelFramework } from "./modelRegistry.types";

export interface ModelManifest {
  name: string;
  version: string;
  framework: ModelFramework;
  expectedInputSize: [number, number];
  url: string;
  sha256: string;
  license: string;
  promptTemplate?: string;
  trainedOnSamples?: number;
  registeredAt: number;
}

export interface SignedManifest {
  manifest: ModelManifest;
  signature: string;
}

const STORAGE_PREFIX = "bmo.model.";

function cacheKey(name: string): string {
  return `${STORAGE_PREFIX}${name}.manifest`;
}

async function fetchSigned(name: string): Promise<SignedManifest | null> {
  try {
    const r = await fetch(`/api/models/${encodeURIComponent(name)}`);
    if (!r.ok) return null;
    return (await r.json()) as SignedManifest;
  } catch {
    return null;
  }
}

export function isValidModelManifest(value: unknown): value is SignedManifest {
  if (!value || typeof value !== "object") return false;
  const signed = value as Partial<SignedManifest>;
  const m = signed.manifest;
  if (!m || typeof m !== "object") return false;
  const manifest = m as Partial<ModelManifest>;
  return (
    typeof manifest.name === "string" &&
    /^[a-zA-Z0-9_-]{1,128}$/.test(manifest.name) &&
    typeof manifest.version === "string" &&
    manifest.version.length > 0 &&
    (manifest.framework === "onnx" ||
      manifest.framework === "tfjs" ||
      manifest.framework === "tflite") &&
    Array.isArray(manifest.expectedInputSize) &&
    manifest.expectedInputSize.length === 2 &&
    manifest.expectedInputSize.every((n) => Number.isSafeInteger(n) && n > 0) &&
    typeof manifest.url === "string" &&
    manifest.url.startsWith("/") &&
    /^[0-9a-f]{64}$/i.test(manifest.sha256 || "")
  );
}

/**
 * Fetch + validate + cache a model manifest.
 *
 * Returns the validated manifest, or `null` if validation fails or the model
 * isn't registered. Weight integrity is checked by fetchVerifiedModelSource.
 */
export async function getModelManifest(name: string): Promise<ModelManifest | null> {
  // 1. Try localStorage first.
  try {
    const raw = localStorage.getItem(cacheKey(name));
    if (raw) {
      const signed = JSON.parse(raw) as SignedManifest;
      if (isValidModelManifest(signed)) return signed.manifest;
    }
  } catch {
    // ignore
  }

  // 2. Fetch from server.
  const signed = await fetchSigned(name);
  if (!signed) return null;

  if (!isValidModelManifest(signed)) {
    console.warn(`[modelRegistry] invalid manifest for ${name} — refusing to load`);
    return null;
  }

  try {
    localStorage.setItem(cacheKey(name), JSON.stringify(signed));
  } catch {
    // ignore
  }
  return signed.manifest;
}

/**
 * Fetch model bytes and verify the digest pinned in its manifest. A failed
 * fetch returns null; callers with a manifest must treat that as unavailable,
 * while callers without a manifest may use their normal URL path. A digest
 * mismatch throws and must fail closed.
 */
export async function fetchVerifiedModelSource(
  manifest: ModelManifest,
): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(manifest.url, { credentials: "same-origin", cache: "no-cache" });
    if (!response.ok) return null;
    const bytes = await response.arrayBuffer();
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) return bytes;
    const digest = await subtle.digest("SHA-256", bytes);
    const actual = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join(
      "",
    );
    if (actual.toLowerCase() !== manifest.sha256.toLowerCase()) {
      const error = new Error(`Model SHA-256 mismatch for ${manifest.name}@${manifest.version}`);
      error.name = "ModelIntegrityError";
      throw error;
    }
    return bytes;
  } catch (error) {
    if (error instanceof Error && error.name === "ModelIntegrityError") throw error;
    return null;
  }
}

/** Drop a cached manifest (debug / privacy erase). */
export function clearModelCache(name?: string): void {
  if (name) {
    localStorage.removeItem(cacheKey(name));
    return;
  }
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith(STORAGE_PREFIX)) localStorage.removeItem(k);
  }
}
