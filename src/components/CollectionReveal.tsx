import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight, Layers3, Sparkles, X, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BMO_ASSETS } from "../lib/bmoAssets";
import {
  CARD_DEFINITIONS,
  ELEMENTS,
  FLAGSHIP_CARDS,
  getCardArt,
  getCardById,
  tCardName,
} from "../lib/cards";
import { getCardHeroProfile } from "../lib/cardHeroes";

export interface PullResult {
  id: number;
  isNew?: boolean;
  shardsAwarded?: number;
}

interface CollectionRevealProps {
  cardIds: number[];
  results?: PullResult[];
  isOpen: boolean;
  onClose: () => void;
  onCardCollected?: (cardId: number) => void;
}

const RARITY_THEME: Record<string, { accent: string; glow: string; frame: string; stars: number }> =
  {
    common: {
      accent: "#cbd5e1",
      glow: "rgba(148,163,184,.32)",
      frame: "from-slate-400 to-slate-700",
      stars: 1,
    },
    uncommon: {
      accent: "#6ee7b7",
      glow: "rgba(16,185,129,.34)",
      frame: "from-emerald-400 to-emerald-800",
      stars: 2,
    },
    rare: {
      accent: "#7dd3fc",
      glow: "rgba(14,165,233,.38)",
      frame: "from-sky-400 to-blue-900",
      stars: 3,
    },
    epic: {
      accent: "#c4b5fd",
      glow: "rgba(139,92,246,.42)",
      frame: "from-violet-400 to-purple-950",
      stars: 4,
    },
    legendary: {
      accent: "#fde68a",
      glow: "rgba(245,158,11,.48)",
      frame: "from-amber-300 via-orange-500 to-amber-950",
      stars: 5,
    },
    mythical: {
      accent: "#f9a8d4",
      glow: "rgba(236,72,153,.5)",
      frame: "from-fuchsia-300 via-rose-500 to-purple-950",
      stars: 6,
    },
    event: {
      accent: "#5eead4",
      glow: "rgba(45,212,191,.48)",
      frame: "from-teal-300 via-cyan-500 to-indigo-950",
      stars: 6,
    },
  };

