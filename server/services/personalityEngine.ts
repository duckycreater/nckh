/**
 * Personality Engine - HCI Experiment System
 *
 * Randomly assigns 4 personality modes to users for controlled experiment.
 * Modes affect chatbot tone, dashboard messaging, and notification style.
 *
 * Research Design: Between-subjects experiment with random assignment.
 * Hypothesis: mentor + friendly modes will produce higher retention.
 */

import { getDb } from "../db.js";

export type PersonalityMode = "friendly" | "competitive" | "mentor" | "playful";

export const PERSONALITY_MODES: PersonalityMode[] = ["friendly", "competitive", "mentor", "playful"];

export const PERSONALITY_PROMPTS: Record<PersonalityMode, { systemPrompt: string; dashboardTone: string; leaderboardEmphasis: string; notificationStyle: string }> = {
  friendly: {
    systemPrompt: `Bạn là Robot Siêu Cấp Xanh, một chuyên gia thân thiện về bảo vệ môi trường. Bạn luôn vui vẻ, ấm áp và hay khen ngợi. Giao tiếp như một người bạn tốt, dùng emoji thân thiện, động viên mọi người bằng lời lẽ nhẹ nhàng. Luôn nhấn mạnh rằng mỗi nỗ lực nhỏ đều có ý nghĩa. Nếu được hỏi ngoài lề, hãy khéo léo lái câu chuyện về bảo vệ môi trường.`,
    dashboardTone: "warm",
    leaderboardEmphasis: "low",
    notificationStyle: "gentle",
  },
  competitive: {
    systemPrompt: `Bạn là Robot Siêu Cấp Xanh, một huấn luyện viên về bảo vệ môi trường. Bạn thích thử thách, so sánh thành tích và thúc đẩy người dùng vươn lên top. Hãy dùng ngôn ngữ thể thao, nhấn mạnh rankings, records, và competition. Khi người dùng hoàn thành việc gì, hãy so sánh với các top performers khác. Luôn đặt câu hỏi "Bạn có muốn trở thành số 1 không?". Nếu được hỏi ngoài lề, hãy khéo léo lái câu chuyện về bảo vệ môi trường.`,
    dashboardTone: "challenging",
    leaderboardEmphasis: "high",
    notificationStyle: "assertive",
  },
  mentor: {
    systemPrompt: `Bạn là Robot Siêu Cấp Xanh, một người thầy hiền từ về bảo vệ môi trường. Bạn giải thích tỉ mỉ, chia sẻ kiến thức sâu sắc và khuyến khích học hỏi. Hãy dùng ngôn ngữ giáo dục, đưa ra fun facts, giải thích tại sao mỗi hành động lại quan trọng. Khen ngợi có cụ thể, gợi ý có chiều sâu. Luôn hỏi "Bạn đã biết chưa?" trước khi giải thích. Nếu được hỏi ngoài lề, hãy khéo léo lái câu chuyện về bảo vệ môi trường.`,
    dashboardTone: "guiding",
    leaderboardEmphasis: "medium",
    notificationStyle: "informative",
  },
  playful: {
    systemPrompt: `Bạn là Robot Siêu Cấp Xanh, một nhân vật hoạt hình về bảo vệ môi trường. Bạn siêu vui nhộn, hay đùa, dùng meme language và slang. Nói chuyện như Gen-Z, không bao giờ nghiêm túc quá. Dùng thật nhiều emoji và internet slang như "bruh", "no cap", "fr fr". Make it fun! Nếu được hỏi ngoài lề, hãy khéo léo lái câu chuyện về bảo vệ môi trường.`,
    dashboardTone: "fun",
    leaderboardEmphasis: "low",
    notificationStyle: "casual",
  },
};

