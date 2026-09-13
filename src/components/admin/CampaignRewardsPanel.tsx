import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Save, ShieldCheck, Sparkles } from "lucide-react";
import { CAMPAIGN_REGIONS, type CampaignStageDefinition } from "../../../shared/cardGame";
import { FLAGSHIP_CARDS, tCardName } from "../../lib/cards";
import { getAuthHeaders } from "../../lib/auth";
import { showToast } from "../../lib/toast";
import { Badge, Button, Card, EmptyState, LoadingSpinner, SectionHeading } from "../../lib/ui";
import type { RewardItem } from "../../types";

interface CampaignRewardConfig {
  stageId: string;
  points: number;
  shards: number;
  cardId: number | null;
  rewardId: string | null;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

function stageNameKey(stage: CampaignStageDefinition): string {
  return stage.nameKey.startsWith("campaign.")
    ? stage.nameKey.replace(/^campaign\./, "stages.")
    : stage.nameKey;
}

export function CampaignRewardsPanel() {
  const { t } = useTranslation();
  const [selectedRegionId, setSelectedRegionId] = useState(CAMPAIGN_REGIONS[0].id);
  const [configs, setConfigs] = useState<Record<string, CampaignRewardConfig>>({});
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingStageId, setSavingStageId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/campaign/config", { headers: getAuthHeaders() });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success)
        throw new Error(payload?.error || "Không tải được campaign");
      setConfigs(
        Object.fromEntries(
          (payload.rewardConfigs || []).map((config: CampaignRewardConfig) => [
            config.stageId,
            config,
          ]),
        ),
      );
      setRewards(Array.isArray(payload.rewardCatalog) ? payload.rewardCatalog : []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không tải được campaign");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedRegion = useMemo(
    () => CAMPAIGN_REGIONS.find((region) => region.id === selectedRegionId) || CAMPAIGN_REGIONS[0],
    [selectedRegionId],
  );

  const patchConfig = (stageId: string, patch: Partial<CampaignRewardConfig>) => {
    setConfigs((current) => ({
      ...current,
      [stageId]: { ...current[stageId], stageId, ...patch },
    }));
  };

  const save = async (stageId: string) => {
    const config = configs[stageId];
    if (!config) return;
    setSavingStageId(stageId);
    try {
      const response = await fetch(`/api/admin/campaign/stages/${stageId}/reward`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(config),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error || "Không thể lưu");
      patchConfig(stageId, payload.reward);
      showToast("Đã lưu thưởng campaign", stageId, "success");
    } catch (reason) {
      showToast(
        "Không thể lưu thưởng",
        reason instanceof Error ? reason.message : "Lỗi không xác định",
        "warning",
      );
    } finally {
      setSavingStageId(null);
    }
  };

  return (
    <Card className="rounded-[28px] p-6">
      <SectionHeading
        eyebrow="Game economy"
        title="Phần thưởng campaign"
        subtitle="Mỗi ải có EXP, mảnh, thẻ rơi và quà catalog riêng. Server khóa thưởng theo mốc sao, nên client không thể tự chọn số điểm."
        action={
          <Badge tone="accent">
            <ShieldCheck className="h-3.5 w-3.5" /> Server-authoritative
          </Badge>
        }
      />

      {loading ? (
        <LoadingSpinner message="Đang tải 100 ải campaign" />
      ) : error ? (
        <EmptyState
          title="Không tải được campaign"
          subtitle={error}
          action={{ label: "Thử lại", onClick: load }}
        />
      ) : (
        <div className="mt-6 grid gap-5 xl:grid-cols-[250px_1fr]">
          <div className="space-y-2">
            {CAMPAIGN_REGIONS.map((region, index) => (
              <button
                key={region.id}
                type="button"
                onClick={() => setSelectedRegionId(region.id)}
                className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                  region.id === selectedRegion.id
                    ? "border-slate-900 bg-slate-950 text-white shadow-lg"
                    : "border-slate-100 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 font-black"
                  style={{ color: region.accentColor }}
                >
                  {region.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-black uppercase tracking-[0.14em] opacity-55">
                    Khu {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="block truncate text-sm font-black">{t(region.nameKey)}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xl font-black text-slate-950">{t(selectedRegion.nameKey)}</p>
                <p className="mt-1 text-sm text-slate-500">{t(selectedRegion.descriptionKey)}</p>
              </div>
              <Badge tone="warning">
                <Sparkles className="h-3.5 w-3.5" /> 10 ải
              </Badge>
            </div>

            {selectedRegion.stages.map((stage, index) => {
              const config = configs[stage.id];
              if (!config) return null;
              return (
                <div
                  key={stage.id}
                  className="rounded-[22px] border border-slate-100 bg-slate-50/70 p-4"
                >
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-slate-400">
                          {stage.id}
                        </span>
                        <Badge
                          tone={
                            stage.type === "boss"
                              ? "warning"
                              : stage.type === "elite"
                                ? "accent"
                                : "default"
                          }
                        >
                          {stage.type}
                        </Badge>
                      </div>
                      <p className="mt-1 font-black text-slate-900">
                        {index + 1}.{" "}
                        {t(stageNameKey(stage), { defaultValue: `Nhiệm vụ ${index + 1}` })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => void save(stage.id)}
                      loading={savingStageId === stage.id}
                    >
                      <Save className="h-4 w-4" /> Lưu ải
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
                    <label className="text-xs font-bold text-slate-600">
                      EXP (3 sao)
                      <input
                        type="number"
                        min={0}
                        max={5000}
                        value={config.points}
                        onChange={(event) =>
                          patchConfig(stage.id, { points: Number(event.target.value) })
                        }
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400"
                      />
                    </label>
                    <label className="text-xs font-bold text-slate-600">
                      Mảnh (3 sao)
                      <input
                        type="number"
                        min={0}
                        max={500}
                        value={config.shards}
                        onChange={(event) =>
                          patchConfig(stage.id, { shards: Number(event.target.value) })
                        }
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400"
                      />
                    </label>
                    <label className="text-xs font-bold text-slate-600">
                      Thẻ rơi khi đủ 3 sao
                      <select
                        value={config.cardId ?? ""}
                        onChange={(event) =>
                          patchConfig(stage.id, {
                            cardId: event.target.value ? Number(event.target.value) : null,
                          })
                        }
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400"
                      >
                        <option value="">Không có</option>
                        {FLAGSHIP_CARDS.map((card) => (
                          <option key={card.id} value={card.id}>
                            #{String(card.id).padStart(3, "0")} · {tCardName(card.name)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs font-bold text-slate-600">
                      Quà catalog khi đủ 3 sao
                      <select
                        value={config.rewardId ?? ""}
                        onChange={(event) =>
                          patchConfig(stage.id, { rewardId: event.target.value || null })
                        }
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400"
                      >
                        <option value="">Không có</option>
                        {rewards.map((reward) => (
                          <option key={String(reward.id)} value={String(reward.id)}>
                            {reward.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
