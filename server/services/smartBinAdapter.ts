/**
 * smartBinAdapter - Hardware abstraction layer for smart bin integration
 *
 * Phase 4 (prep) + Phase 5: every hardware vendor talks to BMO through
 * one of these adapters. The application never imports vendor SDKs
 * directly — it only consumes this interface.
 *
 * Today:
 *   - StubAdapter: estimates weight from scan count × average item weight
 *     (Vietnam-specific, see impactCalculator.AVG_WEIGHT_G)
 *   - HTTPAdapter: polls a vendor's REST endpoint (e.g., Envision, Bigbelly)
 *   - MQTTAdapter: subscribes to a broker topic (e.g., Sigfox, Actility)
 *
 * Future (Phase 5):
 *   - Add vendor-specific adapters (Deltalys, SmartBin, etc.) without
 *     touching the rest of the codebase.
 *
 * Contract: see /hardware/SMART_BIN_API.md for vendors implementing
 * new adapter types.
 */

import { AVG_WEIGHT_G, type ImpactCategory } from "./impactCalculator.js";

export interface SmartBinReading {
  deviceId: string;
  location?: string;
  timestamp: number;
  weightsByCategory: Partial<Record<ImpactCategory, number>>; // kg
  totalKg: number;
  batteryPercent?: number;
  isOnline: boolean;
}

export interface SmartBinAdapter {
  readonly adapterType: string;
  /** Fetch a single reading (latest snapshot). */
  getReading(deviceId: string): Promise<SmartBinReading>;
  /** Fetch all readings for a location/region. */
  getReadings(deviceIds: string[]): Promise<SmartBinReading[]>;
  /** Lightweight health check. */
  ping(deviceId: string): Promise<boolean>;
}

/**
 * StubAdapter — used when no real hardware is connected.
 * Estimates weight from scan count × average item weight.
 */
export class StubAdapter implements SmartBinAdapter {
  readonly adapterType = "stub";

  private scanCount: Map<string, Partial<Record<ImpactCategory, number>>> = new Map();

  recordScan(deviceId: string, category: ImpactCategory): void {
    const cur = this.scanCount.get(deviceId) || {};
    cur[category] = (cur[category] || 0) + 1;
    this.scanCount.set(deviceId, cur);
  }

  async getReading(deviceId: string): Promise<SmartBinReading> {
    const counts = this.scanCount.get(deviceId) || {};
    const weights: Partial<Record<ImpactCategory, number>> = {};
    let totalKg = 0;
    for (const cat of Object.keys(counts) as ImpactCategory[]) {
      const c = counts[cat] || 0;
      const kg = (c * AVG_WEIGHT_G[cat]) / 1000;
      weights[cat] = Math.round(kg * 1000) / 1000;
      totalKg += kg;
    }
    return {
      deviceId,
      timestamp: Date.now(),
      weightsByCategory: weights,
      totalKg: Math.round(totalKg * 1000) / 1000,
      batteryPercent: 100,
      isOnline: true,
    };
  }

  async getReadings(deviceIds: string[]): Promise<SmartBinReading[]> {
    return Promise.all(deviceIds.map((id) => this.getReading(id)));
  }

  async ping(_deviceId: string): Promise<boolean> {
    return true;
  }
}

/**
 * HTTPAdapter — polls a vendor's REST endpoint.
 * Vendor endpoints must follow the contract in hardware/SMART_BIN_API.md.
 */
export class HTTPAdapter implements SmartBinAdapter {
  readonly adapterType = "http_poll";

  constructor(private baseUrl: string, private apiKey?: string) {}

  private async fetchReading(deviceId: string): Promise<SmartBinReading> {
    const url = `${this.baseUrl}/devices/${encodeURIComponent(deviceId)}/reading`;
    const headers: Record<string, string> = {};
    if (this.apiKey) headers["x-api-key"] = this.apiKey;
    const r = await fetch(url, { method: "GET", headers });
    if (!r.ok) throw new Error(`HTTP adapter ${r.status}: ${await r.text()}`);
    const data = await r.json();
    return {
      deviceId,
      location: data.location,
      timestamp: data.timestamp || Date.now(),
      weightsByCategory: data.weights_by_category || {},
      totalKg: data.total_kg || 0,
      batteryPercent: data.battery_percent,
      isOnline: data.is_online ?? true,
    };
  }

  async getReading(deviceId: string): Promise<SmartBinReading> {
    return this.fetchReading(deviceId);
  }

  async getReadings(deviceIds: string[]): Promise<SmartBinReading[]> {
    return Promise.all(deviceIds.map((id) => this.fetchReading(id).catch(() => ({
      deviceId: id,
      timestamp: Date.now(),
      weightsByCategory: {},
      totalKg: 0,
      isOnline: false,
    }))));
  }

  async ping(deviceId: string): Promise<boolean> {
    try {
      const r = await fetch(`${this.baseUrl}/devices/${encodeURIComponent(deviceId)}/ping`, {
        method: "GET",
        headers: this.apiKey ? { "x-api-key": this.apiKey } : {},
      });
      return r.ok;
    } catch {
      return false;
    }
  }
}

/**
 * MQTTAdapter — stub for future broker integration.
 * Real implementation will use mqtt.js to subscribe to a topic and
 * cache the latest reading per device.
 */
export class MQTTAdapter implements SmartBinAdapter {
  readonly adapterType = "mqtt";

  constructor(private brokerUrl: string, private topicPrefix: string = "bmo/smartbin/") {}

  async getReading(_deviceId: string): Promise<SmartBinReading> {
    throw new Error("MQTT adapter not yet wired — see hardware/SMART_BIN_API.md");
  }

  async getReadings(_deviceIds: string[]): Promise<SmartBinReading[]> {
    throw new Error("MQTT adapter not yet wired — see hardware/SMART_BIN_API.md");
  }

  async ping(_deviceId: string): Promise<boolean> {
    return false;
  }
}

/**
 * Adapter registry. Looks up the right adapter for a device based on the
 * `smart_bin_devices.adapter_type` column.
 */
export class SmartBinRegistry {
  private adapters = new Map<string, SmartBinAdapter>();

  register(adapterType: string, adapter: SmartBinAdapter): void {
    this.adapters.set(adapterType, adapter);
  }

  get(adapterType: string): SmartBinAdapter {
    const a = this.adapters.get(adapterType);
    if (!a) throw new Error(`No adapter registered for type "${adapterType}"`);
    return a;
  }

  has(adapterType: string): boolean {
    return this.adapters.has(adapterType);
  }
}

export const smartBinRegistry = new SmartBinRegistry();
smartBinRegistry.register("stub", new StubAdapter());