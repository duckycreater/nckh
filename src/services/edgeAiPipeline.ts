/**
 * Edge AI Pipeline - ONNX Runtime Web + WebGPU/WASM fallback
 *
 * Breakthrough: Run real ML inference directly in the browser or on Raspberry Pi.
 * No cloud roundtrip, no privacy leakage, < 200ms latency on WebGPU.
 *
 * Hierarchy:
 *   1. WebGPU  (Chrome/Edge 113+) — fastest, GPU-accelerated
 *   2. WASM    (universal)        — CPU SIMD, broad support
 *   3. WASM-threads (if available) — multi-core
 */

import { logger } from "../lib/logger";
import * as ort from "onnxruntime-web";

export type ExecutionProvider = "webgpu" | "wasm" | "wasm-simd" | "wasm-threads";

export interface EdgeInferenceOptions {
  modelUrl: string;
  /** Optional verified bytes. When present ONNX Runtime never refetches them. */
  modelSource?: ArrayBuffer;
  executionProvider?: ExecutionProvider | "auto";
  inputShape?: number[];
  warmup?: boolean;
}

export interface InferenceResult<T = Float32Array> {
  output: T;
  latencyMs: number;
  provider: ExecutionProvider;
  confidence?: number;
}

/**
 * Detect best available execution provider
 */
export async function detectBestProvider(): Promise<ExecutionProvider> {
  if (typeof navigator === "undefined") return "wasm";

  // WebGPU support
  try {
    if ("gpu" in navigator) {
      const adapter = await (
        navigator as unknown as { gpu: { requestAdapter: () => Promise<unknown> } }
      ).gpu.requestAdapter();
      if (adapter) {
        logger.debug("[EdgeAI] WebGPU adapter available");
        return "webgpu";
      }
    }
  } catch (e) {
    logger.warn("[EdgeAI] WebGPU detection failed:", e);
  }

  // WASM with threads + SIMD
  try {
    if (typeof SharedArrayBuffer !== "undefined" && crossOriginIsolated) {
      logger.debug("[EdgeAI] WASM-threads available");
      return "wasm";
    }
  } catch {
    // crossOriginIsolated is defined if isolation is enabled
  }

  return "wasm";
}

/**
 * Initialize ONNX Runtime global environment
 */
let initialized = false;
export async function initOrtEnv(): Promise<void> {
  if (initialized) return;

  // Leave wasmPaths unset so Vite resolves the matching, locally bundled
  // runtime artifact. A hard-coded CDN version can drift from the JS package
  // and is also blocked by the production Content-Security-Policy.
  const hardwareConcurrency =
    typeof navigator === "undefined" ? 1 : navigator.hardwareConcurrency || 2;
  ort.env.wasm.numThreads = Math.min(hardwareConcurrency, 4);
  ort.env.wasm.simd = true;
  ort.env.logLevel = "warning";

  initialized = true;
  logger.debug("[EdgeAI] ONNX Runtime initialized");
}

export function createFloatTensor(data: Float32Array, dimensions: readonly number[]): ort.Tensor {
  return new ort.Tensor("float32", data, [...dimensions]);
}

/**
 * EdgeModel: lightweight wrapper around an ONNX session
 */
export class EdgeModel {
  private session: ort.InferenceSession | null = null;
  private inputName = "input";
  private outputName = "output";
  public provider: ExecutionProvider = "wasm";

  constructor(private opts: EdgeInferenceOptions) {}

  async load(): Promise<void> {
    await initOrtEnv();

    const provider =
      this.opts.executionProvider && this.opts.executionProvider !== "auto"
        ? this.opts.executionProvider
        : await detectBestProvider();

    this.provider = provider;

    const providers: ort.InferenceSession.ExecutionProviderConfig[] =
      provider === "webgpu" ? [{ name: "webgpu" }, { name: "wasm" }] : [{ name: "wasm" }];
    const createSession = (options: ort.InferenceSession.SessionOptions) =>
      this.opts.modelSource
        ? ort.InferenceSession.create(this.opts.modelSource, options)
        : ort.InferenceSession.create(this.opts.modelUrl, options);

    try {
      this.session = await createSession({
        executionProviders: providers,
        graphOptimizationLevel: "all",
        enableCpuMemArena: true,
        enableMemPattern: true,
      });

      this.inputName = this.session.inputNames[0] ?? "input";
      this.outputName = this.session.outputNames[0] ?? "output";

      logger.debug(`[EdgeAI] Model loaded on ${provider}`, { modelUrl: this.opts.modelUrl });

      // Optional warmup run
      if (this.opts.warmup && this.opts.inputShape) {
        const dummy = this.makeDummyInput();
        await this.session.run(dummy);
      }
    } catch (e) {
      logger.error("[EdgeAI] Model load failed, falling back to WASM", e);
      this.provider = "wasm";
      this.session = await createSession({
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
      });
    }
  }

  private makeDummyInput(): Record<string, ort.Tensor> {
    const shape = this.opts.inputShape ?? [1, 3, 224, 224];
    const size = shape.reduce((a, b) => a * b, 1);
    const data = new Float32Array(size);
    return { [this.inputName]: new ort.Tensor("float32", data, shape) };
  }

  async run(inputTensor: ort.Tensor): Promise<InferenceResult> {
    if (!this.session) throw new Error("Model not loaded");

    const t0 = performance.now();
    const feeds: Record<string, ort.Tensor> = { [this.inputName]: inputTensor };
    const outputMap = await this.session.run(feeds);
    const t1 = performance.now();

    const output = outputMap[this.outputName];
    const data = output.data as Float32Array;

    // Argmax for classification
    let maxIdx = 0;
    let maxVal = data[0];
    for (let i = 1; i < data.length; i++) {
      if (data[i] > maxVal) {
        maxVal = data[i];
        maxIdx = i;
      }
    }

    return {
      output: data,
      latencyMs: t1 - t0,
      provider: this.provider,
      confidence: maxVal,
    };
  }

  async dispose(): Promise<void> {
    if (this.session) {
      await this.session.release();
      this.session = null;
    }
  }
}
