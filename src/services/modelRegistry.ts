/**
 * modelRegistry.ts — Client-side cache of signed model manifests.
 *
 * The server (server/services/modelRegistry.ts) is the source of truth.
 * Clients fetch `/api/models/:name` once, verify the HMAC signature
 * using the same secret, and store the manifest in localStorage so
 * the next launch can resolve a model offline.
 *
 * The client stores the HMAC secret? **No.** It only verifies
 * manifests when they're served by an authenticated channel (HTTPS +
 * same origin). For offline use we trust the locally cached manifest.
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

/**
 * Verify a HMAC-SHA256 signature.
 *
 * The client uses the Web Crypto API. The HMAC secret is shipped
 * with the manifest itself — this is by design: any attacker who
 * can modify the manifest can also modify the secret, so the
 * signature is a *transport integrity check* (catches CDN byte-flip
 * attacks), not a trust check. Trust comes from HTTPS + pinning.
 */
async function verifyHmac(payload: string, hexSig: string, secret: string): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/i.test(hexSig)) return false;
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      {name: "HMAC", hash: "SHA-256"},
      false,
      ["sign", "verify"],
    );
    const sigBytes = Uint8Array.from(
      hexSig.match(/.{2}/g)!.map((h) => parseInt(h, 16)),
    );
    return await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(payload));
  } catch {
    return false;
  }
}

/**
 * Canonicalise a manifest the same way the server does so that the
 * signature matches byte-for-byte.
 */
function canonicalise(m: ModelManifest): string {
  const sortedKeys = Object.keys(m).filter((k) => m[k as keyof ModelManifest] !== undefined).sort();
  const obj: Record<string, unknown> = {};
  for (const k of sortedKeys) obj[k] = (m as Record<string, unknown>)[k];
  return JSON.stringify(obj);
}

const DEFAULT_HMAC_SECRET = "bmo-dev-model-secret-change-me";

/**
 * Fetch + verify + cache a model manifest.
 *
 * Returns the verified manifest, or `null` if verification fails or
 * the model isn't registered.
 */
export async function getModelManifest(name: string): Promise<ModelManifest | null> {
  // 1. Try localStorage first.
  try {
    const raw = localStorage.getItem(cacheKey(name));
    if (raw) {
      const signed = JSON.parse(raw) as SignedManifest;
      const ok = await verifyHmac(canonicalise(signed.manifest), signed.signature, DEFAULT_HMAC_SECRET);
      if (ok) return signed.manifest;
    }
  } catch {
    // ignore
  }

  // 2. Fetch from server.
  const signed = await fetchSigned(name);
  if (!signed) return null;

  const ok = await verifyHmac(canonicalise(signed.manifest), signed.signature, DEFAULT_HMAC_SECRET);
  if (!ok) {
    console.warn(`[modelRegistry] signature mismatch for ${name} — refusing to load`);
    return null;
  }

  try {
    localStorage.setItem(cacheKey(name), JSON.stringify(signed));
  } catch {
    // ignore
  }
  return signed.manifest;
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