export const PERSONALITY_MESSAGES: Record<PersonalityMode, Record<string, string[]>> = {
  friendly: {
    welcome: [
      "Chào bạn yêu quý! Mình rất vui được gặp bạn hôm nay!",
      "Chào bạn! Hôm nay bạn đã làm gì tuyệt vời cho Trái Đất chưa?",
    ],
    streak_encourage: [
      "Bạn ơi, {streak} ngày rồi! Mình tự hào lắm!",
      "Wow, {streak} ngày liên tiếp! Bạn là người tuyệt vời!",
    ],
    low_engagement: [
      "Này bạn ơi! Mình nhớ bạn rồi đấy! Quay lại chơi với mình nhé!",
      "Trái Đất đang cần bạn! Mình có gì mới để chia sẻ đó!",
    ],
    achievement: [
      "CHUC MUNG! Ban lam duoc roi! That amazing!",
      "Bạn giỏi lắm! Mình biết bạn làm được mà!",
    ],
  },
  competitive: {
    welcome: [
      "Day lai thu ky! Thu choi bat dau! Coi chung minh top may?",
      "Chao chiến binh! Cam on ban da quay lai! Hnay co gi de bat ca top?",
    ],
    streak_encourage: [
      "{streak} ngay! That streak is FIRE! Ban co muon gap doi khong?",
      "{streak} day streak! Ban dang o lop nao? Top 10 chua?",
    ],
    low_engagement: [
      "Ban dang deo top roi! Gap 3 ngay roi, con cho gi nua?",
      "Co gi day? Ban bi cut chua? Gap gap, comeback strong!",
    ],
    achievement: [
      "NEW RECORD! Ban da pha world record! That is GOATED!",
      "Voi {score} diem, ban dang thu {rank} tren bang xep hang!",
    ],
  },
  mentor: {
    welcome: [
      "Chào bạn! Hôm nay mình sẽ cùng bạn khám phá thêm về bảo vệ môi trường nhé.",
      "Chào bạn! Bạn đã biết chưa, một hành động nhỏ mỗi ngày có thể tạo ra thay đổi lớn?",
    ],
    streak_encourage: [
      "Bạn đã duy trì {streak} ngày liên tiếp. Đây là minh chứng cho sự kiên trì của bạn.",
      "Với {streak} ngày, bạn đã tích lũy được một thói quen thực sự. Khoa học cho thấy 21 ngày tạo nên một thói quen.",
    ],
    low_engagement: [
      "Mình nhận thấy bạn chưa vào đây vài ngày. Có điều gì khiến bạn khó duy trì thói quen không?",
      "Nghiên cứu về habit formation cho thấy: việc bỏ lỡ 1-2 ngày không có nghĩa là thất bại. Hãy bắt đầu lại ngay hôm nay!",
    ],
    achievement: [
      "Xuất sắc! Thành tích của bạn cho thấy bạn đang thực sự hiểu về phân loại rác thải.",
      "Bạn đã đạt được mốc {score} điểm. Đây là kết quả của việc học hỏi liên tục.",
    ],
  },
  playful: {
    welcome: [
      "Yooo! Ban ve roi a! Lmao minh nho ban qua!",
      "BRUHHH! Finally someone showed up! LFG!",
    ],
    streak_encourage: [
      "{streak} NGAY?? Bro fr fr ban la legend! No cap!",
      "Streak {streak} nè! Ban la alien a? That is crazy!",
    ],
    low_engagement: [
      "Bruh... ban disappear lau qua vậy? Trái Đất đang gọi nè!",
      "Hello??? Ayo co ai khong? Minh nhan duoc tin hieu... just vibes!",
    ],
    achievement: [
      "YOOOOOOO {score} DIEM?!?!?! Bro ban OP vl! Fr fr!",
      "NAEH! Ban lam duoc roi! Mlem mlem! That was lowkey insane!",
    ],
  },
};

class PersonalityEngine {
  private db = getDb();

  async assignPersonality(userId: string, roundId = 1): Promise<PersonalityMode> {
    const mode = PERSONALITY_MODES[Math.floor(Math.random() * PERSONALITY_MODES.length)];
    if (!this.db) return mode;

    try {
      await this.db.query(
        `INSERT INTO personality_assignments (user_id, personality_mode, round_id, current_round)
         VALUES ($1, $2, $3, $3)
         ON CONFLICT (user_id) DO UPDATE SET personality_mode = $2, round_id = $3, current_round = $3`,
        [userId, mode, roundId]
      );
    } catch (e) {
      console.warn("[PersonalityEngine] Failed to assign:", (e as Error).message);
    }
    return mode;
  }

  async getPersonality(userId: string): Promise<PersonalityMode> {
    if (!this.db) return "friendly";
    try {
      const { rows } = await this.db.query(
        `SELECT personality_mode FROM personality_assignments WHERE user_id = $1`,
        [userId]
      );
      return (rows[0]?.personality_mode as PersonalityMode) || "friendly";
    } catch {
      return "friendly";
    }
  }

  async reassignPersonality(userId: string, newMode: PersonalityMode, newRoundId: number): Promise<void> {
    if (!this.db) return;
    try {
      await this.db.query(
        `UPDATE personality_assignments SET personality_mode = $1, round_id = $2, current_round = $2 WHERE user_id = $3`,
        [newMode, newRoundId, userId]
      );
    } catch (e) {
      console.warn("[PersonalityEngine] Failed to reassign:", (e as Error).message);
    }
  }

  getPrompt(mode: PersonalityMode): string {
    return PERSONALITY_PROMPTS[mode]?.systemPrompt || PERSONALITY_PROMPTS.friendly.systemPrompt;
  }

  getDashboardTone(mode: PersonalityMode): string {
    return PERSONALITY_PROMPTS[mode]?.dashboardTone || "warm";
  }

  getLeaderboardEmphasis(mode: PersonalityMode): string {
    return PERSONALITY_PROMPTS[mode]?.leaderboardEmphasis || "low";
  }

  getNotificationStyle(mode: PersonalityMode): string {
    return PERSONALITY_PROMPTS[mode]?.notificationStyle || "gentle";
  }

  getMessage(mode: PersonalityMode, key: string, params: Record<string, string | number> = {}): string {
    const messages = PERSONALITY_MESSAGES[mode]?.[key] || PERSONALITY_MESSAGES.friendly[key] || [""];
    let msg = messages[Math.floor(Math.random() * messages.length)];
    for (const [k, v] of Object.entries(params)) {
      msg = msg.replace(`{${k}}`, String(v));
    }
    return msg;
  }

  async getModeDistribution(): Promise<Record<PersonalityMode, number>> {
    if (!this.db) return { friendly: 0, competitive: 0, mentor: 0, playful: 0 };
    try {
      const { rows } = await this.db.query(
        `SELECT personality_mode, COUNT(*) as count FROM personality_assignments GROUP BY personality_mode`
      );
      const dist: Record<PersonalityMode, number> = { friendly: 0, competitive: 0, mentor: 0, playful: 0 };
      for (const r of rows) {
        dist[r.personality_mode as PersonalityMode] = parseInt(r.count);
      }
      return dist;
    } catch {
      return { friendly: 0, competitive: 0, mentor: 0, playful: 0 };
    }
  }
}

export const personalityEngine = new PersonalityEngine();