export default function CollectionReveal({
  cardIds,
  results = [],
  isOpen,
  onClose,
  onCardCollected,
}: CollectionRevealProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const validCardIds = useMemo(
    () => cardIds.filter((id) => Number.isInteger(id) && id > 0),
    [cardIds],
  );
  const cardId = validCardIds[currentIndex];
  const card = cardId
    ? (getCardById(cardId) ?? CARD_DEFINITIONS.find((candidate) => candidate.id === cardId))
    : undefined;
  const result = results[currentIndex];
  const rarityId = card?.rarityId ?? "common";
  const theme = RARITY_THEME[rarityId] ?? RARITY_THEME.common;
  const element = ELEMENTS.find((candidate) => candidate.id === card?.elementId);
  const heroCard = FLAGSHIP_CARDS.find((candidate) => candidate.id === card?.id);
  const heroProfile = heroCard ? getCardHeroProfile(heroCard) : null;
  const isLast = currentIndex >= validCardIds.length - 1;
  const displayName = useMemo(() => {
    if (!card) return t("cards.unknown", { defaultValue: "Thẻ bí ẩn" });
    const translated = tCardName(card.name);
    return translated === card.name && card.subtitle ? card.subtitle : translated;
  }, [card, t]);

  const reveal = useCallback(() => {
    if (!cardId || revealed) return;
    setRevealed(true);
    onCardCollected?.(cardId);
  }, [cardId, onCardCollected, revealed]);

  const next = useCallback(() => {
    if (!revealed) return reveal();
    if (isLast) return onClose();
    setCurrentIndex((index) => index + 1);
    setRevealed(false);
  }, [isLast, onClose, reveal, revealed]);

  useEffect(() => {
    if (!isOpen) return;
    setCurrentIndex(0);
    setRevealed(false);
  }, [isOpen, cardIds]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if ([" ", "Enter", "ArrowRight"].includes(event.key)) {
        event.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, next, onClose]);

  if (!validCardIds.length || !card) return null;

  const stats: Array<{ label: string; value: number }> = [
    { label: "ATK", value: card.atk },
    { label: "HP", value: card.hp },
    { label: "DEF", value: card.def },
  ];
  const particleCount = reduceMotion ? 0 : Math.min(18, 5 + theme.stars * 2);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={t("flashcards.gacha.revealTitle", { defaultValue: "Mở thẻ" })}
          className="fixed inset-0 z-[100] flex min-h-dvh items-center justify-center overflow-hidden bg-slate-950 px-4 py-6 text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <img
            src={BMO_ASSETS.gachaVault}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent_0%,rgba(2,6,23,.2)_34%,rgba(2,6,23,.96)_82%)]" />
          <div
            className="absolute left-1/2 top-[42%] h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{ background: theme.glow }}
          />

          {Array.from({ length: particleCount }, (_, index) => {
            const angle = ((index * 137.5 + cardId * 17) * Math.PI) / 180;
            const distance = 135 + ((index * 41 + cardId) % 180);
            return (
              <motion.span
                key={`${cardId}-${index}`}
                className="pointer-events-none absolute left-1/2 top-[43%] h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: theme.accent, boxShadow: `0 0 12px ${theme.accent}` }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                animate={{
                  x: Math.cos(angle) * distance,
                  y: Math.sin(angle) * distance,
                  opacity: [0, 0.85, 0],
                  scale: [0, 1, 0.25],
                }}
                transition={{ duration: 2.4, delay: index * 0.035, repeat: Infinity }}
              />
            );
          })}

          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close", { defaultValue: "Đóng" })}
            className="absolute right-4 top-4 z-30 grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-slate-950/70 text-slate-300 backdrop-blur hover:border-white/30 hover:text-white"
          >
            <X size={20} />
          </button>

          <div className="relative z-10 flex w-full max-w-lg flex-col items-center">
            <div className="mb-4 flex w-full items-center justify-between gap-4 px-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              <span className="flex items-center gap-2">
                <Layers3 size={15} />
                {t("flashcards.gacha.pack", { defaultValue: "BMO Eco Vault" })}
              </span>
              <span className="tabular-nums text-slate-200">
                {currentIndex + 1} / {validCardIds.length}
              </span>
            </div>

            <div className="relative h-[450px] w-[286px] max-w-[78vw] [perspective:1200px] sm:h-[486px] sm:w-[310px]">
              <motion.button
                key={`${cardId}-${revealed ? "open" : "closed"}`}
                type="button"
                onClick={reveal}
                aria-label={
                  revealed
                    ? displayName
                    : t("flashcards.gacha.tapReveal", { defaultValue: "Chạm để mở thẻ" })
                }
                className="absolute inset-0 w-full rounded-[26px] focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/70"
                initial={reduceMotion ? false : { scale: 0.88, y: 26 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", damping: 19, stiffness: 170 }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {!revealed ? (
                    <motion.div
                      key="back"
                      className="absolute inset-0 overflow-hidden rounded-[26px] border border-white/20 bg-slate-900 shadow-2xl"
                      exit={reduceMotion ? { opacity: 0 } : { rotateY: 90, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                    >
                      <img
                        src={BMO_ASSETS.cardBack}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur">
                        <span className="flex items-center justify-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-cyan-100">
                          <Sparkles size={16} className="text-cyan-300" />
                          {t("flashcards.gacha.tapReveal", { defaultValue: "Chạm để mở thẻ" })}
                        </span>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="front"
                      className={`absolute inset-0 overflow-hidden rounded-[26px] bg-gradient-to-br p-[3px] ${theme.frame}`}
                      initial={reduceMotion ? { opacity: 0 } : { rotateY: -90, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      transition={{ duration: 0.34 }}
                      style={{ boxShadow: `0 25px 80px ${theme.glow}, 0 0 0 1px ${theme.accent}` }}
                    >
                      <div className="relative flex h-full flex-col overflow-hidden rounded-[23px] bg-slate-950 text-left">
                        <div className="relative min-h-0 flex-1 overflow-hidden bg-slate-900">
                          {getCardArt(card.id, card.elementId, card.artVariant, card.rarityId)}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                          <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-slate-950/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] backdrop-blur">
                            {element?.name ?? card.elementId}
                          </div>
                          <div
                            className="absolute right-4 top-4 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] backdrop-blur"
                            style={{
                              color: theme.accent,
                              borderColor: `${theme.accent}55`,
                              background: "rgba(2,6,23,.78)",
                            }}
                          >
                            {t(`cards.rarity.${rarityId}`, { defaultValue: rarityId })}
                          </div>
                        </div>
                        <div className="relative p-4 sm:p-5">
                          <div
                            className="mb-1 flex items-center gap-1 text-amber-300"
                            aria-hidden="true"
                          >
                            {Array.from({ length: theme.stars }, (_, index) => (
                              <span key={index} className="text-[10px]">
                                ★
                              </span>
                            ))}
                          </div>
                          <h2 className="line-clamp-2 text-xl font-black leading-tight text-white sm:text-2xl">
                            {heroProfile?.callsign || displayName}
                          </h2>
                          <p className="mt-1 line-clamp-1 text-xs text-slate-400">
                            #{String(card.id).padStart(3, "0")} · {displayName}
                          </p>
                          {heroProfile && (
                            <div className="mt-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.12em]">
                              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-300">
                                {heroProfile.roleVi}
                              </span>
                              <span
                                className="rounded-full border border-white/10 bg-white/5 px-2 py-1"
                                style={{ color: theme.accent }}
                              >
                                {heroProfile.mechanicName}
                              </span>
                            </div>
                          )}
                          <div className="mt-4 grid grid-cols-3 gap-2">
                            {stats.map((stat) => (
                              <div
                                key={stat.label}
                                className="rounded-xl border border-white/10 bg-white/[.045] px-2 py-2 text-center"
                              >
                                <div className="text-[9px] font-bold tracking-widest text-slate-500">
                                  {stat.label}
                                </div>
                                <div
                                  className="mt-0.5 text-lg font-black tabular-nums"
                                  style={{ color: theme.accent }}
                                >
                                  {stat.value}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

              {revealed && result && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.75, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className={`absolute -right-3 -top-3 z-20 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-wide shadow-xl ${result.isNew ? "border-cyan-200/50 bg-cyan-300 text-slate-950" : "border-violet-300/40 bg-violet-950 text-violet-100"}`}
                >
                  {result.isNew
                    ? t("flashcards.gacha.newBadge", { defaultValue: "Thẻ mới" })
                    : `+${result.shardsAwarded ?? 0} ${t("flashcards.shards", { defaultValue: "mảnh" })}`}
                </motion.div>
              )}
            </div>

            <div className="mt-5 flex w-full gap-3">
              <button
                type="button"
                onClick={onClose}
                className="min-h-12 flex-1 rounded-2xl border border-white/15 bg-white/[.06] px-4 text-sm font-bold text-slate-200 backdrop-blur transition hover:bg-white/10"
              >
                {t("flashcards.gacha.skipAll", { defaultValue: "Bỏ qua tất cả" })}
              </button>
              <button
                type="button"
                onClick={next}
                className="flex min-h-12 flex-[1.55] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-300 to-emerald-300 px-5 text-sm font-black text-slate-950 shadow-[0_12px_35px_rgba(45,212,191,.22)] transition hover:brightness-110 active:scale-[.98]"
              >
                {!revealed ? (
                  <>
                    <Zap size={17} />
                    {t("flashcards.gacha.reveal", { defaultValue: "Mở thẻ" })}
                  </>
                ) : (
                  <>
                    {isLast
                      ? t("collection.viewCollection", { defaultValue: "Xem bộ sưu tập" })
                      : t("common.next", { defaultValue: "Thẻ tiếp theo" })}
                    <ChevronRight size={17} />
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 flex max-w-full gap-1.5 overflow-hidden" aria-hidden="true">
              {validCardIds.map((id, index) => (
                <span
                  key={`${id}-${index}`}
                  className={`h-1.5 rounded-full transition-all ${index === currentIndex ? "w-7" : "w-2"}`}
                  style={{
                    backgroundColor: index <= currentIndex ? theme.accent : "rgba(148,163,184,.24)",
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
