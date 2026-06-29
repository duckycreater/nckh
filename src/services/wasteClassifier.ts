/**
 * WasteClassifier - Edge AI for 6-category Vietnamese waste sorting
 *
 * Breakthrough: runs ONNX model locally, no cloud dependency.
 * Falls back through: WebGPU → WASM-SIMD → WASM
 */

import { EdgeModel, detectBestProvider, initOrtEnv } from "./edgeAiPipeline";

export type WasteCategory =
  | "plastic" | "paper" | "glass"
  | "metal" | "organic" | "hazard";

export const WASTE_CLASSES: WasteCategory[] = [
  "plastic", "paper", "glass", "metal", "organic", "hazard",
];

export const WASTE_LABEL_VI: Record<WasteCategory, string> = {
  plastic: "Nhựa",
  paper: "Giấy",
  glass: "Thủy tinh",
  metal: "Kim loại",
  organic: "Hữu cơ",
  hazard: "Nguy hại",
};

export interface WastePrediction {
  category: WasteCategory;
  confidence: number;
  probabilities: Record<WasteCategory, number>;
  latencyMs: number;
  provider: string;
  isLowConfidence: boolean;
}

// Vietnamese-context preprocessing constants
const IMAGENET_MEAN = [0.485, 0.456, 0.406];
const IMAGENET_STD = [0.229, 0.224, 0.225];
const INPUT_SIZE = 224;

export class WasteClassifier {
  private model: EdgeModel | null = null;
  private loadPromise: Promise<void> | null = null;
  private confidenceThreshold = 0.55;

  constructor(private modelUrl = "/models/waste_classifier_v1.onnx") {}

  async ensureLoaded(): Promise<void> {
    if (this.model) return;
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = (async () => {
      await initOrtEnv();
      this.model = new EdgeModel({
        modelUrl: this.modelUrl,
        executionProvider: "auto",
        inputShape: [1, 3, INPUT_SIZE, INPUT_SIZE],
        warmup: true,
      });
      await this.model.load();
    })();
    return this.loadPromise;
  }

  /** Preprocess image (HTMLImageElement | ImageData | ImageBitmap) to NCHW Float32 tensor */
  async preprocess(image: HTMLImageElement | HTMLImageElement[]): Promise<Float32Array> {
    const imgs = Array.isArray(image) ? image : [image];

    // OffscreenCanvas for fast resize
    const canvas = typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(INPUT_SIZE, INPUT_SIZE)
      : Object.assign(document.createElement("canvas"), { width: INPUT_SIZE, height: INPUT_SIZE });
    const ctx = (canvas as any).getContext("2d", { willReadFrequently: false });

    const total = 1 * 3 * INPUT_SIZE * INPUT_SIZE;
    const out = new Float32Array(total);

    for (let b = 0; b < imgs.length; b++) {
      const img = imgs[b];
      ctx.drawImage(img, 0, 0, INPUT_SIZE, INPUT_SIZE);
      const { data } = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
      const base = b * 3 * INPUT_SIZE * INPUT_SIZE;
      // HWC → CHW, normalize
      for (let y = 0; y < INPUT_SIZE; y++) {
        for (let x = 0; x < INPUT_SIZE; x++) {
          const i = (y * INPUT_SIZE + x) * 4;
          const o = base + y * INPUT_SIZE + x;
          out[o]                     = (data[i]     / 255 - IMAGENET_MEAN[0]) / IMAGENET_STD[0];
          out[base + INPUT_SIZE*INPUT_SIZE + o]    = (data[i + 1] / 255 - IMAGENET_MEAN[1]) / IMAGENET_STD[1];
          out[base + 2*INPUT_SIZE*INPUT_SIZE + o]  = (data[i + 2] / 255 - IMAGENET_MEAN[2]) / IMAGENET_STD[2];
        }
      }
    }
    return out;
  }

  /**
   * Classify a single image. Returns softmax probabilities for all 6 categories.
   */
  async classify(image: HTMLImageElement): Promise<WastePrediction> {
    await this.ensureLoaded();
    if (!this.model) throw new Error("Model failed to load");

    const t0 = performance.now();
    const data = await this.preprocess(image);
    const { runtime, InferenceSession, Tensor } = await import("onnxruntime-web");
    void runtime; // keep import side-effect
    const tensor = new Tensor("float32", data, [1, 3, INPUT_SIZE, INPUT_SIZE]);
    const result = await this.model.run(tensor);

    const probabilities = this.softmax(result.output as Float32Array);
    let topIdx = 0;
    let topVal = probabilities[0];
    for (let i = 1; i < probabilities.length; i++) {
      if (probabilities[i] > topVal) { topVal = probabilities[i]; topIdx = i; }
    }

    const category = WASTE_CLASSES[topIdx] ?? "plastic";
    const t1 = performance.now();

    const probMap = {} as Record<WasteCategory, number>;
    WASTE_CLASSES.forEach((c, i) => { probMap[c] = probabilities[i]; });

    return {
      category,
      confidence: topVal,
      probabilities: probMap,
      latencyMs: t1 - t0,
      provider: this.model.provider,
      isLowConfidence: topVal < this.confidenceThreshold,
    };
  }

  private softmax(logits: Float32Array): Float32Array {
    let max = logits[0];
    for (let i = 1; i < logits.length; i++) if (logits[i] > max) max = logits[i];
    const exps = new Float32Array(logits.length);
    let sum = 0;
    for (let i = 0; i < logits.length; i++) {
      exps[i] = Math.exp(logits[i] - max);
      sum += exps[i];
    }
    for (let i = 0; i < logits.length; i++) exps[i] /= sum;
    return exps;
  }

  getProvider(): string {
    return this.model?.provider ?? "not-loaded";
  }

  setConfidenceThreshold(t: number) { this.confidenceThreshold = t; }

  async dispose(): Promise<void> {
    await this.model?.dispose();
    this.model = null;
  }
}

// Singleton for app-wide use
let singleton: WasteClassifier | null = null;
export function getWasteClassifier(): WasteClassifier {
  if (!singleton) singleton = new WasteClassifier();
  return singleton;
}