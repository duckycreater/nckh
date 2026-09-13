import {
  CAMPAIGN_REGIONS,
  getCampaignRegion,
  getCampaignStage,
  type CampaignStageDefinition,
} from "../../shared/cardGame";

export const REGIONS = CAMPAIGN_REGIONS;

export function getRegionById(id: string) {
  return getCampaignRegion(id);
}

export function getStageById(regionId: string, stageId: string) {
  const region = getCampaignRegion(regionId);
  const stage = getCampaignStage(stageId);
  return stage && region?.stages.some((candidate) => candidate.id === stage.id) ? stage : undefined;
}

export function getTotalStages(): number {
  return REGIONS.reduce((total, region) => total + region.stages.length, 0);
}

export function getTotalStars(): number {
  return getTotalStages() * 3;
}

export function getStageReward(
  stage: CampaignStageDefinition,
  starIndex: number,
): { xp: number; gold: number } {
  const index = Math.max(0, Math.min(stage.stars.length - 1, Math.trunc(starIndex)));
  return stage.stars[index];
}
