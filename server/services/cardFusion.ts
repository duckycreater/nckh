/**
 * Card Fusion System
 *
 * Ghép 2 cards thường cùng loại → 1 card hiếm (30% success)
 * Ghép 3 cards hiếm cùng loại → 1 card legendary (20% success)
 *
 * Fusion events: scheduled 1x/tuần (weekend)
 * - Tăng engagement spike khi fusion opens
 * - Post-fusion dopamine: success animation hoặc "try again" với consolation
 *
 * Card Lore: Mỗi card có environmental fact
 * - Educational value: học sinh đọc lore khi tap card
 *
 * Scientific basis:
 * - Variable Reinforcement Schedule (Skinner): Fusion success is probabilistic
 * - Self-Determination Theory (Deci & Ryan): Collection completion drives competence need
 * - Novelty Decay prevention: Weekly fusion event re-engages users
 */

import { getDb } from "../db.js";
import { eventLogger } from "./eventLogger.js";

export type CardRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface FusionableCard {
  odCardId: string;
  odCardName: string;
  odElement: string;
  odRarity: CardRarity;
  odCount: number;  // how many copies user owns
  odDuplicates: number;  // how many are "extra" (beyond 1)
}

export interface FusionAttempt {
  odUserId: string;
  odMaterialCards: string[];  // card IDs used
  odTargetRarity: CardRarity;
  odSuccess: boolean;
  odResultCardId: string | null;
  odFusionEventId: string;
  odTimestamp: Date;
}

export interface FusionResult {
  success: boolean;
  resultCardId: string | null;
  resultCardName: string;
  resultRarity: CardRarity;
  resultEmoji: string;
  lore: string;
  consolationPoints: number;
  fusionXP: number;
  newAchievement: string | null;
}

export interface FusionEvent {
  odEventId: string;
  odStartDate: Date;
  odEndDate: Date;
  odActive: boolean;
  odBonus: number;  // extra success rate bonus (e.g., 0.1 = +10%)
  odTheme: string;   // e.g., "earth_day", "ocean_week"
}

// Success rates (can be boosted by fusion events)
const BASE_SUCCESS_RATES: Record<CardRarity, number> = {
  common: 0.30,    // 2 commons → 1 rare
  rare: 0.20,      // 2 rares → 1 epic
  epic: 0.15,     // 3 epics → 1 legendary
  legendary: 0,   // cannot fuse legendary
  uncommon: 0.25,
};

const FUSION_CARDS_REQUIRED: Record<CardRarity, number> = {
  common: 2,
  rare: 2,
  epic: 3,
  legendary: 0,
  uncommon: 2,
};

const FUSION_XP_REWARD: Record<CardRarity, number> = {
  common: 50,
  rare: 100,
  epic: 200,
  legendary: 500,
  uncommon: 75,
};

const CONSOLATION_POINTS: Record<CardRarity, number> = {
  common: 20,
  rare: 40,
  epic: 80,
  legendary: 0,
  uncommon: 30,
};

