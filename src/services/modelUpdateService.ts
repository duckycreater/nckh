/**
 * ModelUpdateService - Client-side federated model pull
 *
 * Periodically (default every 24h) checks the BMO server for a newer
 * global model version and applies it via `onDeviceTrainer.applyGlobalUpdate`.
 *
 * Graceful fallback: if the server is unreachable, the local model is kept.
 *
 * UI hook: expose `currentVersion` so the PrivacyDashboard can render
 * "Model version v3 (trained from 12,450 global scans)".
 */

import { onDeviceTrainer } from "./onDeviceTrainer";

const API_BASE = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE_URL) || "";

export interface ModelVersionInfo {
  version: string;
  trainedOnSamples: number;
  participants: number;
  createdAt: number;
  scores: Record<string, number>;
}

const STORAGE_KEY = "bmo_model_version";
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h

class ModelUpdateService {
  private currentVersion: string | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  async loadFromStorage(): Promise<void> {
    try {
      const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) {
        const data = JSON.parse(raw);
        this.currentVersion = data.currentVersion || null;
      }
    } catch (e) {
      console.warn("[ModelUpdate] load failed:", e);
    }
  }

  saveToStorage(): void {
    try {
      if (typeof localStorage === "undefined") return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        currentVersion: this.currentVersion,
      }));
    } catch (e) {
      console.warn("[ModelUpdate] save failed:", e);
    }
  }

  async checkForUpdate(force = false): Promise<ModelVersionInfo | null> {
    try {
      const url = `${API_BASE}/api/federated/latest`;
      const r = await fetch(url, { method: "GET" });
      if (!r.ok) {
        console.warn("[ModelUpdate] server returned", r.status);
        return null;
      }
      const data: ModelVersionInfo = await r.json();
      if (!data?.version) return null;

      if (force || !this.currentVersion || data.version !== this.currentVersion) {
        onDeviceTrainer.applyGlobalUpdate(data.scores, data.version);
        this.currentVersion = data.version;
        this.saveToStorage();
        return data;
      }
      return null;
    } catch (e) {
      console.warn("[ModelUpdate] check failed:", e);
      return null;
    }
  }

  startAutoCheck(intervalMs = CHECK_INTERVAL_MS): void {
    if (this.timer) return;
    // First check after 30s (let app boot), then every interval.
    setTimeout(() => this.checkForUpdate().catch(() => {}), 30_000);
    this.timer = setInterval(() => {
      this.checkForUpdate().catch(() => {});
    }, intervalMs);
  }

  stopAutoCheck(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  getCurrentVersion(): string | null {
    return this.currentVersion;
  }

  setCurrentVersion(version: string | null): void {
    this.currentVersion = version;
    this.saveToStorage();
  }
}

export const modelUpdateService = new ModelUpdateService();