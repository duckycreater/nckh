/**
 * prefetchModelWeights.ts — Warm the ONNX model cache during idle
 * periods so the first scan after page load is instant.
 *
 * Strategy:
 *   - On `main.tsx` mount, schedule a prefetch via `requestIdleCallback`
 *     (with a `setTimeout` fallback for Safari < 17).
 *   - For each registered manifest, fetch the URL with low priority
 *     and store it in the HTTP cache. Workbox SW will pick it up into
 *     `bmo-static-models` cache automatically.
 *   - The prefetcher is single-flight; concurrent calls share the
 *     same in-progress promise.
 */

import { getModelManifest } from "./modelRegistry";

const PREFETCHED_KEY = "bmo.prefetchedModels.v1";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

let inFlight: Promise<void> | null = null;

interface PrefetchedSet {
  ts: number;
  names: string[];
}

function alreadyPrefetched(name: string): boolean {
  try {
    const raw = localStorage.getItem(PREFETCHED_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as PrefetchedSet;
    if (Date.now() - parsed.ts > ONE_DAY_MS) return false;
    return parsed.names.includes(name);
  } catch {
    return false;
  }
}

function markPrefetched(name: string): void {
  try {
    const raw = localStorage.getItem(PREFETCHED_KEY);
    const parsed: PrefetchedSet = raw
      ? (JSON.parse(raw) as PrefetchedSet)
      : {ts: Date.now(), names: []};
    if (!parsed.names.includes(name)) parsed.names.push(name);
    parsed.ts = Date.now();
    localStorage.setItem(PREFETCHED_KEY, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}

function scheduleIdle(work: () => void): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ric = (window as any).requestIdleCallback as
    | ((cb: () => void, opts?: {timeout: number}) => number)
    | undefined;
  if (ric) {
    ric(work, {timeout: 8000});
  } else {
    setTimeout(work, 1500);
  }
}

/**
 * Schedule a model-weight prefetch during idle time. Safe to call from
 * main.tsx on first render.
 */
export function prefetchModelWeights(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const names = ["waste-classifier"];
    for (const name of names) {
      if (alreadyPrefetched(name)) continue;
      try {
        const manifest = await getModelManifest(name);
        if (!manifest) continue;
        // Low-priority fetch — Workbox stores the response in
        // `bmo-static-models`. Use `no-cors` is unnecessary because
        // the weights are same-origin.
        await fetch(manifest.url, {
          credentials: "same-origin",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          priority: "low",
        } as RequestInit);
        markPrefetched(name);
      } catch {
        // ignore — the scan path will retry on demand.
      }
    }
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/**
 * Schedule the prefetch using `requestIdleCallback`. Falls back to
 * `setTimeout` on browsers without the API.
 */
export function schedulePrefetch(): void {
  scheduleIdle(() => {
    void prefetchModelWeights();
  });
}

/* Test-only export */
export const _internal = {alreadyPrefetched, markPrefetched, PREFETCHED_KEY};