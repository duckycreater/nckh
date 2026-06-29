/**
 * Neuromorphic Behavior Predictor - Browser client wrapper
 *
 * Talks to the BindsNET microservice. Predicts dropout 24h in advance
 * using a spiking neural network trained on user activity patterns.
 */

const SNN_BASE = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SNN_URL)
  || "http://localhost:8002";

export interface BehaviorFeatures {
  daily_sessions: number;
  streak_days: number;
  points_7d: number;
  badges_7d: number;
  novelty_score: number;
  last_active_hours: number;
  accuracy_7d: number;
  time_per_quiz_s: number;
  missed_days_7d: number;
  chat_messages_7d: number;
  classification_diversity: number;
  weekend_active: number;
}

export interface DropoutPrediction {
  dropout_probability: number;
  will_drop: boolean;
  confidence: number;
  spike_pattern: number[];
  recommended_intervention: string;
  explanation: string;
}

class BehaviorPredictor {
  private available: boolean | null = null;

  async isAvailable(): Promise<boolean> {
    if (this.available !== null) return this.available;
    try {
      const r = await fetch(`${SNN_BASE}/api/snn/health`);
      this.available = r.ok;
    } catch {
      this.available = false;
    }
    return this.available;
  }

  async predict(features: BehaviorFeatures, horizonHours = 24): Promise<DropoutPrediction | null> {
    if (!(await this.isAvailable())) return null;
    try {
      const r = await fetch(`${SNN_BASE}/api/snn/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features, horizon_hours: horizonHours }),
      });
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  }

  /**
   * Browser-side fallback: simple weighted heuristic
   */
  predictLocal(features: BehaviorFeatures): DropoutPrediction {
    let risk = 0;
    risk += Math.min(1, features.last_active_hours / 72) * 0.30;
    risk += Math.min(1, features.missed_days_7d / 5) * 0.30;
    risk += (1 - features.novelty_score) * 0.20;
    risk += (1 - Math.min(1, features.daily_sessions / 3)) * 0.20;
    risk = Math.min(1, risk);

    const interventions = [
      "Send encouraging message",
      "Offer bonus XP for next 3 sessions",
      "Suggest new game mode",
      "Invite to clan challenge",
      "Award surprise badge",
    ];

    return {
      dropout_probability: risk,
      will_drop: risk > 0.5,
      confidence: 0.6,
      spike_pattern: [],
      recommended_intervention: interventions[Math.floor(risk * interventions.length) % interventions.length],
      explanation: `Heuristic: inactivity=${features.last_active_hours}h, missed=${features.missed_days_7d}/7d`,
    };
  }
}

export const behaviorPredictor = new BehaviorPredictor();