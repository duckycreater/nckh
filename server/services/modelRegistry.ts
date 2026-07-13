/**
 * server/services/modelRegistry.ts — Trusted source for ML model manifests.
 *
 * Each model registered here exposes:
 *   - name            e.g. "waste-classifier"
 *   - version         e.g. "v2"
 *   - framework       "onnx" | "tfjs" | "tflite"
 *   - expectedInputSize
 *   - url             where to download the weights
 *   - sha256          integrity hash of the weights file
 *   - license         e.g. "Apache-2.0"
 *   - promptTemplate? optional (LLM-style models)
 *
 * Each manifest is signed with HMAC-SHA256 using BMO_MODEL_HMAC_SECRET
 * (fallback to AUTH_SECRET). Clients MUST verify the signature before
 * loading the model — that prevents a compromised CDN from serving a
 * tampered model.
 *
 * Storage is in-memory for now; replacing with Supabase is a one-liner.
 */

import crypto from "crypto";

export type ModelFramework = "onnx" | "tfjs" | "tflite";

export interface ModelManifest {
  name: string;
  version: string;
  framework: ModelFramework;
  expectedInputSize: [number, number];
  url: string;
  sha256: string;
  license: string;
  promptTemplate?: string;
  /** Optional training sample count, for the "trained on N samples" badge. */
  trainedOnSamples?: number;
  registeredAt: number;
}

export interface SignedManifest {
  manifest: ModelManifest;
  /** Hex-encoded HMAC-SHA256 of the canonical JSON of `manifest`. */
  signature: string;
}

const HMAC_SECRET =
  process.env.BMO_MODEL_HMAC_SECRET ||
  process.env.AUTH_SECRET ||
  /* Hardcoded fallback so the server boots in dev. NEVER use in prod. */
  "bmo-dev-model-secret-change-me";

function canonicalise(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalise).join(",") + "]";
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>)
      .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
      .sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalise((value as Record<string, unknown>)[k])).join(",") + "}";
  }
  return JSON.stringify(String(value));
}

export function signManifest(manifest: ModelManifest): string {
  const payload = canonicalise(manifest);
  return crypto.createHmac("sha256", HMAC_SECRET).update(payload).digest("hex");
}

export function verifyManifest(signed: SignedManifest): boolean {
  const expected = signManifest(signed.manifest);
  // timingSafeEqual avoids signature timing attacks.
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signed.signature, "hex");
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

class ModelRegistry {
  private models = new Map<string, ModelManifest>();

  register(manifest: ModelManifest): ModelManifest {
    const key = `${manifest.name}@${manifest.version}`;
    this.models.set(key, manifest);
    this.models.set(manifest.name, manifest); // latest pointer
    return manifest;
  }

  list(): ModelManifest[] {
    return Array.from(this.models.values()).filter((v) => !v.name.includes("@"));
  }

  get(name: string): ModelManifest | null {
    return this.models.get(name) || null;
  }

  getVersion(name: string, version: string): ModelManifest | null {
    return this.models.get(`${name}@${version}`) || null;
  }

  getSigned(name: string): SignedManifest | null {
    const manifest = this.get(name);
    if (!manifest) return null;
    return {manifest, signature: signManifest(manifest)};
  }
}

export const modelRegistry = new ModelRegistry();

/* Bootstrap with the canonical waste classifier.
 *
 * SHA-256 is pinned to the artifact produced by
 *   python scripts/train_and_export_waste_classifier.py --epochs 50
 * (seed=42, 2-layer MLP 16→32→6, synthetic centroids). The script
 * is reproducible bit-for-bit; running it twice yields the same
 * digest. Update the literal below only when you intentionally
 * retrain — then update `public/models/waste_classifier_v1.onnx`
 * in the same commit and rerun `scripts/smoke.sh`. */
modelRegistry.register({
  name: "waste-classifier",
  version: "v1",
  framework: "onnx",
  expectedInputSize: [16, 16],
  url: "/models/waste_classifier_v1.onnx",
  sha256: "83eca56f84c9e51b92473ab170b0b0ecf39f76f2611a1bdca17ca435a33a5261",
  license: "Apache-2.0",
  trainedOnSamples: 1920,
  registeredAt: Date.now(),
});