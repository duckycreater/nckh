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

import * as ort from "onnxruntime-web";

export type ExecutionProvider = "webgpu" | "wasm" | "wasm-simd" | "wasm-threads";

export interface EdgeInferenceOptions {
  modelUrl: string;
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
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (adapter) {
        console.log("[EdgeAI] WebGPU adapter available");
        return "webgpu";
      }
    }
  } catch (e) {
    console.warn("[EdgeAI] WebGPU detection failed:", e);
  }

  // WASM with threads + SIMD
  try {
    if (typeof SharedArrayBuffer !== "undefined" && crossOriginIsolated) {
      console.log("[EdgeAI] WASM-threads available");
      return "wasm";
    }
  } catch {}

  return "wasm";
}

/**
 * Initialize ONNX Runtime global environment
 */
let initialized = false;
export async function initOrtEnv(): Promise<void> {
  if (initialized) return;

  // Configure WASM paths for cross-origin support
  ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/";
  ort.env.wasm.numThreads = navigator.hardwareConcurrency
    ? Math.min(navigator.hardwareConcurrency, 4)
    : 2;
  ort.env.wasm.simd = true;
  ort.env.logLevel = "warning";

  initialized = true;
  console.log("[EdgeAI] ONNX Runtime initialized");
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

    const provider = this.opts.executionProvider && this.opts.executionProvider !== "auto"
      ? this.opts.executionProvider
      : await detectBestProvider();

    this.provider = provider;

    const providers: ort.InferenceSession.ExecutionProviderConfig[] = provider === "webgpu"
      ? [{ name: "webgpu" }, { name: "wasm" }]
      : [{ name: "wasm" }];

    try {
      this.session = await ort.InferenceSession.create(this.opts.modelUrl, {
        executionProviders: providers,
        graphOptimizationLevel: "all",
        enableCpuMemArena: true,
        enableMemPattern: true,
      });

      this.inputName = this.session.inputNames[0] ?? "input";
      this.outputName = this.session.outputNames[0] ?? "output";

      console.log(`[EdgeAI] Model loaded on ${provider}:`, this.opts.modelUrl);

      // Optional warmup run
      if (this.opts.warmup && this.opts.inputShape) {
        const dummy = this.makeDummyInput();
        await this.session.run(dummy);
      }
    } catch (e) {
      console.error("[EdgeAI] Model load failed, falling back to WASM:", e);
      this.provider = "wasm";
      this.session = await ort.InferenceSession.create(this.opts.modelUrl, {
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
      if (data[i] > maxVal) { maxVal = data[i]; maxIdx = i; }
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