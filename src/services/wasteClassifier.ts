/**
 * Browser-side waste classification using the checked-in ONNX artifact.
 * The v1 artifact consumes a 16-value colour/texture/shape feature vector.
 */

import { createFloatTensor, EdgeModel } from "./edgeAiPipeline";
import {
  selectivePredict,
  validateConformalProfile,
  type CalibrationProfile,
  type SelectivePrediction,
} from "./conformalAbstention";
import { fetchVerifiedModelSource, getModelManifest } from "./modelRegistry";

export type WasteCategory = "plastic" | "paper" | "glass" | "metal" | "organic" | "hazard";

// This order is part of the ONNX model contract.
export const WASTE_CLASSES: WasteCategory[] = [
  "organic",
  "plastic",
  "paper",
  "glass",
  "metal",
  "hazard",
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
  confidenceSource: "raw_softmax" | "conformal";
  probabilities: Record<WasteCategory, number>;
  latencyMs: number;
  provider: string;
  isLowConfidence: boolean;
  /** Present when a separately fitted conformal profile is configured. */
  abstention?: SelectivePrediction;
  isAbstained: boolean;
}

const IMAGE_SIZE = 224;
const FEATURE_DIM = 16;

export class WasteClassifier {
  private model: EdgeModel | null = null;
  private loadPromise: Promise<void> | null = null;
  private confidenceThreshold = 0.55;
  private calibrationProfile: CalibrationProfile | null = null;

  constructor(
    private modelUrl = "/models/waste_classifier_v1.onnx",
    private calibrationProfileUrl = "/models/waste_classifier_v1_conformal_profile.json",
  ) {}

  async ensureLoaded(): Promise<void> {
    if (this.model) return;
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = (async () => {
      const manifest = await getModelManifest("waste-classifier");
      let modelSource: ArrayBuffer | null = null;
      let modelUrl = this.modelUrl;
      if (manifest) {
        modelUrl = manifest.url;
        modelSource = await fetchVerifiedModelSource(manifest);
        if (!modelSource) {
          throw new Error("Unable to fetch model bytes for the verified manifest");
        }
      }
      this.model = new EdgeModel({
        modelUrl,
        modelSource: modelSource ?? undefined,
        executionProvider: "auto",
        inputShape: [1, FEATURE_DIM],
        warmup: true,
      });
      await this.model.load();
      await this.loadCalibrationProfile();
    })();
    return this.loadPromise;
  }

  /** Load only a validated, externally fitted profile; absence is expected in dev. */
  private async loadCalibrationProfile(): Promise<void> {
    if (this.calibrationProfile || typeof fetch !== "function") return;
    try {
      const response = await fetch(this.calibrationProfileUrl, {
        credentials: "same-origin",
        cache: "no-cache",
      });
      if (!response.ok) return;
      const candidate = (await response.json()) as CalibrationProfile;
      if (validateConformalProfile(candidate, WASTE_CLASSES)) {
        this.calibrationProfile = candidate;
      } else {
        console.warn("[WasteClassifier] ignoring an invalid conformal profile");
      }
    } catch {
      // A profile is optional until the external calibration set is locked.
    }
  }

