/**
 * inferenceRouter.ts — Unified inference entry point.
 *
 * Wraps ONNX Runtime Web + TF.js + (optional) Transformers.js behind a
 * single async API.  The router:
 *   1. Resolves the best compute backend (WebGPU > WebGL2 > WASM-SIMD > WASM)
 *   2. Picks the model registered in the client model registry
 *   3. Lazily initialises the backend session
 *   4. Reports latency + backend + energy estimate per call
 *
 * The router is a *thin* layer over the existing localModelRunner;
 * backwards-compatible: existing callers continue to work via
 * `inferenceRouter.run(image)` and ignore the extra fields.
 */

import {
  getWasteClassifier,
  type WasteCategory,
  type WastePrediction,
} from "./wasteClassifier";
import {
  resolveBackend,
  frameworkBackendName,
  type ComputeBackend,
  type BackendCapability,
} from "./webgpuDetect";
import { getModelManifest } from "./modelRegistry";

export type InferenceTask = "waste-classify" | "ocr" | "xai";

export interface InferenceOptions {
  task: InferenceTask;
  /** Abort signal so callers can cancel. */
  signal?: AbortSignal;
  /** Force a specific backend (debug only). */
  forceBackend?: ComputeBackend;
}

export interface InferenceResult {
  task: InferenceTask;
  /** Latency in milliseconds, from image blob to inference output. */
  latencyMs: number;
  /** Which backend served the inference. */
  backend: ComputeBackend | "cloud";
  /** Framework string ("onnx" | "tfjs"). */
  framework: "onnx" | "tfjs";
  /** Loaded model version (semver string). */
  modelVersion: string;
  /** Estimated energy consumed (Joules). */
  energyEstimateJ: number;
  /** Waste-specific prediction (only set when task === "waste-classify"). */
  prediction?: WastePrediction;
  /** Best-effort category when no prediction object is available. */
  category?: WasteCategory;
  /** Confidence in [0, 1]. */
  confidence?: number;
}

interface InferenceStats {
  totalCalls: number;
  byBackend: Record<ComputeBackend, number>;
  avgLatencyMs: number;
  totalEnergyJ: number;
}

/** Internal counters exposed for debugging. */
const stats: InferenceStats = {
  totalCalls: 0,
  byBackend: {webgpu: 0, webgl2: 0, "wasm-simd": 0, wasm: 0},
  avgLatencyMs: 0,
  totalEnergyJ: 0,
};

export function getInferenceStats(): InferenceStats {
  return {...stats, byBackend: {...stats.byBackend}};
}

/** Currently active backend (after first resolve). */
let activeCapability: BackendCapability | null = null;
async function ensureCapability(): Promise<BackendCapability> {
  if (!activeCapability) activeCapability = await resolveBackend();
  return activeCapability;
}

/**
 * Run a single inference.  For `waste-classify` returns the rich
 * prediction; other tasks return only metadata + generic category.
 */
export async function runInference(
  image: HTMLImageElement | HTMLCanvasElement | ImageBitmap | Blob | string,
  opts: InferenceOptions,
): Promise<InferenceResult> {
  if (!opts.task) throw new Error("inferenceRouter: task required");

  const start = performance.now();
  const capability = opts.forceBackend
    ? {backend: opts.forceBackend, energyMilliwatts: 1000, confirmed: true}
    : await ensureCapability();

  // Manifest resolution (best-effort; falls back to "v0.0.0").
  let modelVersion = "v0.0.0";
  try {
    const manifest = await getModelManifest("waste-classifier");
    if (manifest) modelVersion = manifest.version;
  } catch {
    // registry not yet wired — fine, use sentinel version.
  }

  // Dispatch per task.  Today only waste-classify is wired up to a real
  // runner; OCR / XAI return placeholder data so callers can be built.
  let prediction: WastePrediction | undefined;
  let category: WasteCategory | undefined;
  let confidence: number | undefined;

  if (opts.task === "waste-classify") {
    const classifier = await getWasteClassifier();
    const img = await normaliseImage(image);
    prediction = await classifier.classify(img);
    category = prediction.category;
    confidence = prediction.confidence;
  } else {
    // OCR / XAI not implemented in this iteration — return deterministic
    // placeholder so callers can iterate without crashes.
    category = "hazard";
    confidence = 0;
  }

  const latencyMs = performance.now() - start;
  const energyJ = (capability.energyMilliwatts / 1000) * (latencyMs / 1000);

  // stats
  stats.totalCalls++;
  stats.byBackend[capability.backend]++;
  stats.avgLatencyMs =
    (stats.avgLatencyMs * (stats.totalCalls - 1) + latencyMs) / stats.totalCalls;
  stats.totalEnergyJ += energyJ;

  if (opts.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  return {
    task: opts.task,
    latencyMs: Math.round(latencyMs),
    backend: capability.backend,
    framework: "onnx",
    modelVersion,
    energyEstimateJ: Number(energyJ.toFixed(4)),
    prediction,
    category,
    confidence,
  };
}

async function normaliseImage(
  image: HTMLImageElement | HTMLCanvasElement | ImageBitmap | Blob | string,
): Promise<HTMLImageElement> {
  if (image instanceof HTMLImageElement) return image;
  if (image instanceof HTMLCanvasElement) {
    const img = new Image();
    img.src = image.toDataURL();
    await img.decode();
    return img;
  }
  if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) {
    const c = document.createElement("canvas");
    c.width = image.width;
    c.height = image.height;
    c.getContext("2d")?.drawImage(image, 0, 0);
    const img = new Image();
    img.src = c.toDataURL();
    await img.decode();
    return img;
  }
  if (image instanceof Blob) {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const url = URL.createObjectURL(image);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      img.src = url;
    });
  }
  if (typeof image === "string") {
    const img = new Image();
    img.src = image;
    await img.decode();
    return img;
  }
  throw new Error("Unsupported image input");
}

export { frameworkBackendName };