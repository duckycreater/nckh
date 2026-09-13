import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ChevronRight, Lock, ShieldCheck, Sparkles, Star, X, Zap } from "lucide-react";
import { REGIONS } from "../data/worldMap";
import type { CampaignRegionDefinition, CampaignStageDefinition } from "../../shared/cardGame";

interface WorldMapProps {
  playerLevel: number;
  unlockedRegions: string[];
  currentRegion: string;
  campaignStars?: Record<string, number>;
  campaignClaims?: string[];
  onSelectRegion: (regionId: string, stageId: string) => void;
  onBack: () => void;
}

function stageLabel(stage: CampaignStageDefinition, index: number, t: TFunction) {
  const key = stage.nameKey.startsWith("campaign.")
    ? stage.nameKey.replace(/^campaign\./, "stages.")
    : stage.nameKey;
  return t(key, { defaultValue: `Nhiệm vụ ${index + 1}` });
}

export default function WorldMap({
  playerLevel,
  unlockedRegions,
  currentRegion,
  campaignStars = {},
  campaignClaims = [],
  onSelectRegion,
  onBack,
}: WorldMapProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(currentRegion || null);
  const selectedRegion = REGIONS.find((region) => region.id === selectedRegionId) || null;
  const earnedStars = Object.values(campaignStars).reduce(
    (total, value) => total + Math.max(0, Math.min(3, Number(value) || 0)),
    0,
  );
  const completedStages = new Set(campaignClaims);

  const isRegionUnlocked = (region: CampaignRegionDefinition) =>
    playerLevel >= region.requiredPlayerLevel &&
    (region.id === "region_01" || unlockedRegions.includes(region.id));

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-[#030807] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(148,163,184,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.035)_1px,transparent_1px)] bg-[size:34px_34px]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(34,211,238,.09),transparent_30%),radial-gradient(circle_at_86%_76%,rgba(251,191,36,.07),transparent_34%)]" />

      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#030807]/85 px-4 py-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label={t("campaign.backToMap", { defaultValue: "Quay lại" })}
            className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-300 transition hover:border-white/25 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300/70">
              BMO · Recovery Command
            </p>
            <h1 className="truncate text-xl font-black tracking-tight sm:text-2xl">
              {t("campaign.worldMap")}
            </h1>
          </div>
          <div className="hidden items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 sm:flex">
            <Metric
              icon={<ShieldCheck className="h-4 w-4 text-cyan-300" />}
              label="CLEAR"
              value={`${completedStages.size}/100`}
            />
            <Metric
              icon={<Star className="h-4 w-4 text-amber-300" />}
              label="STARS"
              value={`${earnedStars}/300`}
            />
            <Metric
              icon={<Zap className="h-4 w-4 text-emerald-300" />}
              label="LEVEL"
              value={String(playerLevel)}
            />
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="mb-7 max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300/75">
            10 material sectors · 100 operations
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-5xl">
            Dọn từng vùng. Khép kín vòng vật liệu.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Mỗi khu vực dùng một quy luật chiến đấu riêng. Hoàn thành ải, nâng đủ ba sao và hạ boss
            để mở tuyến tiếp theo.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {REGIONS.map((region, index) => {
            const unlocked = isRegionUnlocked(region);
            const regionCompleted = region.stages.filter((stage) =>
              completedStages.has(stage.id),
            ).length;
            const regionStars = region.stages.reduce(
              (sum, stage) => sum + (campaignStars[stage.id] || 0),
              0,
            );
            return (
              <motion.button
                key={region.id}
                type="button"
                disabled={!unlocked}
                onClick={() => setSelectedRegionId(region.id)}
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: unlocked ? 1 : 0.45, y: 0 }}
                transition={{ delay: reduceMotion ? 0 : index * 0.045 }}
                whileHover={reduceMotion || !unlocked ? undefined : { y: -5 }}
                className={`group relative min-h-64 overflow-hidden rounded-[26px] border p-5 text-left transition ${
                  unlocked
                    ? "border-white/10 bg-slate-950/80 hover:border-white/25"
                    : "cursor-not-allowed border-white/[0.05] bg-slate-950/40 grayscale"
                }`}
                style={unlocked ? { boxShadow: `0 22px 70px ${region.accentColor}10` } : undefined}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${region.gradient} opacity-55`}
                />
                <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,.08),transparent_34%,rgba(2,6,23,.72))]" />
                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between">
                    <div
                      className="grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-black/25 text-2xl font-black backdrop-blur"
                      style={{ color: region.accentColor }}
                    >
                      {unlocked ? region.icon : <Lock className="h-5 w-5 text-white/40" />}
                    </div>
                    <span className="font-mono text-[10px] font-black tracking-[0.16em] text-white/40">
                      SECTOR {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="mt-auto pt-8">
                    <p className="text-lg font-black leading-tight">{t(region.nameKey)}</p>
                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-white/52">
                      {t(region.descriptionKey)}
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[10px] font-black uppercase tracking-wider text-white/50">
                      <span>{regionCompleted}/10 clear</span>
                      <span className="text-amber-200">{regionStars}/30 ★</span>
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </main>

      <AnimatePresence>
        {selectedRegion && (
          <RegionPanel
            region={selectedRegion}
            campaignStars={campaignStars}
            campaignClaims={campaignClaims}
            onClose={() => setSelectedRegionId(null)}
            onSelectStage={(stageId) => onSelectRegion(selectedRegion.id, stageId)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <p className="text-[8px] font-black tracking-[0.16em] text-white/35">{label}</p>
        <p className="font-mono text-xs font-black text-white">{value}</p>
      </div>
    </div>
  );
}

function RegionPanel({
  region,
  campaignStars,
  campaignClaims,
  onClose,
  onSelectStage,
}: {
  region: CampaignRegionDefinition;
  campaignStars: Record<string, number>;
  campaignClaims: string[];
  onClose: () => void;
  onSelectStage: (stageId: string) => void;
}) {
  const { t } = useTranslation();
  const completed = useMemo(() => new Set(campaignClaims), [campaignClaims]);
  const nextStage =
    region.stages.find((stage, index) => {
      if (completed.has(stage.id)) return false;
      return index === 0 || completed.has(region.stages[index - 1].id);
    }) || region.stages[region.stages.length - 1];

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ y: 45, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-[30px] border border-white/10 bg-[#07100f] shadow-2xl sm:rounded-[30px]"
      >
        <div className={`relative overflow-hidden bg-gradient-to-br ${region.gradient} p-6 sm:p-8`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(255,255,255,.18),transparent_38%),linear-gradient(180deg,transparent,rgba(2,6,23,.55))]" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/20 text-white/70 backdrop-blur hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative pr-12">
            <div className="mb-4 flex items-center gap-3">
              <span
                className="grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-black/20 text-2xl"
                style={{ color: region.accentColor }}
              >
                {region.icon}
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">
                Material sector
              </span>
            </div>
            <h2 className="text-3xl font-black tracking-tight">{t(region.nameKey)}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
              {t(region.descriptionKey)}
            </p>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {region.stages.map((stage, index) => {
              const unlocked = index === 0 || completed.has(region.stages[index - 1].id);
              const stars = campaignStars[stage.id] || 0;
              return (
                <button
                  key={stage.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => onSelectStage(stage.id)}
                  className={`relative min-h-32 rounded-2xl border p-3 text-left transition ${
                    unlocked
                      ? "border-white/10 bg-white/[0.045] hover:border-amber-300/45 hover:bg-amber-300/[0.07]"
                      : "cursor-not-allowed border-white/[0.04] bg-black/20 opacity-35"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-black text-white/35">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {completed.has(stage.id) ? (
                      <ShieldCheck className="h-4 w-4 text-emerald-300" />
                    ) : !unlocked ? (
                      <Lock className="h-4 w-4 text-white/30" />
                    ) : null}
                  </div>
                  <p className="mt-3 line-clamp-2 text-xs font-black leading-4 text-white">
                    {stageLabel(stage, index, t)}
                  </p>
                  <p className="mt-2 text-[9px] font-black uppercase tracking-wider text-white/35">
                    {stage.type}
                  </p>
                  <p className="absolute bottom-3 left-3 text-[10px] text-amber-300">
                    {"★".repeat(stars)}
                    {"☆".repeat(Math.max(0, 3 - stars))}
                  </p>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onSelectStage(nextStage.id)}
            className="mt-5 flex w-full items-center justify-between rounded-2xl bg-slate-100 px-5 py-4 text-left text-slate-950 transition hover:bg-white"
          >
            <span>
              <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                Tiếp tục chiến dịch
              </span>
              <span className="mt-1 block font-black">
                {stageLabel(nextStage, region.stages.indexOf(nextStage), t)}
              </span>
            </span>
            <span className="flex items-center gap-2 text-xs font-black">
              <Sparkles className="h-4 w-4 text-amber-500" /> {nextStage.staminaCost}
              <ChevronRight className="h-5 w-5" />
            </span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
