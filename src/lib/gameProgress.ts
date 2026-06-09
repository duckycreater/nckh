import { GameProgressData } from "../types";
import { WORLD_REGIONS, getRegionById } from "../data/worldLocations";

export const DEFAULT_GAME_PROGRESS: GameProgressData = {
  currentRegion: "vietnam_north",
  completedRegions: [],
  pollutionLevels: Object.fromEntries(WORLD_REGIONS.map((r) => [r.id, r.pollution])),
  unlockedChapters: [1],
  activeChapter: 1,
  visitedLocations: [],
  totalCleanedPoints: 0,
};

export function saveGameProgress(progress: GameProgressData): void {
  localStorage.setItem("game_progress", JSON.stringify(progress));
}

export function loadGameProgress(): GameProgressData {
  try {
    const raw = localStorage.getItem("game_progress");
    if (raw) {
      const parsed = JSON.parse(raw) as GameProgressData;
      return { ...DEFAULT_GAME_PROGRESS, ...parsed };
    }
  } catch {}
  return { ...DEFAULT_GAME_PROGRESS };
}

export function isRegionUnlocked(
  regionId: string,
  progress: GameProgressData,
  playerLevel: number,
  cardPower: number
): boolean {
  const region = getRegionById(regionId);
  if (!region) return false;
  const req = region.unlockRequirement;
  if (req.minLevel !== undefined && playerLevel < req.minLevel) return false;
  if (req.prevRegionId && !progress.completedRegions.includes(req.prevRegionId)) return false;
  if (req.minPower !== undefined && cardPower < req.minPower) return false;
  return true;
}

export function isChapterUnlocked(chapter: number, progress: GameProgressData): boolean {
  return progress.unlockedChapters.includes(chapter);
}

export function getRegionPollution(regionId: string, progress: GameProgressData): number {
  return progress.pollutionLevels[regionId] ?? 100;
}

export function cleanLocation(
  progress: GameProgressData,
  regionId: string,
  cleanBonus: number
): GameProgressData {
  const current = progress.pollutionLevels[regionId] ?? 100;
  const region = getRegionById(regionId);
  if (!region) return progress;

  const newPollution = Math.max(0, current - cleanBonus);
  const updatedPollution = { ...progress.pollutionLevels, [regionId]: newPollution };
  const updatedVisited = progress.visitedLocations.includes(regionId)
    ? progress.visitedLocations
    : [...progress.visitedLocations, regionId];

  const updatedProgress: GameProgressData = {
    ...progress,
    pollutionLevels: updatedPollution,
    visitedLocations: updatedVisited,
    totalCleanedPoints: progress.totalCleanedPoints + cleanBonus,
  };

  if (newPollution <= 0 && !progress.completedRegions.includes(regionId)) {
    updatedProgress.completedRegions = [...progress.completedRegions, regionId];
  }

  return updatedProgress;
}

export function addPollution(
  progress: GameProgressData,
  regionId: string,
  added: number
): GameProgressData {
  const region = getRegionById(regionId);
  if (!region) return progress;
  const current = progress.pollutionLevels[regionId] ?? 0;
  return {
    ...progress,
    pollutionLevels: {
      ...progress.pollutionLevels,
      [regionId]: Math.min(region.maxPollution, current + added),
    },
  };
}

export function unlockChapter(progress: GameProgressData, chapterId: number): GameProgressData {
  if (progress.unlockedChapters.includes(chapterId)) return progress;
  return {
    ...progress,
    unlockedChapters: [...progress.unlockedChapters, chapterId],
    activeChapter: chapterId,
  };
}

export function getOverallCleanPercent(progress: GameProgressData): number {
  const total = Object.values(progress.pollutionLevels).reduce((s, v) => s + v, 0);
  const max = WORLD_REGIONS.reduce((s, r) => s + r.maxPollution, 0);
  return Math.round(((max - total) / max) * 100);
}
