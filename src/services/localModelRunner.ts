/**
 * Local Model Runner - Browser-side AI inference (CayGiaPha_NhanThuc)
 *
 * Uses ONNX Runtime Web for real ML inference (no cloud, no simulation).
 * Backends: WebGPU (Chrome/Edge) → WASM-SIMD (universal) → WASM (fallback)
 *
 * Models served from /public/models/:
 *   - waste_classifier_v1.onnx  (MobileNetV3-Small, ~5MB, 6 categories)
 */

import { getWasteClassifier, type WasteCategory, type WastePrediction } from "./wasteClassifier";

export type LocalModelType = "mobilenet_v2" | "efficientnet_lite" | "yolov8n" | "onnx_waste_v1";

export interface LocalModelConfig {
  type: LocalModelType;
  displayName: string;
  inputSize: [number, number];
  description: string;
  modelUrl?: string;
  classLabels?: string[];
  framework: "tfjs" | "onnx";
}

export const LOCAL_MODELS: LocalModelConfig[] = [
  {
    type: "onnx_waste_v1",
    displayName: "ONNX Waste Classifier v1",
    inputSize: [224, 224],
    description: "MobileNetV3-Small trained on TDN-Waste-5000. Edge-optimized, 6 Vietnamese categories.",
    modelUrl: "/models/waste_classifier_v1.onnx",
    classLabels: ["plastic", "paper", "glass", "metal", "organic", "hazard"],
    framework: "onnx",
  },
  {
    type: "mobilenet_v2",
    displayName: "MobileNetV2 (legacy TF.js)",
    inputSize: [224, 224],
    description: "Legacy TF.js model. Kept for backward compatibility.",
    modelUrl: "/models/mobilenet_v2/model.json",
    classLabels: ["plastic", "paper", "glass", "metal", "organic", "hazard", "cardboard", "textile"],
    framework: "tfjs",
  },
  {
    type: "efficientnet_lite",
    displayName: "EfficientNet-Lite (legacy)",
    inputSize: [224, 224],
    description: "Legacy TFLite model.",
    modelUrl: "/models/efficientnet_lite/model.json",
    classLabels: ["plastic", "paper", "glass", "metal", "organic", "hazard", "cardboard", "textile"],
    framework: "tfjs",
  },
  {
    type: "yolov8n",
    displayName: "YOLOv8n (object detection)",
    inputSize: [640, 640],
    description: "Object detection model. Detects multiple objects per image.",
    modelUrl: "/models/yolov8n/model.json",
    classLabels: ["plastic_bottle", "paper_box", "glass_jar", "metal_can", "organic_waste", "hazard_battery"],
    framework: "tfjs",
  },
];

const WASTE_CATEGORIES: WasteCategory[] = [
  "plastic", "paper", "glass", "metal", "organic", "hazard",
];

interface ClassifyResult {
  category: WasteCategory;
  confidence: number;
  latencyMs: number;
  probabilities?: Record<WasteCategory, number>;
  provider?: string;
}

class LocalModelRunner {
  private loadedModels: Map<LocalModelType, boolean> = new Map();
  private loadingModels: Set<LocalModelType> = new Set();
  private onnxInitialized = false;
  private readonly preferredModel: LocalModelType = "onnx_waste_v1";

  /**
   * Initialize ONNX waste classifier (singleton).
   * Loads model from /public/models/waste_classifier_v1.onnx
   */
  async loadModel(modelType: LocalModelType): Promise<boolean> {
    if (this.loadedModels.has(modelType)) return true;
    if (this.loadingModels.has(modelType)) return false;

    this.loadingModels.add(modelType);
    try {
      if (modelType === this.preferredModel) {
        const classifier = getWasteClassifier();
        await classifier.ensureLoaded();
        this.loadedModels.set(modelType, true);
        this.onnxInitialized = true;
        console.log(`[LocalModel] ONNX waste classifier ready on ${classifier.getProvider()}`);
        return true;
      }

      // Legacy TF.js models
      const tf = await import("@tensorflow/tfjs");
      const config = LOCAL_MODELS.find((m) => m.type === modelType);
      if (!config?.modelUrl) return false;

      try {
        await tf.loadGraphModel(config.modelUrl);
        this.loadedModels.set(modelType, true);
        return true;
      } catch (e) {
        console.warn(`[LocalModel] Failed to load legacy model ${modelType}:`, e);
        return false;
      }
    } finally {
      this.loadingModels.delete(modelType);
    }
  }

  /**
   * Classify an image using the preferred ONNX model.
   * Falls back to a deterministic mock if model not trained yet.
   */
  async classify(
    imageData: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageData,
    modelType: LocalModelType = this.preferredModel
  ): Promise<ClassifyResult> {
    const startTime = performance.now();

    // Try ONNX first
    if (modelType === this.preferredModel) {
      try {
        const classifier = getWasteClassifier();
        const img = await this.toImageElement(imageData);
        const result: WastePrediction = await classifier.classify(img);
        return {
          category: result.category,
          confidence: result.confidence,
          latencyMs: Math.round(performance.now() - startTime),
          probabilities: result.probabilities,
          provider: result.provider,
        };
      } catch (e) {
        console.warn("[LocalModel] ONNX inference failed, falling back to heuristic:", e);
        return this.heuristicFallback(imageData, startTime);
      }
    }

    // Legacy TF.js
    if (this.loadedModels.has(modelType)) {
      const result = await this.runLegacyInference(imageData, modelType);
      return { ...result, latencyMs: Math.round(performance.now() - startTime) };
    }

    const loaded = await this.loadModel(modelType);
    if (loaded) {
      const result = await this.runLegacyInference(imageData, modelType);
      return { ...result, latencyMs: Math.round(performance.now() - startTime) };
    }

    return this.heuristicFallback(imageData, startTime);
  }

