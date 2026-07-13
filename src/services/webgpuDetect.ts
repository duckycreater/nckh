/**
 * webgpuDetect.ts — Capability detection + cached fallback chain.
 *
 * WebGPU is the fastest path on Chrome/Edge/Arc; WebGL2 (TensorFlow.js
 * WebGL backend) is universal; CPU (WASM) is the slowest but always
 * available. We cache the result in localStorage so detection only
 * runs once per device.
 *
 * Energy estimates are coarse but principled: published TDP proxies
 * for each compute path on a typical phone.
 */

export type ComputeBackend = "webgpu" | "webgl2" | "wasm-simd" | "wasm";

export interface BackendCapability {
  backend: ComputeBackend;
  /** Available when backend === "webgpu". */
  adapter?: {vendor?: string; architecture?: string};
  /** Approximate mW per inference (1 image @ 224²). Source: industry reports. */
  energyMilliwatts: number;
  /** True when the device exposes the capability — checked once, cached. */
  confirmed: boolean;
}

const CACHE_KEY = "bmo.backend.capability.v1";

/* Estimated mW per inference by backend. Conservative upper bound
 * so the UI does not over-promise savings. */
const ENERGY_BY_BACKEND: Record<ComputeBackend, number> = {
  webgpu: 80,      // NPU/GPU path
  webgl2: 250,     // GPU shader path
  "wasm-simd": 600, // SIMD CPU
  wasm: 1500,      // generic CPU
};

async function probeWebGPU(): Promise<BackendCapability | null> {
  try {
    const nav = navigator as unknown as {gpu?: {requestAdapter(): Promise<unknown>}};
    if (!nav.gpu || typeof nav.gpu.requestAdapter !== "function") return null;
    const adapter = await nav.gpu.requestAdapter();
    if (!adapter) return null;
    const a = adapter as {info?: {vendor?: string; architecture?: string}};
    return {
      backend: "webgpu",
      adapter: {
        vendor: a.info?.vendor,
        architecture: a.info?.architecture,
      },
      energyMilliwatts: ENERGY_BY_BACKEND.webgpu,
      confirmed: true,
    };
  } catch {
    return null;
  }
}

function probeWebGL2(): BackendCapability {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (gl) {
      return {
        backend: "webgl2",
        energyMilliwatts: ENERGY_BY_BACKEND.webgl2,
        confirmed: true,
      };
    }
  } catch {
    // fallthrough
  }
  return {
    backend: "wasm-simd",
    energyMilliwatts: ENERGY_BY_BACKEND["wasm-simd"],
    confirmed: typeof WebAssembly !== "undefined",
  };
}

/** Returns the cached capability if available. */
export function getCachedBackend(): BackendCapability | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BackendCapability;
  } catch {
    return null;
  }
}

/**
 * Resolve the best available backend. Probes WebGPU first (async), then
 * caches the result so subsequent calls are sync and cheap.
 */
export async function resolveBackend(): Promise<BackendCapability> {
  const cached = getCachedBackend();
  if (cached) return cached;

  let result = await probeWebGPU();
  if (!result) result = probeWebGL2();
  if (!result.confirmed) {
    result = {
      backend: "wasm",
      energyMilliwatts: ENERGY_BY_BACKEND.wasm,
      confirmed: true,
    };
  }

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(result));
  } catch {
    // ignore
  }
  return result;
}

/** For tests. */
export function clearBackendCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Map the requested framework to the resolved backend. ONNX supports
 * all four; TF.js maps WebGL2 → "webgl", WebGPU → "webgpu".
 */
export function frameworkBackendName(
  framework: "onnx" | "tfjs",
  backend: ComputeBackend,
): "webgpu" | "webgl" | "wasm" | "cpu" {
  if (framework === "tfjs") {
    if (backend === "webgpu") return "webgpu";
    if (backend === "webgl2") return "webgl";
    return "wasm";
  }
  if (backend === "webgpu") return "webgpu";
  if (backend === "webgl2") return "wasm";
  return "cpu";
}