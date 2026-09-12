import React, { useState, useEffect } from "react";
import { UserCircle2, Hexagon, Sparkles, Check, Lock } from "lucide-react";
import { UserProgress } from "../types";
import { Badge, Button, Card, SectionHeading, TabButton } from "../lib/ui";
import { getAuthHeaders } from "../lib/auth";
import { PROFILE_AVATARS, PROFILE_FRAMES } from "../lib/bmoAssets";

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
      setPurchaseError(error instanceof Error ? error.message : "Không thể mua vật phẩm lúc này.");
    } finally {
      setPurchasingId(null);
    }
  };

  const items = activeTab === "avatar" ? PROFILE_AVATARS : PROFILE_FRAMES;

  return (
    <Card className="overflow-hidden rounded-[28px] border-emerald-950/10 p-0 shadow-[0_24px_60px_rgba(4,47,36,0.12)]">
      <div className="relative overflow-hidden border-b border-emerald-200/20 bg-[radial-gradient(circle_at_80%_0%,rgba(251,191,36,0.2),transparent_34%),linear-gradient(135deg,#052e28,#0b5b48)] px-5 py-5 text-white">
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/80 to-transparent" />
        <SectionHeading
          eyebrow="Eco vault"
          title="Cửa hàng điểm thưởng"
          subtitle="Mở khóa avatar và khung hồ sơ để cá nhân hóa tài khoản của bạn."
          action={
            <Badge tone="accent">
              <Sparkles className="h-3.5 w-3.5" /> {points} EXP
            </Badge>
          }
        />
      </div>

      <div className="p-4 sm:p-5">
        {purchaseError && (
          <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {purchaseError}
          </p>
        )}
        <div className="mb-4 flex gap-2 rounded-[24px] bg-slate-100 p-1">
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
          {items.map((item) => {
            const count = purchaseCounts[item.id] || 0;
            const owned = count > 0;
            const canAfford = points >= item.cost;
            const isPurchasing = purchasingId === item.id;

            return (
              <Card
                key={item.id}
                className="group rounded-[24px] border border-emerald-100 bg-[linear-gradient(145deg,#ffffff,#f0fdf7)] p-4 transition duration-300 hover:-translate-y-1 hover:border-amber-300 hover:shadow-[0_16px_34px_rgba(4,120,87,0.14)]"
              >
                <div className="relative flex h-full flex-col items-center justify-between text-center">
                  <div
                    className={`absolute right-0 top-0 rounded-full p-1 ${owned ? "bg-emerald-500 text-white" : "bg-slate-800/70 text-white/80"}`}
                  >
                    {owned ? <Check size={11} /> : <Lock size={11} />}
                  </div>

                  {activeTab === "avatar" ? (
                    <div className="relative mb-3 mt-2 h-24 w-24 overflow-hidden rounded-full bg-[radial-gradient(circle,#ecfdf5,#bbf7d0)] ring-2 ring-amber-300/70 shadow-[0_10px_28px_rgba(4,120,87,0.24)]">
                      <img
                        src={(item as (typeof PROFILE_AVATARS)[number]).imageSrc}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div
                      className={`mb-3 mt-2 h-20 w-20 rounded-full bg-[radial-gradient(circle,#d1fae5,#0f766e)] ${String((item as (typeof PROFILE_FRAMES)[number]).previewClass)}`}
                    />
                  )}

                  <div>
                    <p className="text-sm font-black text-slate-800">{item.name}</p>
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
                    className={`mt-4 w-full ${canAfford && !owned ? "bg-violet-600 hover:bg-violet-700 text-white" : ""}`}
                    variant={canAfford && !owned ? "secondary" : "ghost"}
                  >
                    {isPurchasing
                      ? "Đang mở khóa..."
                      : owned
                        ? "Đã sở hữu"
                        : canAfford
                          ? `${item.cost.toLocaleString("vi-VN")} EXP`
                          : `Cần ${item.cost.toLocaleString("vi-VN")} EXP`}
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
