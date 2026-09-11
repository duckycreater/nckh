import React, { useState, useEffect } from "react";
import { Gift, Handshake, MapPin, ShieldCheck, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { UserProgress, RewardItem } from "../types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorRetry,
  FieldLabel,
  Input,
  LoadingSpinner,
  ModalShell,
  SectionHeading,
  TextArea,
} from "../lib/ui";
import { getAuthHeaders } from "../lib/auth";
import { parseRedeemInfo } from "../lib/redemption";

interface Props {
  points: number;
  progress?: UserProgress;
  onRefresh?: (progress?: any) => void;
}

export function CraftingStation({ points, progress, onRefresh }: Props) {
  const [recipes, setRecipes] = useState<RewardItem[]>([]);
  const [craftingId, setCraftingId] = useState<string | number | null>(null);
  const [crafted, setCrafted] = useState<(string | number)[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [successItem, setSuccessItem] = useState<string | null>(null);
  const [showRedeemForm, setShowRedeemForm] = useState<string | number | null>(null);
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [craftError, setCraftError] = useState<string | null>(null);
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

  const confirmRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (showRedeemForm === null) return;
    const recipeId = showRedeemForm;
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) return;

    const parsed = parseRedeemInfo({ fullName, address });
    if (!parsed.success) {
      setFormError(parsed.message);
      return;
    }

    setFormError(null);
    const redeemed = await handleCraft(
      recipeId,
      recipe.cost,
      recipe.name,
      parsed.data.fullName,
      parsed.data.address,
    );
    if (redeemed) {
      setShowRedeemForm(null);
      setFullName("");
      setAddress("");
    }
  };

  const handleCraft = async (
    recipeId: string | number,
    cost: number,
    itemName: string,
    recipientName: string,
    recipientAddress: string,
  ) => {
    if (points < cost) {
      setFormError("Bạn không còn đủ EXP để đổi món quà này.");
      return false;
    }
    setCraftError(null);
    setCraftingId(recipeId);
    try {
      const response = await fetch("/api/user-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          type: "craft",
          data: recipeId,
          redeemInfo: { fullName: recipientName, address: recipientAddress },
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Đổi quà thất bại.");
      }
      setCrafted((prev) => [...prev, recipeId]);
      setSuccessItem(itemName);
      setShowConfetti(true);
      onRefresh?.(result.progress);
      window.setTimeout(() => {
        setShowConfetti(false);
        setSuccessItem(null);
      }, 4000);
      return true;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Đổi quà thất bại.";
      setCraftError(message);
      setFormError(message);
      return false;
    } finally {
      setCraftingId(null);
    }
  };

  const selectedRecipe = recipes.find((recipe) => recipe.id === showRedeemForm);

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
            <div className="fixed inset-0 -z-10 bg-slate-950/50 backdrop-blur-sm" />
            <Card className="max-w-sm w-full p-8 text-center">
              <div className="mb-3 text-5xl">🎉</div>
              <h3 className="mb-2 text-2xl font-black text-slate-900">Đổi quà thành công!</h3>
              <p className="font-bold text-slate-700">{successItem}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Yêu cầu giao quà đã được ghi nhận và đang chờ xử lý.
              </p>
              <Button
                onClick={() => {
                  setShowConfetti(false);
                  setSuccessItem(null);
                }}
                className="mt-6 w-full"
                size="lg"
              >
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
        {craftError && (
          <p role="alert" className="mx-5 mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {craftError}
          </p>
        )}

        {!loading && !error && (
          <div className="space-y-3 p-4 sm:p-5">
            {recipes.length === 0 ? (
              <EmptyState
                title="Kho quà trống"
                subtitle="Không có quà tặng nào tại thời điểm này."
              />
            ) : (
              recipes.map((recipe) => {
                const isCrafting = craftingId === recipe.id;
                const canAfford = points >= recipe.cost;
                const alreadyRedeemed = crafted.some((item) => String(item) === String(recipe.id));

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
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                          >
                            <Sparkles size={36} className="text-amber-500 mb-3" />
                          </motion.div>
                          <p className="text-sm font-black uppercase tracking-widest text-amber-600 animate-pulse">
                            Đang xử lý...
                          </p>
                          <div className="mt-4 h-2 w-32 overflow-hidden rounded-full bg-amber-100">
                            <motion.div
                              className="h-full bg-amber-400"
                              initial={{ width: 0 }}
                              animate={{ width: "100%" }}
                              transition={{ duration: 2.8, ease: "easeInOut" }}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex flex-col gap-4 p-4 sm:flex-row">
                      <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-[22px] border border-amber-100 bg-white shadow-sm sm:h-24 sm:w-24">
                        {recipe.imageUrl ? (
                          <img
                            src={recipe.imageUrl}
                            alt={recipe.name}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-amber-50 text-amber-500">
                            <Gift size={34} />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col justify-between py-1">
                        <div>
                          <h4 className="text-base font-black text-slate-900">{recipe.name}</h4>
                          <p className="mt-1 text-sm leading-relaxed text-slate-500">
                            {recipe.desc}
                          </p>
                        </div>
                        {recipe.ingredients && recipe.ingredients.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {recipe.ingredients.map((ing, i) => (
                              <span
                                key={i}
                                className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-600 shadow-sm"
                              >
                                {ing}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-amber-100 bg-white/60 px-4 py-3 backdrop-blur-sm">
                      <div className="text-xs font-bold text-slate-500">
                        Giá:{" "}
                        <span className={canAfford ? "text-amber-600" : "text-red-500"}>
                          {recipe.cost.toLocaleString("vi-VN")} EXP
                        </span>
                      </div>

                      {!isCrafting && (
                        <Button
                          onClick={() => {
                            setShowRedeemForm(recipe.id);
                            setFormError(null);
                            setCraftError(null);
                          }}
                          disabled={!canAfford || alreadyRedeemed}
                          size="sm"
                          className={
                            canAfford
                              ? "bg-gradient-to-r from-amber-400 to-orange-400 text-white hover:from-amber-500 hover:to-orange-500"
                              : ""
                          }
                        >
                          <Handshake size={14} />
                          {alreadyRedeemed
                            ? "Đã gửi yêu cầu"
                            : canAfford
                              ? "Đổi ngay"
                              : "Chưa đủ điểm"}
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
          <ModalShell
            onClose={craftingId === null ? () => setShowRedeemForm(null) : undefined}
            className="max-w-sm overflow-hidden p-0"
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <Gift className="h-5 w-5" />
                <h3 className="text-lg font-black">Xác nhận đổi quà</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRedeemForm(null)}
                disabled={craftingId !== null}
                aria-label="Đóng biểu mẫu đổi quà"
                className="rounded-full bg-white/20 p-1.5 transition hover:bg-white/30"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={confirmRedeem} className="space-y-4 p-5">
              {selectedRecipe && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="font-black text-slate-900">{selectedRecipe.name}</p>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-slate-600">
                      Chi phí: {selectedRecipe.cost.toLocaleString("vi-VN")} EXP
                    </span>
                    <span className="font-bold text-emerald-700">
                      Còn {(points - selectedRecipe.cost).toLocaleString("vi-VN")} EXP
                    </span>
                  </div>
                </div>
              )}
              <div>
                <FieldLabel>Họ và tên</FieldLabel>
                <Input
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div>
                <FieldLabel>Địa chỉ nhận quà</FieldLabel>
                <TextArea
                  required
                  minLength={10}
                  maxLength={300}
                  rows={3}
                  autoComplete="street-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Số nhà, đường/thôn, phường/xã, quận/huyện, tỉnh/thành phố"
                />
                <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-slate-500">
                  <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                  Địa chỉ chỉ được gửi cho bộ phận xử lý và giao phần quà này.
                </p>
              </div>
              {formError && (
                <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  {formError}
                </p>
              )}
              <Button type="submit" className="w-full" size="lg" loading={craftingId !== null}>
                <MapPin size={17} />
                {craftingId !== null ? "Đang gửi yêu cầu..." : "Xác nhận địa chỉ và đổi quà"}
              </Button>
            </form>
          </ModalShell>
        )}
      </AnimatePresence>
    </>
  );
}