  /** Extract the same 16 scalar feature contract declared by the model manifest. */
  async preprocess(image: HTMLImageElement | HTMLImageElement[]): Promise<Float32Array> {
    const img = Array.isArray(image) ? image[0] : image;
    const canvas =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(IMAGE_SIZE, IMAGE_SIZE)
        : Object.assign(document.createElement("canvas"), {
            width: IMAGE_SIZE,
            height: IMAGE_SIZE,
          });
    const ctx = (canvas as any).getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Unable to create image canvas");
    ctx.drawImage(img, 0, 0, IMAGE_SIZE, IMAGE_SIZE);
    const { data } = ctx.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE);
    const n = IMAGE_SIZE * IMAGE_SIZE;
    const red = new Float32Array(n);
    const green = new Float32Array(n);
    const blue = new Float32Array(n);
    const luma = new Float32Array(n);
    let meanR = 0;
    let meanG = 0;
    let meanB = 0;
    let meanSat = 0;
    let dark = 0;
    let bright = 0;
    let greenDominant = 0;
    let blueDominant = 0;
    let redDominant = 0;
    for (let i = 0; i < n; i++) {
      const p = i * 4;
      red[i] = data[p] / 255;
      green[i] = data[p + 1] / 255;
      blue[i] = data[p + 2] / 255;
      luma[i] = 0.299 * red[i] + 0.587 * green[i] + 0.114 * blue[i];
      const saturation = Math.max(red[i], green[i], blue[i]) - Math.min(red[i], green[i], blue[i]);
      meanR += red[i];
      meanG += green[i];
      meanB += blue[i];
      meanSat += saturation;
      if (luma[i] < 0.2) dark++;
      if (luma[i] > 0.8) bright++;
      if (green[i] > red[i] * 1.1 && green[i] > blue[i] * 1.1) greenDominant++;
      if (blue[i] > red[i] * 1.1 && blue[i] > green[i] * 1.1) blueDominant++;
      if (red[i] > green[i] * 1.1 && red[i] > blue[i] * 1.1) redDominant++;
    }
    meanR /= n;
    meanG /= n;
    meanB /= n;
    meanSat /= n;
    let varR = 0;
    let varG = 0;
    let varB = 0;
    let varSat = 0;
    let edge = 0;
    let count = 0;
    for (let y = 0; y < IMAGE_SIZE - 1; y += 2) {
      for (let x = 0; x < IMAGE_SIZE - 1; x += 2) {
        const i = y * IMAGE_SIZE + x;
        const saturation =
          Math.max(red[i], green[i], blue[i]) - Math.min(red[i], green[i], blue[i]);
        varR += (red[i] - meanR) ** 2;
        varG += (green[i] - meanG) ** 2;
        varB += (blue[i] - meanB) ** 2;
        varSat += (saturation - meanSat) ** 2;
        edge += Math.abs(luma[i] - luma[i + 1]) + Math.abs(luma[i] - luma[i + IMAGE_SIZE]);
        count++;
      }
    }
    const inv = 1 / count;
    const center = luma[Math.floor(IMAGE_SIZE / 2) * IMAGE_SIZE + Math.floor(IMAGE_SIZE / 2)];
    return new Float32Array([
      meanR,
      meanG,
      meanB,
      meanSat,
      Math.sqrt(varR * inv),
      Math.sqrt(varG * inv),
      Math.sqrt(varB * inv),
      Math.sqrt(varSat * inv),
      edge * inv,
      dark / n,
      bright / n,
      greenDominant / n,
      blueDominant / n,
      redDominant / n,
      center,
      1 - meanSat,
    ]);
  }

  async classify(image: HTMLImageElement): Promise<WastePrediction> {
    await this.ensureLoaded();
    if (!this.model) throw new Error("Model failed to load");
    const t0 = performance.now();
    const data = await this.preprocess(image);
    const tensor = createFloatTensor(data, [1, FEATURE_DIM]);
    const result = await this.model.run(tensor);
    const probabilities = this.softmax(result.output as Float32Array);
    let topIdx = 0;
    for (let i = 1; i < probabilities.length; i++)
      if (probabilities[i] > probabilities[topIdx]) topIdx = i;
    const topVal = probabilities[topIdx] ?? 0;
    const topCategory = WASTE_CLASSES[topIdx] ?? "organic";
    const probMap = {} as Record<WasteCategory, number>;
    WASTE_CLASSES.forEach((c, i) => {
      probMap[c] = probabilities[i] ?? 0;
    });
    const abstention = this.calibrationProfile
      ? selectivePredict(Array.from(probabilities), this.calibrationProfile, {
          features: Array.from(data),
        })
      : undefined;
    return {
      // Keep the historical category field populated for existing UI flows;
      // research-aware callers must inspect `abstention` before acting.
      category: (abstention?.category as WasteCategory | null) ?? topCategory,
      confidence: topVal,
      confidenceSource: abstention ? "conformal" : "raw_softmax",
      probabilities: probMap,
      latencyMs: performance.now() - t0,
      provider: this.model.provider,
      isLowConfidence: topVal < this.confidenceThreshold,
      abstention,
      isAbstained: abstention?.abstained ?? false,
    };
  }

  private softmax(logits: Float32Array): Float32Array {
    let max = logits[0] ?? 0;
    for (let i = 1; i < logits.length; i++) if (logits[i] > max) max = logits[i];
    const exps = new Float32Array(logits.length);
    let sum = 0;
    for (let i = 0; i < logits.length; i++) {
      exps[i] = Math.exp(logits[i] - max);
      sum += exps[i];
    }
    for (let i = 0; i < logits.length; i++) exps[i] /= sum || 1;
    return exps;
  }

  getProvider(): string {
    return this.model?.provider ?? "not-loaded";
  }
  setConfidenceThreshold(t: number) {
    this.confidenceThreshold = Math.min(1, Math.max(0, t));
  }
  setCalibrationProfile(profile: CalibrationProfile | null): void {
    if (profile && !validateConformalProfile(profile, WASTE_CLASSES)) {
      throw new Error("Calibration profile does not match the waste model contract");
    }
    this.calibrationProfile = profile;
  }
  getCalibrationProfile(): CalibrationProfile | null {
    return this.calibrationProfile;
  }
  async dispose(): Promise<void> {
    await this.model?.dispose();
    this.model = null;
    this.loadPromise = null;
  }
}

let singleton: WasteClassifier | null = null;
export function getWasteClassifier(): WasteClassifier {
  if (!singleton) singleton = new WasteClassifier();
  return singleton;
}
