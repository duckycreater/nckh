/**
 * Causal Reasoning Client - Browser side wrapper for DoWhy microservice
 *
 * Breakthrough: bring Pearl-style "why" reasoning into the BMO Robot app.
 * Use cases:
 *   - Why did this student drop off? (counterfactual)
 *   - Which interventions actually CAUSE retention? (vs correlation)
 *   - Live teacher dashboard showing causal ATE per mechanic
 */

const CAUSAL_BASE = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_CAUSAL_URL)
  || "http://localhost:8001";

export interface CausalEdge {
  from: string;
  to: string;
}

export interface CausalGraph {
  edges: CausalEdge[];
  nodes: string[];
  method: string;
  adj_matrix: number[][];
}

export interface ATEResult {
  ate: number;
  confidence_interval: [number, number];
  method: string;
  p_value: number;
  interpretation: string;
}

export interface CounterfactualResult {
  factual_outcome: number;
  counterfactual_outcome: number;
  treatment_effect: number;
  explanation: string;
}

class CausalReasoning {
  private available: boolean | null = null;

  async isAvailable(): Promise<boolean> {
    if (this.available !== null) return this.available;
    try {
      const r = await fetch(`${CAUSAL_BASE}/api/causal/health`);
      this.available = r.ok;
    } catch {
      this.available = false;
    }
    return this.available;
  }

  async discover(
    data: Record<string, any>[],
    method: "pc" | "ges" | "lingam" = "pc",
    alpha = 0.05
  ): Promise<CausalGraph | null> {
    if (!(await this.isAvailable())) return null;
    try {
      const r = await fetch(`${CAUSAL_BASE}/api/causal/discover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, method, alpha }),
      });
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  }

  async estimate(
    data: Record<string, any>[],
    treatment: string,
    outcome: string,
    options: { common_causes?: string[]; instruments?: string[]; effect_modifiers?: string[] } = {}
  ): Promise<ATEResult | null> {
    if (!(await this.isAvailable())) return null;
    try {
      const r = await fetch(`${CAUSAL_BASE}/api/causal/estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data,
          treatment,
          outcome,
          ...options,
          method: "backdoor.linear_regression",
        }),
      });
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  }

  async counterfactual(
    userData: Record<string, any>,
    intervention: Record<string, number>,
    outcome: string
  ): Promise<CounterfactualResult | null> {
    if (!(await this.isAvailable())) return null;
    try {
      const r = await fetch(`${CAUSAL_BASE}/api/causal/counterfactual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_data: userData, intervention, outcome }),
      });
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  }

  async getBMOPresets() {
    if (!(await this.isAvailable())) return null;
    try {
      const r = await fetch(`${CAUSAL_BASE}/api/causal/presets/bmo`);
      return r.ok ? await r.json() : null;
    } catch {
      return null;
    }
  }
}

export const causalReasoning = new CausalReasoning();