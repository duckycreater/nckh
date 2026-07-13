/**
 * useFederatedTraining.ts — React hook that owns a dedicated
 * federated worker and exposes a tiny API to the UI:
 *
 *   - queueSample(sample)  : append a new training sample
 *   - submitIfReady()      : every Nth sample, run a training round
 *   - stats                : { contributed, queueLength, lastEpochLoss, … }
 *
 * The hook never blocks the React tree — work happens in a Worker.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type LocalUpdate,
  type TrainingSample,
} from "../services/federatedTypes";
import type {WorkerInbound, WorkerOutbound} from "../workers/federatedWorker";

const TRIGGER_EVERY = 50; // plan §3: train after every 50 valid scans

interface Stats {
  contributed: number;
  queueLength: number;
  lastEpochLoss: number | null;
  lastSubmittedAt: number | null;
  running: boolean;
  error: string | null;
}

const API_BASE =
  (typeof import.meta !== "undefined" && (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL) || "";

interface Options {
  clipNorm?: number;
  sigma?: number;
  epochs?: number;
  endpoint?: string;
}

export function useFederatedTraining(opts: Options = {}) {
  const {
    clipNorm = 1.0,
    sigma = 0.05,
    epochs = 1,
    endpoint = "/api/federated/submit",
  } = opts;

  const [stats, setStats] = useState<Stats>({
    contributed: 0,
    queueLength: 0,
    lastEpochLoss: null,
    lastSubmittedAt: null,
    running: false,
    error: null,
  });

  const workerRef = useRef<Worker | null>(null);
  const queueRef = useRef<TrainingSample[]>([]);

  useEffect(() => {
    if (typeof Worker === "undefined") return; // SSR / tests

    const worker = new Worker(
      new URL("../workers/federatedWorker.ts", import.meta.url),
      {type: "module"},
    );

    const onMessage = (event: MessageEvent<WorkerOutbound>) => {
      const msg = event.data;
      if (msg.type === "progress") {
        setStats((s) => ({...s, lastEpochLoss: msg.loss}));
      } else if (msg.type === "done") {
        void submitUpdate(msg.update);
      } else if (msg.type === "error") {
        setStats((s) => ({...s, running: false, error: msg.message}));
      }
    };

    worker.addEventListener("message", onMessage);
    workerRef.current = worker;
    return () => {
      worker.removeEventListener("message", onMessage);
      worker.terminate();
      workerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const queueSample = useCallback((sample: TrainingSample) => {
    queueRef.current.push(sample);
    setStats((s) => ({...s, queueLength: queueRef.current.length}));
  }, []);

  const submitIfReady = useCallback(() => {
    if (queueRef.current.length < TRIGGER_EVERY) return false;
    const samples = queueRef.current.splice(0, TRIGGER_EVERY);
    setStats((s) => ({...s, queueLength: queueRef.current.length, running: true}));
    const w = workerRef.current;
    if (!w) {
      setStats((s) => ({...s, running: false, error: "Worker unavailable"}));
      return false;
    }
    const start: WorkerInbound = {type: "start", samples, epochs, clipNorm, sigma};
    w.postMessage(start);
    return true;
  }, [clipNorm, epochs, sigma]);

  async function submitUpdate(update: LocalUpdate): Promise<void> {
    try {
      const token = typeof localStorage !== "undefined" ? (localStorage.getItem("bmo_token") || "") : "";
      const r = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? {Authorization: `Bearer ${token}`} : {}),
        },
        body: JSON.stringify(update),
      });
      const ok = r.ok;
      setStats((s) => ({
        ...s,
        contributed: s.contributed + (ok ? 1 : 0),
        running: false,
        lastSubmittedAt: Date.now(),
        error: ok ? null : `HTTP ${r.status}`,
      }));
    } catch (e) {
      setStats((s) => ({...s, running: false, error: (e as Error).message}));
    }
  }

  const flush = useCallback(() => {
    return submitIfReady();
  }, [submitIfReady]);

  return {stats, queueSample, submitIfReady, flush};
}