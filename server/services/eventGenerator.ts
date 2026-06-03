/**
 * AI Event Generator v2 - A/B Gated + Mission Tracking
 *
 * Level 5 event system:
 * - Connects to A/B experiment (event_generation feature flag)
 * - Generates missions tracked per user in event_missions table
 * - Stores missions with completion tracking
 * - Persists generated events to generated_events table
 */

import { getDb } from "../db.js";
import { GoogleGenAI } from "@google/genai";
import { experimentEngine } from "./experimentEngine.js";

export interface GeneratedEvent {
  id?: number;
  eventName: string;
  eventTheme: string;
  description: string;
  missions: string[];
  bonusMultiplier: number;
  startDate: string;
  endDate: string;
  icon: string;
  color: string;
}

export interface EventMission {
  id?: number;
  eventId?: number;
  title: string;
  description: string;
  target: number;
  progress: number;
  reward: number;
  status: "active" | "completed" | "expired";
}

class EventGenerator {
  private db = getDb();
  private ai: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  /**
   * Generate event with A/B experiment gating.
   * Control group gets no event (fallback).
   */
  async generateWeeklyEvent(userId?: string): Promise<GeneratedEvent> {
    if (userId) {
      const inTreatment = await experimentEngine.hasFeature(userId, "event_generation");
      if (!inTreatment) {
        return this.getFallbackEvent();
      }
    }

    const themes = [
      "Plastic Crisis Week - Tuần Khủng Hoảng Nhựa",
      "Ocean Cleanup Day - Ngày Dọn Rác Đại Dương",
      "Green Transportation - Tuần Giao Thông Xanh",
      "Energy Saving Week - Tuần Tiết Kiệm Năng Lượng",
      "Composting Champion - Tuần Ủ Phân Hữu Cơ",
      "Zero Waste Lifestyle - Cuộc Sống Zero Waste",
      "E-Waste Awareness - Nhận Thức Rác Điện Tử",
      "Water Conservation - Tuần Bảo Tồn Nước",
    ];

    const selectedTheme = themes[Math.floor(Math.random() * themes.length)];

    if (this.ai) {
      try {
        const prompt = `Generate a detailed weekly environmental event for a gamified waste classification app in Vietnam.

Theme: "${selectedTheme}"

Generate 5 unique missions that users can complete during this week. Each mission should:
- Be achievable by students
- Be related to the theme
- Give distinct rewards
- Be fun and engaging

Also generate:
- An engaging event name (short, punchy, Vietnamese)
- A brief description (1-2 sentences)
- A bonus reward multiplier (1.2 to 3.0)
- A relevant emoji/icon
- A color theme (Tailwind CSS color names like emerald, blue, amber)
- Start date (today) and end date (7 days from today)

Respond ONLY in this JSON format (no markdown, no code blocks):
{
  "eventName": "Tên sự kiện",
  "eventTheme": "Theme name",
  "description": "Mô tả ngắn",
  "missions": ["Nhiệm vụ 1", "Nhiệm vụ 2", "Nhiệm vụ 3", "Nhiệm vụ 4", "Nhiệm vụ 5"],
  "bonusMultiplier": 1.5,
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "icon": "icon or emoji",
  "color": "color-name"
}`;

        const response = await this.ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ text: prompt }],
        });

        const text = response.text || "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const eventData = JSON.parse(jsonMatch[0]) as GeneratedEvent;
          const now = new Date();
          const end = new Date(now);
          end.setDate(end.getDate() + 7);
          eventData.startDate = now.toISOString().split("T")[0];
          eventData.endDate = end.toISOString().split("T")[0];

          const savedId = await this.saveGeneratedEvent(eventData);
          if (savedId) {
            eventData.id = savedId;
            // Also generate mission objects
            await this.generateMissionsForEvent(savedId, eventData.missions || []);
          }
          return eventData;
        }
      } catch (e) {
        console.warn("[EventGenerator] AI generation failed:", (e as Error).message);
      }
    }

    return this.getDefaultEvent(selectedTheme);
  }

  private async generateMissionsForEvent(eventId: number, missionTitles: string[]): Promise<void> {
    if (!this.db || missionTitles.length === 0) return;
    const rewards = [30, 50, 70, 100, 150]; // Escalating rewards
    for (let i = 0; i < missionTitles.length; i++) {
      const reward = rewards[i % rewards.length];
      try {
        await this.db.query(
          `INSERT INTO event_missions (event_id, user_id, title, description, target, progress, reward, status, expires_at)
           SELECT $1, user_id, $2, $3, 1, 0, $4, 'active', NOW() + INTERVAL '7 days'
           FROM research_users
           ON CONFLICT (event_id, user_id, title) DO NOTHING`,
          [eventId, missionTitles[i], `Hoàn thành: ${missionTitles[i]}`, reward]
        );
      } catch {
        // OK if some fail
      }
    }
  }

  private async saveGeneratedEvent(event: GeneratedEvent): Promise<number | null> {
    if (!this.db) return null;
    try {
      const { rows } = await this.db.query(
        `INSERT INTO generated_events (event_name, event_theme, description, missions, start_date, end_date)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [event.eventName, event.eventTheme, event.description, JSON.stringify(event.missions), event.startDate, event.endDate]
      );
      return rows[0]?.id || null;
    } catch (e) {
      console.warn("[EventGenerator] Failed to save event:", (e as Error).message);
      return null;
    }
  }

  private getFallbackEvent(): GeneratedEvent {
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    return {
      eventName: "Standard Week",
      eventTheme: " Bao ve moi truong",
      description: "Tuan nay co nhieu thu thach dang cho ban!",
      missions: [],
      bonusMultiplier: 1.0,
      startDate: now.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
      icon: "star",
      color: "emerald",
    };
  }

  private getDefaultEvent(theme: string): GeneratedEvent {
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 7);

    const defaultEvents: Record<string, GeneratedEvent> = {
      "Plastic Crisis Week - Tuần Khủng Hoảng Nhựa": {
        eventName: "Tuần Khủng Hoảng Nhựa",
        eventTheme: "Giam rac nhua",
        description: "Cung nhau hanh dong giam rac nhua trong tuan nay!",
        missions: [
          "Mang theo binh nuoc thay vi mua nuoc dong chai",
          "Tu choi ong hut nhua",
          "Nhat 5 manh rac nhua ngoai troi",
          "Chia se tip giam nhua len mang xa hoi",
          "Hoan thanh 10 lan quet rac bang AI",
        ],
        bonusMultiplier: 1.5,
        startDate: now.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
        icon: "bottle",
        color: "teal",
      },
    };

    const event = defaultEvents[theme] || {
      eventName: theme.split(" - ")[0],
      eventTheme: "Bao ve moi truong",
      description: "Tuan su kien dac biet da bat dau!",
      missions: ["Hoan thanh 5 thu thach", "Quet rac 10 lan", "Tham gia quiz", "Chia se voi ban be", "Hoan thanh tat ca"],
      bonusMultiplier: 1.5,
      startDate: now.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
      icon: "leaf",
      color: "emerald",
    };

    return event;
  }

  async getActiveEvent(): Promise<GeneratedEvent | null> {
    if (!this.db) return null;
    try {
      const { rows } = await this.db.query(
        `SELECT * FROM generated_events WHERE active = TRUE AND end_date >= CURRENT_DATE ORDER BY generated_at DESC LIMIT 1`
      );
      if (rows.length > 0) {
        const r = rows[0];
        return {
          id: r.id,
          eventName: r.event_name,
          eventTheme: r.event_theme,
          description: r.description,
          missions: typeof r.missions === "string" ? JSON.parse(r.missions) : (r.missions || []),
          bonusMultiplier: 1.5,
          startDate: r.start_date,
          endDate: r.end_date,
          icon: "star",
          color: "amber",
        };
      }
    } catch (e) {
      console.warn("[EventGenerator] Failed to get active event:", (e as Error).message);
    }
    return null;
  }

  async getRecentEvents(limit = 5): Promise<GeneratedEvent[]> {
    if (!this.db) return [];
    try {
      const { rows } = await this.db.query(
        `SELECT * FROM generated_events ORDER BY generated_at DESC LIMIT $1`,
        [limit]
      );
      return rows.map((r: any) => ({
        id: r.id,
        eventName: r.event_name,
        eventTheme: r.event_theme,
        description: r.description,
        missions: typeof r.missions === "string" ? JSON.parse(r.missions) : (r.missions || []),
        bonusMultiplier: 1.5,
        startDate: r.start_date,
        endDate: r.end_date,
        icon: "star",
        color: "amber",
      }));
    } catch {
      return [];
    }
  }

  async getUserMissions(userId: string): Promise<EventMission[]> {
    if (!this.db) return [];
    try {
      const { rows } = await this.db.query(
        `SELECT * FROM event_missions
         WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()
         ORDER BY id LIMIT 10`,
        [userId]
      );
      return rows.map((r: any) => ({
        id: r.id,
        eventId: r.event_id,
        title: r.title,
        description: r.description,
        target: r.target,
        progress: r.progress,
        reward: r.reward,
        status: r.status,
      }));
    } catch {
      return [];
    }
  }

  async updateMissionProgress(userId: string, missionTitle: string, increment = 1): Promise<EventMission | null> {
    if (!this.db) return null;
    try {
      const { rows } = await this.db.query(
        `UPDATE event_missions
         SET progress = LEAST(progress + $3, target),
             status = CASE WHEN progress + $3 >= target THEN 'completed' ELSE status END,
             completed_at = CASE WHEN progress + $3 >= target THEN NOW() ELSE completed_at END
         WHERE user_id = $1 AND title = $2 AND status = 'active'
         RETURNING *`,
        [userId, missionTitle, increment]
      );
      if (rows.length > 0) {
        const r = rows[0];
        return {
          id: r.id,
          eventId: r.event_id,
          title: r.title,
          description: r.description,
          target: r.target,
          progress: r.progress,
          reward: r.reward,
          status: r.status,
        };
      }
    } catch (e) {
      console.warn("[EventGenerator] Failed to update mission:", (e as Error).message);
    }
    return null;
  }
}

export const eventGenerator = new EventGenerator();
