import {
  CAMPAIGN_REGIONS,
  CAMPAIGN_STAGE_ID_SET,
  FLAGSHIP_CARD_ID_SET,
  getCampaignStage,
} from "../../shared/cardGame.js";
import { getDb } from "../db.js";

export interface CampaignRewardConfig {
  stageId: string;
  points: number;
  shards: number;
  cardId: number | null;
  rewardId: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

type CampaignRewardInput = Pick<CampaignRewardConfig, "points" | "shards" | "cardId" | "rewardId">;

const localOverrides = new Map<string, CampaignRewardConfig>();

function boundedInteger(value: unknown, min: number, max: number, field: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new RangeError(`${field} must be an integer from ${min} to ${max}`);
  }
  return parsed;
}

function optionalText(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  if (!text || text.length > 255) throw new RangeError("rewardId must contain 1-255 characters");
  return text;
}

export function getDefaultCampaignReward(stageId: string): CampaignRewardConfig {
  const stage = getCampaignStage(stageId);
  if (!stage) throw new RangeError("Unknown campaign stage");
  const finalStar = stage.stars[stage.stars.length - 1];
  const shards =
    stage.type === "boss" ? 18 : stage.type === "elite" ? 10 : stage.type === "miniboss" ? 6 : 2;
  return {
    stageId,
    points: finalStar.gold,
    shards,
    cardId: stage.guaranteedDrop,
    rewardId: null,
    updatedBy: null,
    updatedAt: null,
  };
}

export function validateCampaignRewardInput(input: CampaignRewardInput): CampaignRewardInput {
  const points = boundedInteger(input.points, 0, 5000, "points");
  const shards = boundedInteger(input.shards, 0, 500, "shards");
  let cardId: number | null = null;
  if (input.cardId !== null && input.cardId !== undefined) {
    cardId = boundedInteger(input.cardId, 1, 420, "cardId");
    if (!FLAGSHIP_CARD_ID_SET.has(cardId))
      throw new RangeError("cardId must belong to the 100-card roster");
  }
  return { points, shards, cardId, rewardId: optionalText(input.rewardId) };
}

function rowToConfig(row: Record<string, unknown>): CampaignRewardConfig {
  return {
    stageId: String(row.stage_id),
    points: Number(row.points) || 0,
    shards: Number(row.shards) || 0,
    cardId: row.card_id === null || row.card_id === undefined ? null : Number(row.card_id),
    rewardId: row.reward_id ? String(row.reward_id) : null,
    updatedBy: row.updated_by ? String(row.updated_by) : null,
    updatedAt: row.updated_at ? new Date(String(row.updated_at)).toISOString() : null,
  };
}

export async function listCampaignRewardConfigs(): Promise<CampaignRewardConfig[]> {
  const merged = new Map<string, CampaignRewardConfig>();
  for (const region of CAMPAIGN_REGIONS) {
    for (const stage of region.stages) merged.set(stage.id, getDefaultCampaignReward(stage.id));
  }

  const database = getDb();
  if (database) {
    try {
      const result = await database.query<Record<string, unknown>>(
        `SELECT stage_id, points, shards, card_id, reward_id, updated_by, updated_at
         FROM campaign_stage_rewards ORDER BY stage_id`,
      );
      for (const row of result.rows) {
        const config = rowToConfig(row);
        if (CAMPAIGN_STAGE_ID_SET.has(config.stageId)) merged.set(config.stageId, config);
      }
    } catch (error) {
      console.warn("[campaign-rewards] Database read failed, using local defaults:", error);
    }
  }
  for (const [stageId, config] of localOverrides) merged.set(stageId, config);
  return [...merged.values()];
}

export async function getCampaignRewardConfig(stageId: string): Promise<CampaignRewardConfig> {
  if (!CAMPAIGN_STAGE_ID_SET.has(stageId)) throw new RangeError("Unknown campaign stage");
  const configs = await listCampaignRewardConfigs();
  return configs.find((config) => config.stageId === stageId) ?? getDefaultCampaignReward(stageId);
}

export async function upsertCampaignRewardConfig(
  stageId: string,
  input: CampaignRewardInput,
  updatedBy: string,
): Promise<CampaignRewardConfig> {
  if (!CAMPAIGN_STAGE_ID_SET.has(stageId)) throw new RangeError("Unknown campaign stage");
  const clean = validateCampaignRewardInput(input);
  const config: CampaignRewardConfig = {
    stageId,
    ...clean,
    updatedBy: updatedBy || "admin",
    updatedAt: new Date().toISOString(),
  };

  const database = getDb();
  if (database) {
    await database.query(
      `INSERT INTO campaign_stage_rewards
        (stage_id, points, shards, card_id, reward_id, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (stage_id) DO UPDATE SET
        points = EXCLUDED.points,
        shards = EXCLUDED.shards,
        card_id = EXCLUDED.card_id,
        reward_id = EXCLUDED.reward_id,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
       RETURNING stage_id`,
      [stageId, clean.points, clean.shards, clean.cardId, clean.rewardId, config.updatedBy],
    );
  } else {
    localOverrides.set(stageId, config);
  }
  return config;
}

export function resetCampaignRewardOverridesForTests(): void {
  localOverrides.clear();
}