const CARD_LORE: Record<string, string> = {
  // PLASTIC LORE
  "card_001": "Một chai nhựa PET mất 450 năm để phân hủy. Tuy nhiên, PET có thể tái chế thành sợi vải áo phông!",
  "card_002": "Túi nilon dùng trung bình 12 phút nhưng tồn tại 400 năm. Một chiếc túi tái sử dụng có thể thay thế hàng nghìn túi nilon.",
  "card_003": "Ống hút nhựa là vật dụng dùng ngắn nhất — chỉ 20 phút — nhưng phân hủy mất 200 năm.",
  "card_004": "Nắp chai nhựa thường bị lãng phí nhưng có thể tái chế thành pallet gỗ nhựa (plastic lumber).",
  "card_005": "Hộp cơm nhựa dùng một lần chiếm 30% rác thải nhựa tại trường học. Dùng hộp cơm inox giúp giảm 90% rác.",
  // PAPER LORE
  "card_031": "Một cây gỗ cho ra ~17 ream giấy A4. Tái chế 1 tấn giấy tiết kiệm 17 cây gỗ và 26,000 lít nước.",
  "card_033": "Sách giáo khoa cũ có thể được tặng lại hoặc bán cho các bạn khóa dưới, giảm 40% chi phí sách mới.",
  "card_036": "Giấy ghi chú màu thường chứa hóa chất tẩy trắng. Giấy tái chế màu an toàn hơn cho sức khỏe.",
  "card_040": "Truyện tranh cũ có thể trao đổi với bạn bè hoặc quyên góp thư viện — giúp sách sống lâu hơn.",
  // GLASS LORE
  "card_061": "Thủy tinh có thể tái chế 100% vô hạn lần mà không mất chất lượng. Một chai tái chế tiết kiệm đủ năng lượng để thắp sáng bóng đèn LED trong 4 giờ.",
  "card_065": "Chai nước ngọt thủy tinh có tuổi thọ vô hạn. Nếu dùng chai thủy tinh tái sử dụng, bạn giảm 67% carbon footprint so với chai nhựa.",
  "card_066": "Lọ thí nghiệm trường học chứa hóa chất — không bỏ vào thùng tái chế. Cần xử lý đặc biệt tại điểm thu gom rác nguy hại.",
  // METAL LORE
  "card_091": "Lon nhôm có thể tái chế chỉ trong 60 ngày! Tái chế 1 lon nhôm tiết kiệm đủ năng lượng để chạy TV trong 3 giờ.",
  "card_093": "Nắp chai sắt cần xử lý riêng vì kích thước nhỏ dễ lọt qua máy tái chế. Gom nắp rồi bỏ vào lọ đựng riêng.",
  "card_097": "Kem tiêm là rác y tế — không được bỏ vào thùng thường. Trường học cần có thùng rác y tế riêng.",
  // ORGANIC LORE
  "card_121": "Vỏ rau củ quả có thể ủ thành phân compost trong 2-3 tuần. Phân compost tự làm giàu đất và giảm 30% rác thải hữu cơ.",
  "card_124": "Thức ăn thừa chiếm 40% rác thải tại trường học. Ăn hết phần ăn giúp giảm carbon footprint đáng kể.",
  "card_127": "Trái cây thừa có thể ủ thành nước giải khát lên men (kombucha) hoặc làm mứt — biến rác thành vàng!",
  // HAZARD LORE
  "card_151": "Một viên pin AAA chứa đủ kim loại nặng để ô nhiễm 167,000 lít nước. Pin luôn cần xử lý tại điểm thu rác nguy hại.",
  "card_155": "Bóng đèn huỳnh quang chứa thủy ngân — nếu vỡ cần rời khỏi phòng ngay và không quét, dùng chổi lông.",
  "card_159": "Thuốc hết hạn cần mang đến nhà thuốc có chương trình thu hồi, không bỏ vào rác thường để tránh ô nhiễm nguồn nước.",
  // DEFAULT LORE
  "default": "Mỗi vật dụng đều có câu chuyện vòng đời. Hãy suy nghĩ trước khi vứt — có thể tái sử dụng, sửa chữa, hoặc trao đổi không?",
};

const RARITY_EMOJI: Record<CardRarity, string> = {
  common: "⚪",
  uncommon: "🟢",
  rare: "🔵",
  epic: "🟣",
  legendary: "🟡",
};

function getLoreForCard(cardId: string): string {
  return CARD_LORE[cardId] || CARD_LORE["default"];
}

function rarityAbove(current: CardRarity): CardRarity {
  const order: CardRarity[] = ["common", "uncommon", "rare", "epic", "legendary"];
  const idx = order.indexOf(current);
  return idx < order.length - 1 ? order[idx + 1] : "legendary";
}

class CardFusion {
  private db = getDb();

