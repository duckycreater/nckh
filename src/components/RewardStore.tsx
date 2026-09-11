import React, { useState, useEffect } from "react";
import { Store, UserCircle2, Hexagon, Sparkles, Check, Lock } from "lucide-react";
import { UserProgress } from "../types";
import { Badge, Button, Card, SectionHeading, TabButton } from "../lib/ui";
import { getAuthHeaders } from "../lib/auth";

interface Props {
  points: number;
  progress?: UserProgress;
  onRefresh?: (progress?: any) => void;
}

const AVATARS = [
  { id: "av1", name: "Mầm Xanh", cost: 50, icon: "🌱" },
  { id: "av2", name: "Chiến Binh Nước", cost: 150, icon: "💧" },
  { id: "av3", name: "Thủ Lĩnh Rừng", cost: 300, icon: "🦁" },
];

const FRAMES = [
  { id: "fr1", name: "Khung Gỗ", cost: 100, color: "border-[6px] border-amber-700" },
  { id: "fr2", name: "Khung Băng", cost: 200, color: "border-[6px] border-cyan-400" },
  {
    id: "fr3",
    name: "Hào Quang Đất",
    cost: 500,
    color: "border-[6px] border-emerald-500 shadow-[0_0_15px_#10b981]",
  },
];

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

  const items = activeTab === "avatar" ? AVATARS : FRAMES;

  return (
    <Card className="overflow-hidden rounded-[28px] p-0">
      <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff,#faf8ff)] px-5 py-5">
        <SectionHeading
          eyebrow="Store"
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
                className="rounded-[24px] border border-slate-100 bg-slate-50 p-4 transition hover:border-violet-200 hover:bg-violet-50"
              >
                <div className="relative flex h-full flex-col items-center justify-between text-center">
                  <div
                    className={`absolute right-0 top-0 rounded-full p-1 ${owned ? "bg-emerald-500 text-white" : "bg-slate-800/70 text-white/80"}`}
                  >
                    {owned ? <Check size={11} /> : <Lock size={11} />}
                  </div>

                  {activeTab === "avatar" ? (
                    <div className="mb-3 mt-2 text-5xl">
                      {(item as (typeof AVATARS)[number]).icon}
                    </div>
                  ) : (
                    <div
                      className={`mb-3 mt-2 h-16 w-16 rounded-full bg-slate-200 ${String((item as (typeof FRAMES)[number]).color)}`}
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
