import React, { useState, useEffect } from "react";
import { Store, UserCircle2, Hexagon, Sparkles, Check, Lock } from "lucide-react";
import { UserProgress } from "../types";

interface Props {
  points: number;
  onPurchase: (cost: number, reason?: string) => void;
  userId: string;
  progress?: UserProgress;
  onRefresh?: (progress?: any) => void;
}

const AVATARS = [
  { id: "av1", name: "Mầm Xanh", cost: 50, icon: "🌱" },
  { id: "av2", name: "Chiến Binh Nước", cost: 150, icon: "💧" },
  { id: "av3", name: "Thủ Lĩnh Rừng", cost: 300, icon: "🦁" },
];

const FRAMES = [
  {
    id: "fr1",
    name: "Khung Gỗ",
    cost: 100,
    color: "border-[6px] border-amber-700",
  },
  {
    id: "fr2",
    name: "Khung Băng",
    cost: 200,
    color: "border-[6px] border-cyan-400",
  },
  {
    id: "fr3",
    name: "Hào Quang Đất",
    cost: 500,
    color: "border-[6px] border-emerald-500 shadow-[0_0_15px_#10b981]",
  },
];

type PurchaseCounts = Record<string, number>;

export function RewardStore({ points, onPurchase, userId, progress, onRefresh }: Props) {
  const [activeTab, setActiveTab] = useState<"avatar" | "frame">("avatar");
  const [purchaseCounts, setPurchaseCounts] = useState<PurchaseCounts>({});

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

  const handlePurchase = (id: string, cost: number, name: string) => {
    if (points < cost) return;

    fetch('/api/user-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: userId, type: 'purchase', data: id })
    }).then(res => res.json()).then(result => {
      if (result.success && onRefresh) {
        onRefresh(result.progress);
      }
    });

    onPurchase(cost, `Mua vật phẩm: ${name}`);
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
          <Store className="text-purple-500" /> Cửa Hàng Điểm Thưởng
        </h3>
        <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
          <Sparkles size={16} /> {points}đ
        </div>
      </div>

      <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
        <button
          onClick={() => setActiveTab("avatar")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === "avatar" ? "bg-white text-purple-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <UserCircle2 size={18} /> Avatar
        </button>
        <button
          onClick={() => setActiveTab("frame")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === "frame" ? "bg-white text-purple-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Hexagon size={18} /> Khung viền
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {activeTab === "avatar"
          ? AVATARS.map((item) => {
              const count = purchaseCounts[item.id] || 0;
              const owned = count > 0;
              const canAfford = points >= item.cost;
              return (
                <div
                  key={item.id}
                  className="bg-gray-50 rounded-xl p-3 flex flex-col items-center justify-between border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all cursor-pointer relative overflow-hidden"
                >
                  {owned ? (
                    <div className="absolute top-1.5 right-1.5 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm z-10">
                      <Check size={10} />
                    </div>
                  ) : (
                    <div className="absolute top-1.5 right-1.5 bg-gray-900/60 text-white/80 rounded-full p-0.5 shadow-sm z-10">
                      <Lock size={10} />
                    </div>
                  )}
                  <div className="text-4xl mb-2 mt-1">{item.icon}</div>
                  <div className="text-xs font-bold text-gray-700 text-center mb-2">
                    {item.name}
                    {count > 1 && (
                      <div className="flex items-center gap-0.5 justify-center mt-0.5">
                        {Array.from({ length: Math.min(count - 1, 4) }).map((_, i) => (
                          <Check key={i} size={10} className="text-green-500" />
                        ))}
                        {count > 5 && <span className="text-[9px] text-gray-400 ml-0.5">x{count}</span>}
                      </div>
                    )}
                  </div>
                  <button
                    disabled={!canAfford}
                    onClick={() => handlePurchase(item.id, item.cost, item.name)}
                    className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                      canAfford
                        ? "bg-purple-500 text-white hover:bg-purple-600 shadow-sm"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {canAfford ? `${item.cost}đ` : `Cần ${item.cost}đ`}
                  </button>
                </div>
              );
            })
          : FRAMES.map((item) => {
              const count = purchaseCounts[item.id] || 0;
              const owned = count > 0;
              const canAfford = points >= item.cost;
              return (
                <div
                  key={item.id}
                  className="bg-gray-50 rounded-xl p-3 flex flex-col items-center justify-between border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all cursor-pointer relative overflow-hidden"
                >
                  {owned ? (
                    <div className="absolute top-1.5 right-1.5 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm z-10">
                      <Check size={10} />
                    </div>
                  ) : (
                    <div className="absolute top-1.5 right-1.5 bg-gray-900/60 text-white/80 rounded-full p-0.5 shadow-sm z-10">
                      <Lock size={10} />
                    </div>
                  )}
                  <div
                    className={`w-12 h-12 rounded-full mb-2 mt-1 bg-gray-200 ${item.color}`}
                  ></div>
                  <div className="text-xs font-bold text-gray-700 text-center mb-2">
                    {item.name}
                    {count > 1 && (
                      <div className="flex items-center gap-0.5 justify-center mt-0.5">
                        {Array.from({ length: Math.min(count - 1, 4) }).map((_, i) => (
                          <Check key={i} size={10} className="text-green-500" />
                        ))}
                        {count > 5 && <span className="text-[9px] text-gray-400 ml-0.5">x{count}</span>}
                      </div>
                    )}
                  </div>
                  <button
                    disabled={!canAfford}
                    onClick={() => handlePurchase(item.id, item.cost, item.name)}
                    className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                      canAfford
                        ? "bg-purple-500 text-white hover:bg-purple-600 shadow-sm"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {canAfford ? `${item.cost}đ` : `Cần ${item.cost}đ`}
                  </button>
                </div>
              );
            })}
      </div>
    </div>
  );
}
