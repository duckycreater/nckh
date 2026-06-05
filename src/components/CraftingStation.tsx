import React, { useState, useEffect } from "react";
import { Gift, Handshake, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { UserProgress, RewardItem } from "../types";
import { Badge, Button, Card, EmptyState, ErrorRetry, FieldLabel, Input, LoadingSpinner, ModalShell, SectionHeading } from "../lib/ui";

interface Props {
  points: number;
  onCraft: (cost: number, reason?: string) => void;
  userId: string;
  progress?: UserProgress;
  onRefresh?: (progress?: any) => void;
}

export function CraftingStation({ points, onCraft, userId, progress, onRefresh }: Props) {
  const [recipes, setRecipes] = useState<RewardItem[]>([]);
  const [craftingId, setCraftingId] = useState<string | number | null>(null);
  const [crafted, setCrafted] = useState<(string | number)[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [successItem, setSuccessItem] = useState<string | null>(null);
  const [showRedeemForm, setShowRedeemForm] = useState<string | number | null>(null);
  const [fullName, setFullName] = useState("");
  const [classNameStr, setClassNameStr] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch("/api/rewards")
      .then((res) => {
        if (!res.ok) throw new Error("Không thể tải danh sách quà");
        return res.json();
      })
      .then((data) => {
        setRecipes(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
        setLoading(false);
      });
  }, [refetchKey]);

  useEffect(() => {
    if (progress && progress.crafted) {
      setCrafted(progress.crafted);
    }
  }, [progress]);

  const confirmRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    if (showRedeemForm === null) return;
    const recipeId = showRedeemForm;
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) return;

    setShowRedeemForm(null);
    handleCraft(recipeId, recipe.cost, fullName, classNameStr);
  };

  const handleCraft = (recipeId: string | number, cost: number, name: string, cls: string) => {
    if (points >= cost) {
      setCraftingId(recipeId);
      setTimeout(() => {
        setCraftingId(null);
        setCrafted((prev) => [...prev, recipeId]);
        setSuccessItem(name);
        setShowConfetti(true);

        fetch("/api/user-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nickname: userId,
            type: "craft",
            data: recipeId,
            redeemInfo: { fullName: name, class: cls },
          }),
        }).then((res) => res.json()).then((result) => {
          if (result.success && onRefresh) onRefresh(result.progress);
        });

        onCraft(cost, `Chế tạo vật phẩm: ${name}`);
        setTimeout(() => {
          setShowConfetti(false);
          setSuccessItem(null);
        }, 4000);
      }, 2800);
    }
  };

  return (
    <>
      {showConfetti && (
        <div className="fixed inset-0 z-[200] pointer-events-none">
          <Confetti
            numberOfPieces={280}
            recycle={false}
            run={true}
            gravity={0.22}
            colors={["#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6", "#f97316"]}
            tweenDuration={4000}
          />
        </div>
      )}

      <AnimatePresence>
        {successItem && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
          >
            <div className="fixed inset-0 -z-10 bg-slate-950/50 backdrop-blur-sm" onClick={() => {}} />
            <Card className="max-w-sm w-full p-8 text-center">
              <div className="mb-3 text-5xl">🎉</div>
              <h3 className="mb-2 text-2xl font-black text-slate-900">Đổi quà thành công!</h3>
              <p className="text-slate-500">{successItem}</p>
              <Button onClick={() => { setShowConfetti(false); setSuccessItem(null); }} className="mt-6 w-full" size="lg">
                Tuyệt vời!
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="overflow-hidden rounded-[28px] p-0">
        <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#fff,#f8fafc)] px-5 py-5">
          <SectionHeading
            eyebrow="Crafting"
            title="Đổi quà thưởng"
            subtitle="Dùng EXP tích luỹ để đổi quà tặng thực tế hoặc E-voucher."
            action={<Badge tone="success">{points} EXP</Badge>}
          />
        </div>

        {loading && <LoadingSpinner message="Đang tải kho quà..." />}
        {error && <ErrorRetry message={error} onRetry={() => setRefetchKey((k) => k + 1)} />}

        {!loading && !error && (
          <div className="space-y-3 p-4 sm:p-5">
            {recipes.length === 0 ? (
              <EmptyState title="Kho quà trống" subtitle="Không có quà tặng nào tại thời điểm này." />
            ) : (
              recipes.map((recipe) => {
                const isCrafting = craftingId === recipe.id;
                const canAfford = points >= recipe.cost;

                return (
                  <motion.div
                    key={recipe.id}
                    layout
                    className={`group relative overflow-hidden rounded-[26px] border transition-all ${isCrafting ? "border-amber-300 bg-amber-50/80" : "border-amber-100 bg-amber-50/50 hover:border-amber-200 hover:bg-amber-50"}`}
                  >
                    <AnimatePresence>
                      {isCrafting && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-[26px] bg-white/90 backdrop-blur-sm"
                        >
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}>
                            <Sparkles size={36} className="text-amber-500 mb-3" />
                          </motion.div>
                          <p className="text-sm font-black uppercase tracking-widest text-amber-600 animate-pulse">Đang xử lý...</p>
                          <div className="mt-4 h-2 w-32 overflow-hidden rounded-full bg-amber-100">
                            <motion.div className="h-full bg-amber-400" initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 2.8, ease: "easeInOut" }} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex gap-4 p-4">
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[22px] border border-amber-100 bg-white shadow-sm">
                        <img src={recipe.imageUrl} alt={recipe.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      </div>

                      <div className="flex flex-1 flex-col justify-between py-1">
                        <div>
                          <h4 className="text-base font-black text-slate-900">{recipe.name}</h4>
                          <p className="mt-1 text-sm leading-relaxed text-slate-500">{recipe.desc}</p>
                        </div>
                        {recipe.ingredients && recipe.ingredients.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {recipe.ingredients.map((ing, i) => (
                              <span key={i} className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-600 shadow-sm">
                                {ing}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-amber-100 bg-white/60 px-4 py-3 backdrop-blur-sm">
                      <div className="text-xs font-bold text-slate-500">
                        Giá: <span className={canAfford ? "text-amber-600" : "text-red-500"}>{recipe.cost} EXP</span>
                      </div>

                      {!isCrafting && (
                        <Button
                          onClick={() => setShowRedeemForm(recipe.id)}
                          disabled={!canAfford}
                          size="sm"
                          className={canAfford ? "bg-gradient-to-r from-amber-400 to-orange-400 text-white hover:from-amber-500 hover:to-orange-500" : ""}
                        >
                          <Handshake size={14} />
                          {canAfford ? "Đổi ngay" : "Chưa đủ điểm"}
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}
      </Card>

      <AnimatePresence>
        {showRedeemForm !== null && (
          <ModalShell onClose={() => setShowRedeemForm(null)} className="max-w-sm overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <Gift className="h-5 w-5" />
                <h3 className="text-lg font-black">Xác nhận đổi quà</h3>
              </div>
              <button onClick={() => setShowRedeemForm(null)} className="rounded-full bg-white/20 p-1.5 transition hover:bg-white/30">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={confirmRedeem} className="space-y-4 p-5">
              <div>
                <FieldLabel>Họ và tên</FieldLabel>
                <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn A" />
              </div>
              <div>
                <FieldLabel>Lớp / Đơn vị</FieldLabel>
                <Input required value={classNameStr} onChange={(e) => setClassNameStr(e.target.value)} placeholder="10A1 hoặc Khách" />
              </div>
              <Button type="submit" className="w-full" size="lg">
                Xác nhận đổi quà
              </Button>
            </form>
          </ModalShell>
        )}
      </AnimatePresence>
    </>
  );
}
