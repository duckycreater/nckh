/**
 * federatedWorker.ts — Web Worker that runs FL local fine-tuning off the UI thread.
 *
 * The worker is intentionally tiny: it accepts training samples in
 * a serialised shape, computes a clipped gradient update with
 * Gaussian noise (differential privacy), and posts the update back
 * to the main thread for transmission to /api/federated/submit.
 *
 * Why a dedicated worker?
 *   - Tensorflow.js training can take 30-200ms per sample on CPU.
 *     Doing it on the main thread jankily blocks the scan UX.
 *   - Worker isolation makes the gradient timing a non-issue.
 */

import type { LocalUpdate, TrainingSample } from "../services/federatedTypes";
import { clipAndNoise } from "./federatedWorkerPure";

interface StartMessage {
  type: "start";
  samples: TrainingSample[];
  epochs: number;
  clipNorm: number;
  sigma: number;
}

interface PingMessage {
  type: "ping";
}

interface ShutdownMessage {
  type: "shutdown";
}

export type WorkerInbound = StartMessage | PingMessage | ShutdownMessage;

export type WorkerOutbound =
  | {type: "ready"}
  | {type: "progress"; epoch: number; loss: number}
  | {type: "done"; update: LocalUpdate}
  | {type: "error"; message: string};

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

/**
 * Toy training loop — in production this would dispatch to
 * tfjs-core. For the worker scaffold we just aggregate a deterministic
 * gradient so the contract is testable without bringing TF.js into
 * the test bundle.
 */
function train(
  samples: TrainingSample[],
  epochs: number,
  clipNorm: number,
  sigma: number,
): AsyncGenerator<{epoch: number; loss: number}, LocalUpdate> {
  const accum: number[] = new Array(8).fill(0);
  let epochLoss = 0;

  async function* gen() {
    for (let e = 0; e < epochs; e++) {
      epochLoss = 0;
      for (const s of samples) {
        for (let i = 0; i < accum.length; i++) {
          accum[i] += (s.features?.[i] ?? 0) * (s.labelValue ?? 1);
        }
        epochLoss += Math.abs(s.labelValue ?? 0);
      }
      yield {epoch: e, loss: epochLoss / Math.max(1, samples.length)};
      // Yield to the event loop so `progress` messages flush.
      await new Promise((r) => setTimeout(r, 0));
    }
    const clipped = clipAndNoise(accum, clipNorm, sigma);
    const result: LocalUpdate = {
      delta: clipped,
      numSamples: samples.length,
      computedAt: Date.now(),
      epochLoss,
    };
    return result;
  }
  return gen();
}

ctx.addEventListener("message", async (event: MessageEvent<WorkerInbound>) => {
  const msg = event.data;
  try {
    if (msg.type === "ping") {
      ctx.postMessage({type: "ready"} as WorkerOutbound);
      return;
    }
    if (msg.type === "shutdown") {
      ctx.close();
      return;
    }
    if (msg.type === "start") {
      const gen = train(msg.samples, msg.epochs, msg.clipNorm, msg.sigma);
      let step = await gen.next();
      while (!step.done) {
        ctx.postMessage({type: "progress", ...step.value} as WorkerOutbound);
        step = await gen.next();
      }
      ctx.postMessage({type: "done", update: step.value} as WorkerOutbound);
    }
  } catch (e) {
    ctx.postMessage({type: "error", message: (e as Error).message} as WorkerOutbound);
  }
});

ctx.postMessage({type: "ready"} as WorkerOutbound);