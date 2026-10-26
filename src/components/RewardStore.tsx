import React, { useState, useEffect } from "react";
import { UserCircle2, Hexagon, Check, Lock, Palette } from "lucide-react";
import { UserProgress } from "../types";
import { Button, Card, TabButton } from "../lib/ui";
import { getAuthHeaders } from "../lib/auth";
import { PROFILE_AVATARS, PROFILE_FRAMES } from "../lib/bmoAssets";
import { MaterialFingerprint } from "./MaterialVisual";
import type { WasteCategory } from "../../shared/materialCards";
import { toUserMessage } from "../lib/userFacingError";

interface Props {
  points: number;
  progress?: UserProgress;
  onRefresh?: (progress?: UserProgress) => void;
}

type PurchaseCounts = Record<string, number>;

export function RewardStore({ points, progress, onRefresh }: Props) {
  const [activeTab, setActiveTab] = useState<"avatar" | "frame">("avatar");
  const [purchaseCounts, setPurchaseCounts] = useState<PurchaseCounts>({});
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  useEffect(() => {
    if (progress && progress.purchased) {
      const counts: PurchaseCounts = {};
      for (const item of progress.purchased) {
        const id = String(item);
        counts[id] = (counts[id] || 0) + 1;
      }
      setPurchaseCounts(counts);
    }
  }, [progress]);

  const handlePurchase = async (id: string, cost: number) => {
    if (points < cost || purchaseCounts[id]) return;
    setPurchasingId(id);
    setPurchaseError(null);
    try {
      const response = await fetch("/api/user-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ type: "purchase", data: id }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Không thể mua vật phẩm lúc này.");
      }
      setPurchaseCounts((current) => ({ ...current, [id]: 1 }));
      onRefresh?.(result.progress);
    } catch (error) {
      setPurchaseError(toUserMessage(error, "Không thể mua vật phẩm lúc này."));
    } finally {
      setPurchasingId(null);
    }
  };

  const items = activeTab === "avatar" ? PROFILE_AVATARS : PROFILE_FRAMES;
  const materialCycle: WasteCategory[] = ["plastic", "paper", "glass", "metal", "organic", "hazard"];

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-[var(--border-subtle)] bg-[var(--surface)] px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-[var(--graphite)]">Tùy chỉnh hồ sơ</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Mở khóa avatar và khung hồ sơ để cá nhân hóa tài khoản của bạn.
            </p>
          </div>
          <span className="font-telemetry rounded-[6px] border border-[var(--primary-border)] bg-[var(--primary-soft)] px-2.5 py-1.5 text-xs text-[var(--primary-strong)]">{points.toLocaleString("vi-VN")} điểm</span>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {purchaseError && (
          <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {purchaseError}
          </p>
        )}
        <div className="mb-4 flex gap-2 rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-1">
          <TabButton
            active={activeTab === "avatar"}
            onClick={() => setActiveTab("avatar")}
            className="flex-1 justify-center gap-2 py-3"
          >
            <UserCircle2 size={16} /> Avatar
          </TabButton>
          <TabButton
            active={activeTab === "frame"}
            onClick={() => setActiveTab("frame")}
            className="flex-1 justify-center gap-2 py-3"
          >
            <Hexagon size={16} /> Khung viền
          </TabButton>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item, index) => {
            const count = purchaseCounts[item.id] || 0;
            const owned = count > 0;
            const canAfford = points >= item.cost;
            const isPurchasing = purchasingId === item.id;

            return (
              <Card
                key={item.id}
                className="group border border-[var(--border-subtle)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--border-strong)]"
              >
                <div className="relative flex h-full flex-col items-center justify-between text-center">
                  <div
                    className={`absolute right-0 top-0 rounded-[6px] p-1 ${owned ? "bg-[var(--primary)] text-white" : "bg-[var(--graphite)] text-white/80"}`}
                  >
                    {owned ? <Check size={11} /> : <Lock size={11} />}
                  </div>

                  {activeTab === "avatar" ? (
                    <div data-material={materialCycle[index % materialCycle.length]} className={`material-pattern material-${materialCycle[index % materialCycle.length]} relative mb-3 mt-2 h-24 w-24 overflow-hidden rounded-[10px] border border-[var(--border-subtle)] p-2 text-white`}>
                      <MaterialFingerprint category={materialCycle[index % materialCycle.length]} seed={item.id} />
                    </div>
                  ) : (
                    <div
                      className={`mb-3 mt-2 grid h-20 w-20 place-items-center rounded-[10px] border-2 border-[var(--primary)] bg-[var(--surface-muted)] ${String((item as (typeof PROFILE_FRAMES)[number]).previewClass)}`}
                    ><Palette size={22} className="text-[var(--primary)]" /></div>
                  )}

                  <div>
                    <p className="text-sm font-semibold text-[var(--graphite)]">{item.name}</p>
                    {owned && (
                      <p className="mt-1 text-[11px] font-bold text-emerald-600">
                        Đã sở hữu{count > 1 ? ` x${count}` : ""}
                      </p>
                    )}
                  </div>

                  <Button
                    disabled={owned || !canAfford || purchasingId !== null}
                    loading={isPurchasing}
                    onClick={() => handlePurchase(item.id, item.cost)}
                    size="sm"
                    className="mt-4 w-full"
                    variant={canAfford && !owned ? "secondary" : "ghost"}
                  >
                    {isPurchasing
                      ? "Đang mở khóa..."
                      : owned
                        ? "Đã sở hữu"
                        : canAfford
                          ? `${item.cost.toLocaleString("vi-VN")} điểm`
                          : `Cần ${item.cost.toLocaleString("vi-VN")} điểm`}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
