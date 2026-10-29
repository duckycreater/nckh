import React, { useState, useEffect, useRef } from "react";
import { CheckCircle2, Gift, Handshake, MapPin, ShieldCheck, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
import { isDisplayableImageUrl } from "../lib/media";
import { setAppCriticalActivity } from "../services/appUpdateManager";
import { toUserMessage } from "../lib/userFacingError";

interface Props {
  points: number;
  progress?: UserProgress;
  onRefresh?: (progress?: UserProgress) => void;
}

export function CraftingStation({ points, progress, onRefresh }: Props) {
  const [recipes, setRecipes] = useState<RewardItem[]>([]);
  const [craftingId, setCraftingId] = useState<string | number | null>(null);
  const [crafted, setCrafted] = useState<(string | number)[]>([]);
  const [successItem, setSuccessItem] = useState<string | null>(null);
  const [showRedeemForm, setShowRedeemForm] = useState<string | number | null>(null);
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [craftError, setCraftError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);
  const redemptionRequestKey = useRef<string | null>(null);

  useEffect(() => {
    setAppCriticalActivity("reward-redemption", craftingId !== null);
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (craftingId === null) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      setAppCriticalActivity("reward-redemption", false);
    };
  }, [craftingId]);

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
        setError(toUserMessage(err, "Không thể tải danh sách quà lúc này."));
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
      setFormError("Bạn không còn đủ điểm để đổi món quà này.");
      return false;
    }
    setCraftError(null);
    setCraftingId(recipeId);
    redemptionRequestKey.current ||= crypto.randomUUID();
    try {
      const response = await fetch("/api/redemptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": redemptionRequestKey.current,
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          rewardId: recipeId,
          recipient: { fullName: recipientName, address: recipientAddress },
          idempotencyKey: redemptionRequestKey.current,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || result?.message || "Đổi quà thất bại.");
      }
      setCrafted((prev) => [...prev, recipeId]);
      setSuccessItem(itemName);
      redemptionRequestKey.current = null;
      onRefresh?.();
      window.setTimeout(() => {
        setSuccessItem(null);
      }, 4000);
      return true;
    } catch (caught) {
      const message = toUserMessage(caught, "Đổi quà thất bại. Vui lòng thử lại.");
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
      <AnimatePresence>
        {successItem && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
          >
            <div className="fixed inset-0 -z-10 bg-slate-950/55" />
            <Card className="max-w-sm w-full p-8 text-center">
              <CheckCircle2 className="mx-auto mb-4 text-[var(--primary)]" size={42} strokeWidth={1.5} />
              <p className="font-telemetry text-[10px] font-semibold tracking-[0.16em] text-[var(--primary)]">GIAO DỊCH ĐÃ GHI NHẬN</p>
              <h3 className="mb-2 mt-2 text-2xl font-semibold text-[var(--graphite)]">Đổi quà thành công</h3>
              <p className="font-semibold text-[var(--graphite)]">{successItem}</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                Yêu cầu giao quà đã được ghi nhận và đang chờ xử lý.
              </p>
              <Button
                onClick={() => {
                  setSuccessItem(null);
                }}
                className="mt-6 w-full"
                size="lg"
              >
                Đóng
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-[var(--border-subtle)] bg-[var(--surface)] px-5 py-5">
          <SectionHeading
            title="Chọn phần thưởng"
            subtitle="Chọn quà, kiểm tra địa chỉ rồi xác nhận giao dịch điểm."
            action={<Badge tone="success">{points.toLocaleString("vi-VN")} điểm</Badge>}
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
                const hasPreviousRequest = crafted.some(
                  (item) => String(item) === String(recipe.id),
                );

                return (
                  <motion.article
                    key={recipe.id}
                    layout
                    className={`group relative overflow-hidden rounded-[10px] border transition-colors ${isCrafting ? "border-[var(--primary)] bg-[var(--primary-soft)]" : "border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[var(--border-strong)]"}`}
                  >
                    <AnimatePresence>
                      {isCrafting && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-[10px] bg-[rgba(251,252,248,0.96)]"
                        >
                          <span className="mb-3 h-7 w-7 animate-spin rounded-full border-2 border-[var(--border-subtle)] border-t-[var(--primary)]" />
                          <p className="font-telemetry text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">
                            Đang ghi giao dịch
                          </p>
                          <div className="mt-4 h-1 w-32 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                            <motion.div
                              className="h-full bg-[var(--primary)]"
                              initial={{ width: 0 }}
                              animate={{ width: "100%" }}
                              transition={{ duration: 2.8, ease: "easeInOut" }}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex flex-col gap-4 p-4 sm:flex-row">
                      <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-muted)] sm:h-24 sm:w-24">
                        {isDisplayableImageUrl(recipe.imageUrl) ? (
                          <img
                            src={recipe.imageUrl}
                            alt={recipe.name}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-[var(--surface-muted)] text-[var(--primary)]">
                            <Gift size={34} />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col justify-between py-1">
                        <div>
                          <h4 className="text-base font-semibold text-[var(--graphite)]">{recipe.name}</h4>
                          <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
                            {recipe.desc}
                          </p>
                        </div>
                        {recipe.ingredients && recipe.ingredients.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {recipe.ingredients.map((ing, i) => (
                              <span
                                key={i}
                                className="rounded-[6px] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]"
                              >
                                {ing}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3">
                      <div className="text-xs font-semibold text-[var(--text-muted)]">
                        Giá:{" "}
                        <span className={canAfford ? "text-[var(--primary)]" : "text-red-600"}>
                          {recipe.cost.toLocaleString("vi-VN")} điểm
                        </span>
                      </div>

                      {!isCrafting && (
                        <Button
                          onClick={() => {
                            setShowRedeemForm(recipe.id);
                            setFormError(null);
                            setCraftError(null);
                          }}
                          disabled={!canAfford}
                          size="sm"
                          variant={canAfford ? "primary" : "ghost"}
                        >
                          <Handshake size={14} />
                          {canAfford ? (hasPreviousRequest ? "Đổi thêm" : "Đổi ngay") : "Chưa đủ điểm"}
                        </Button>
                      )}
                    </div>
                  </motion.article>
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
            <div className="flex items-center justify-between border-b border-white/10 bg-[var(--graphite)] px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <Gift className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Kiểm tra và xác nhận</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRedeemForm(null)}
                disabled={craftingId !== null}
                aria-label="Đóng biểu mẫu đổi quà"
                className="rounded-[6px] border border-white/15 bg-white/[0.06] p-1.5 transition hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={confirmRedeem} className="space-y-4 p-5">
              {selectedRecipe && (
                <div className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
                  <p className="font-semibold text-[var(--graphite)]">{selectedRecipe.name}</p>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-slate-600">
                      Chi phí: {selectedRecipe.cost.toLocaleString("vi-VN")} điểm
                    </span>
                    <span className="font-bold text-emerald-700">
                      Còn {(points - selectedRecipe.cost).toLocaleString("vi-VN")} điểm
                    </span>
                  </div>
                </div>
              )}
              <div>
                <FieldLabel htmlFor="reward-recipient-name">Họ và tên</FieldLabel>
                <Input
                  id="reward-recipient-name"
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
                <FieldLabel htmlFor="reward-recipient-address">Địa chỉ nhận quà</FieldLabel>
                <TextArea
                  id="reward-recipient-address"
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
