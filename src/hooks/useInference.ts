/**
 * useInference.ts — React hook around inferenceRouter.
 *
 * Exposes:
 *   - run(image): fire-and-forget (sets state internally)
 *   - result / loading / error / progress
 *   - backendLabel: short string for UI ("WebGPU" / "WebGL" / "CPU SIMD")
 *
 * The hook memoises the capability probe and only re-runs when the
 * caller explicitly resets it.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  runInference,
  getInferenceStats,
  type InferenceOptions,
  type InferenceResult,
} from "../services/inferenceRouter";
import { resolveBackend, type ComputeBackend } from "../services/webgpuDetect";

interface State {
  result: InferenceResult | null;
  loading: boolean;
  error: string | null;
  backend: ComputeBackend | null;
  energyMilliwatts: number | null;
  stats: ReturnType<typeof getInferenceStats>;
}

const INITIAL: State = {
  result: null,
  loading: false,
  error: null,
  backend: null,
  energyMilliwatts: null,
  stats: getInferenceStats(),
};

const BACKEND_LABEL: Record<ComputeBackend, string> = {
  webgpu: "WebGPU",
  webgl2: "WebGL2",
  "wasm-simd": "WASM SIMD",
  wasm: "WASM",
};

export function useInference() {
  const [state, setState] = useState<State>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Probe backend once on mount so the UI can render a small "Running on WebGPU" badge.
    let mounted = true;
    resolveBackend()
      .then((cap) => {
        if (!mounted) return;
        setState((s) => ({
          ...s,
          backend: cap.backend,
          energyMilliwatts: cap.energyMilliwatts,
        }));
      })
      .catch(() => {
        // ignore — backend stays null and we fall back to CPU at call time.
      });
    return () => {
      mounted = false;
    };
  }, []);

  const run = useCallback(
    async (image: HTMLImageElement | HTMLCanvasElement | ImageBitmap | Blob | string, opts: InferenceOptions) => {
      abortRef.current?.abort();
      const ctl = new AbortController();
      abortRef.current = ctl;
      setState((s) => ({...s, loading: true, error: null}));
      try {
        const r = await runInference(image, {...opts, signal: ctl.signal});
        setState((s) => ({
          ...s,
          result: r,
          loading: false,
          error: null,
          stats: getInferenceStats(),
        }));
        return r;
      } catch (e) {
        if ((e as {name?: string}).name === "AbortError") {
          setState((s) => ({...s, loading: false}));
          return null;
        }
        setState((s) => ({
          ...s,
          loading: false,
          error: (e as Error).message,
          stats: getInferenceStats(),
        }));
        return null;
      }
    },
    [],
  );

  const reset = useCallback(() => setState(INITIAL), []);

  return {
    ...state,
    run,
    reset,
    backendLabel: state.backend ? BACKEND_LABEL[state.backend] : "Đang dò phần cứng…",
    isWebGPU: state.backend === "webgpu",
  };
}