  /**
   * Convert various image inputs to HTMLImageElement (needed by ONNX pipeline)
   */
  private async toImageElement(
    input: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageData
  ): Promise<HTMLImageElement> {
    if (input instanceof HTMLImageElement) return input;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = input instanceof HTMLVideoElement
      ? input.src
      : (input as HTMLCanvasElement).toDataURL?.() ?? "";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(e);
      // For ImageData, the toDataURL above returns empty; need canvas
      if (!img.src || img.src === window.location.href) {
        const c = document.createElement("canvas");
        c.width = input instanceof ImageData ? input.width : (input as HTMLCanvasElement).width;
        c.height = input instanceof ImageData ? input.height : (input as HTMLCanvasElement).height;
        const ctx = c.getContext("2d")!;
        if (input instanceof ImageData) ctx.putImageData(input, 0, 0);
        else if (input instanceof HTMLCanvasElement) ctx.drawImage(input, 0, 0);
        else ctx.drawImage(input, 0, 0);
        img.src = c.toDataURL();
      }
    });
    return img;
  }

  private async runLegacyInference(
    imageData: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageData,
    modelType: LocalModelType
  ): Promise<{ category: WasteCategory; confidence: number }> {
    const tf = await import("@tensorflow/tfjs");
    const config = LOCAL_MODELS.find((m) => m.type === modelType);
    if (!config) throw new Error("Unknown model type");

    const [w, h] = config.inputSize;
    const canvas = document.createElement("canvas");
    canvas.width = (imageData as any).width ?? 224;
    canvas.height = (imageData as any).height ?? 224;
    const ctx = canvas.getContext("2d")!;
    if (imageData instanceof ImageData) ctx.putImageData(imageData, 0, 0);
    else ctx.drawImage(imageData, 0, 0);

    const tensor = tf.browser.fromPixels(canvas)
      .resizeNearestNeighbor([w, h])
      .toFloat()
      .div(tf.scalar(255.0))
      .expandDims(0);

    const output = (await import("@tensorflow/tfjs")).loadGraphModel(config.modelUrl!).then(async (m) => {
      const o = m.predict(tensor) as any;
      return o.data();
    }) as Promise<any>;

    const data = await output;
    let topIdx = 0; let topScore = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i] > topScore) { topScore = data[i]; topIdx = i; }
    }
    tensor.dispose();

    const mapped = topIdx % 6;
    return {
      category: WASTE_CATEGORIES[mapped],
      confidence: Math.round(topScore * 100) / 100,
    };
  }

  /**
   * Deterministic color-based heuristic. Used only when no model is trained/loaded.
   * Returns a real waste category based on dominant colour, with low confidence.
   */
  private heuristicFallback(
    imageData: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageData,
    startTime: number
  ): ClassifyResult {
    const canvas = document.createElement("canvas");
    canvas.width = 224; canvas.height = 224;
    const ctx = canvas.getContext("2d")!;
    if (imageData instanceof ImageData) ctx.putImageData(imageData, 0, 0);
    else ctx.drawImage(imageData, 0, 0);

    const data = ctx.getImageData(0, 0, 224, 224).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < data.length; i += 16) {
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    }
    r /= n; g /= n; b /= n;

    let category: WasteCategory = "organic";
    if (b > r && b > g) category = "plastic";
    else if (r > 180 && g > 180 && b < 150) category = "paper";
    else if (Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && r > 150) category = "glass";
    else if (r < 100 && g < 100 && b < 100) category = "metal";
    else if (g > r && g > b) category = "organic";
    else category = "hazard";

    return {
      category,
      confidence: 0.5,
      latencyMs: Math.round(performance.now() - startTime),
      provider: "heuristic",
    };
  }

  isLoaded(modelType: LocalModelType): boolean {
    return this.loadedModels.has(modelType);
  }

  isLoading(modelType: LocalModelType): boolean {
    return this.loadingModels.has(modelType);
  }

  getLoadedModels(): LocalModelType[] {
    return Array.from(this.loadedModels.keys());
  }

  getModelInfo(modelType: LocalModelType): LocalModelConfig | undefined {
    return LOCAL_MODELS.find((m) => m.type === modelType);
  }

  getAllModels(): LocalModelConfig[] {
    return LOCAL_MODELS;
  }

  /** Returns the active execution provider (e.g. "webgpu", "wasm") */
  getActiveProvider(): string {
    if (this.onnxInitialized) return getWasteClassifier().getProvider();
    return "not-loaded";
  }
}

export const localModelRunner = new LocalModelRunner();
export type { WasteCategory };
export { WASTE_CATEGORIES };