  /**
   * Get available cards for fusion.
   */
  async getFusionableCards(userId: string): Promise<FusionableCard[]> {
    if (!this.db) return [];
    try {
      const { rows } = await this.db.query(
        `SELECT card_id, card_name, element, rarity, COUNT(*) as count
         FROM user_cards
         WHERE user_id = $1
         GROUP BY card_id, card_name, element, rarity
         HAVING COUNT(*) >= 2
         ORDER BY rarity DESC, card_name ASC`,
        [userId]
      );
      return rows.map((r) => ({
        odCardId: r.card_id,
        odCardName: r.card_name,
        odElement: r.element,
        odRarity: r.rarity as CardRarity,
        odCount: parseInt(r.count),
        odDuplicates: parseInt(r.count) - 1,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Attempt a fusion.
   * @param userId - User performing fusion
   * @param cardId - Card ID to fuse (must have 2+ copies)
   * @param fusionEventId - ID of current fusion event (optional)
   */
  async attemptFusion(
    userId: string,
    cardId: string,
    fusionEventId?: string
  ): Promise<FusionResult> {
    // Get card info
    const card = await this.getCardInfo(cardId);
    if (!card) {
      return this.failureResult("Card not found", "common");
    }

    if (card.odRarity === "legendary") {
      return this.failureResult("Legendary cards cannot be fused", "legendary");
    }

    if (card.odDuplicates < FUSION_CARDS_REQUIRED[card.odRarity]) {
      return this.failureResult(
        `Need ${FUSION_CARDS_REQUIRED[card.odRarity]} copies to fuse`,
        card.odRarity
      );
    }

    // Calculate success rate
    let successRate = BASE_SUCCESS_RATES[card.odRarity] || 0.2;

    // Apply fusion event bonus if active
    if (fusionEventId) {
      const eventBonus = await this.getEventBonus(fusionEventId);
      successRate = Math.min(0.9, successRate + eventBonus);
    }

    // Roll for success
    const roll = Math.random();
    const success = roll < successRate;

    const resultRarity = rarityAbove(card.odRarity);

    if (success) {
      // Success: consume fusion materials, create result card
      await this.consumeFusionMaterials(userId, cardId, card.odRarity);
      const resultCardId = await this.createResultCard(userId, card, resultRarity);

      // Log
      await this.logFusion(userId, [cardId], resultRarity, true, resultCardId, fusionEventId);

      // Get lore for result
      const lore = getLoreForCard(resultCardId);
      const fusionXP = FUSION_XP_REWARD[resultRarity];

      // Check for achievement
      const achievement = await this.checkFusionAchievement(userId, resultRarity);

      return {
        success: true,
        resultCardId,
        resultCardName: card.odCardName,
        resultRarity,
        resultEmoji: RARITY_EMOJI[resultRarity],
        lore,
        consolationPoints: 0,
        fusionXP,
        newAchievement: achievement,
      };
    } else {
      // Failure: consume materials, give consolation
      await this.consumeFusionMaterials(userId, cardId, card.odRarity);
      const consolation = CONSOLATION_POINTS[card.odRarity];
      const lore = `Lần này chưa thành công, nhưng đừng nản lòng! Xác suất thành công là ${Math.round(successRate * 100)}%. Thử lại vào tuần sau nhé!`;

      await this.logFusion(userId, [cardId], card.odRarity, false, null, fusionEventId);

      return {
        success: false,
        resultCardId: null,
        resultCardName: card.odCardName,
        resultRarity,
        resultEmoji: "❌",
        lore,
        consolationPoints: consolation,
        fusionXP: 10,
        newAchievement: null,
      };
    }
  }

  /**
   * Get current active fusion event.
   */
  async getActiveEvent(): Promise<FusionEvent | null> {
    // Fusion events run every weekend (Saturday 0:00 to Sunday 23:59)
    const now = new Date();
    const day = now.getDay(); // 0=Sunday, 6=Saturday

    // Active every Saturday-Sunday
    if (day === 0 || day === 6) {
      const theme = day === 0 ? "Sunday Special" : "Saturday Fusion";
      const startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);

      return {
        odEventId: `fusion_${now.toISOString().split("T")[0]}`,
        odStartDate: startDate,
        odEndDate: endDate,
        odActive: true,
        odBonus: 0.10, // +10% success rate on weekends
        odTheme: theme,
      };
    }

    // Check for special events (e.g., Earth Day, World Environment Day)
    const monthDay = `${now.getMonth() + 1}-${now.getDate()}`;
    const specialEvents: Record<string, { bonus: number; theme: string }> = {
      "4-22": { bonus: 0.25, theme: "Earth Day Special" },    // April 22
      "6-5": { bonus: 0.25, theme: "World Environment Day" }, // June 5
      "6-8": { bonus: 0.20, theme: "Ocean Day" },             // June 8
      "11-15": { bonus: 0.20, theme: "Recycling Day" },       // Nov 15
    };

    const special = specialEvents[monthDay];
    if (special) {
      return {
        odEventId: `fusion_special_${monthDay}`,
        odStartDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
        odEndDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
        odActive: true,
        odBonus: special.bonus,
        odTheme: special.theme,
      };
    }

    return null;
  }

  private async getCardInfo(cardId: string): Promise<{ odCardName: string; odElement: string; odRarity: CardRarity; odDuplicates: number } | null> {
    // This would normally query user_cards table
    // For now, return a placeholder that the integration layer can fill
    return null;
  }

  private async consumeFusionMaterials(userId: string, cardId: string, rarity: CardRarity): Promise<void> {
    const count = FUSION_CARDS_REQUIRED[rarity];
    if (!this.db) return;
    try {
      await this.db.query(
        `DELETE FROM user_cards
         WHERE user_id = $1 AND card_id = $2
         ORDER BY created_at DESC
         LIMIT $3`,
        [userId, cardId, count]
      );
    } catch (e) {
      console.warn("[CardFusion] Failed to consume materials:", (e as Error).message);
    }
  }

  private async createResultCard(
    userId: string,
    baseCard: { odCardName: string; odElement: string },
    resultRarity: CardRarity
  ): Promise<string> {
    if (!this.db) return `result_${Date.now()}`;
    try {
      // Create a "fusion result" card with same name but higher rarity
      const resultCardId = `fusion_${resultRarity}_${Date.now()}`;
      await this.db.query(
        `INSERT INTO user_cards (user_id, card_id, card_name, element, rarity, source, created_at)
         VALUES ($1, $2, $3, $4, $5, 'fusion', NOW())`,
        [userId, resultCardId, baseCard.odCardName, baseCard.odElement, resultRarity]
      );
      return resultCardId;
    } catch (e) {
      console.warn("[CardFusion] Failed to create result card:", (e as Error).message);
      return `result_${resultRarity}_${Date.now()}`;
    }
  }

  private async logFusion(
    userId: string,
    materialCards: string[],
    rarity: CardRarity,
    success: boolean,
    resultCardId: string | null,
    eventId: string | undefined
  ): Promise<void> {
    if (!this.db) return;
    try {
      await eventLogger.log(userId, "fusion_attempt", {
        materials: materialCards,
        rarity,
        success,
        resultCardId,
        eventId,
      });
    } catch (e) {
      console.warn("[CardFusion] Failed to log:", (e as Error).message);
    }
  }

  private async getEventBonus(eventId: string): Promise<number> {
    // Check if event exists and return bonus
    const event = await this.getActiveEvent();
    return event?.odBonus || 0;
  }

  private async checkFusionAchievement(userId: string, rarity: CardRarity): Promise<string | null> {
    const achievements: Partial<Record<CardRarity, string>> = {
      rare: "first_rare_fusion",
      epic: "first_epic_fusion",
      legendary: "legendary_fusion_master",
    };
    const achievement = achievements[rarity];
    if (!achievement) return null;

    // Check if user already has this achievement
    if (!this.db) return achievement;
    try {
      const { rows } = await this.db.query(
        `SELECT 1 FROM user_achievements WHERE user_id = $1 AND achievement_id = $2`,
        [userId, achievement]
      );
      if (rows.length === 0) {
        await this.db.query(
          `INSERT INTO user_achievements (user_id, achievement_id, earned_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT DO NOTHING`,
          [userId, achievement]
        );
        return achievement;
      }
    } catch {
      // Ignore
    }
    return null;
  }

  private failureResult(message: string, rarity: CardRarity): FusionResult {
    return {
      success: false,
      resultCardId: null,
      resultCardName: message,
      resultRarity: rarity,
      resultEmoji: "❌",
      lore: message,
      consolationPoints: 0,
      fusionXP: 0,
      newAchievement: null,
    };
  }
}

export const cardFusion = new CardFusion();
