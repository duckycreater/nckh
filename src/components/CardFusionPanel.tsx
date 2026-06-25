/**
 * Card Fusion UI — Ghép card để tạo card hiếm hơn
 */

import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Lock, Zap, Star, ChevronRight, RefreshCw,
  Info, Award, X, Heart,
} from "lucide-react";

interface FusionableCard {
  cardId: string;
  cardName: string;
  element: string;
  rarity: string;
  count: number;
  duplicates: number;
}

interface FusionResult {
  success: boolean;
  resultCardName: string;
  resultRarity: string;
  lore: string;
  consolationPoints: number;
  fusionXP: number;
}

const RARITY_COLORS: Record<string, string> = {
  common: "#94a3b8",
  uncommon: "#22c55e",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b",
};

const RARITY_LABELS: Record<string, string> = {
  common: "Thường",
  uncommon: "Không phổ biến",
  rare: "Hiếm",
  epic: "Siêu hiếm",
  legendary: "Huyền thoại",
};

export function CardFusionPanel({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const [cards, setCards] = useState<FusionableCard[]>([]);
  const [selected, setSelected] = useState<FusionableCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [fusing, setFusing] = useState(false);
  const [result, setResult] = useState<FusionResult | null>(null);
  const [event, setEvent] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/card-fusion/cards/${userId}`)
      .then((r) => r.json())
      .then((data) => {
        setCards(data.cards || []);
        setEvent(data.event);
      })
      .catch(() => setCards([]))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleFusion = useCallback(async () => {
    if (!selected) return;
    setFusing(true);
    setResult(null);

    try {
      const res = await fetch("/api/card-fusion/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          cardId: selected.cardId,
          eventId: event?.eventId,
        }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) {
        // Refresh cards
        const refresh = await fetch(`/api/card-fusion/cards/${userId}`).then((r) => r.json());
        setCards(refresh.cards || []);
        setSelected(null);
      }
    } catch {
      // Ignore
    } finally {
      setFusing(false);
    }
  }, [selected, userId, event]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Event Banner */}
      {event?.active && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 p-3 text-white text-center"
        >
          <div className="flex items-center justify-center gap-2">
            <Sparkles size={16} className="fill-white" />
            <span className="text-xs font-black">{event.theme}</span>
            <Sparkles size={16} className="fill-white" />
          </div>
          <p className="text-[10px] mt-0.5 opacity-80">
            +{Math.round(event.bonus * 100)}% success rate!
          </p>
        </motion.div>
      )}

      {/* Info */}
      <div className="flex items-start gap-2 rounded-xl bg-blue-50/50 border border-blue-200/30 p-3">
        <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
        <div className="text-[11px] text-blue-600 leading-relaxed">
          <strong>Card Fusion:</strong> Ghép 2 card cùng loại cùng loại để có cơ hội nhận card hiếm hơn. Tuần này (Thứ 7-CN) có bonus!
        </div>
      </div>

      {/* Cards available for fusion */}
      {cards.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="text-4xl">🎴</div>
          <p className="text-sm font-bold text-slate-400">
            Cần tối thiểu 2 card cùng loại để fusion
          </p>
          <p className="text-xs text-slate-500">
            Gacha pull nhiều hơn để có card trùng lặp!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase text-slate-500">
            {cards.length} card có thể fusion
          </p>
          {cards.map((card) => (
            <button
              key={card.cardId}
              onClick={() => setSelected(selected?.cardId === card.cardId ? null : card)}
              className={`w-full flex items-center gap-3 rounded-2xl p-3 border-2 transition-all text-left ${
                selected?.cardId === card.cardId
                  ? "border-purple-400 bg-purple-50/50"
                  : "border-slate-700/50 bg-slate-800/30 hover:border-slate-600"
              }`}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{
                  background: `${RARITY_COLORS[card.rarity]}20`,
                  border: `1px solid ${RARITY_COLORS[card.rarity]}40`,
                }}
              >
                🎴
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                  {card.cardName}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      background: `${RARITY_COLORS[card.rarity]}20`,
                      color: RARITY_COLORS[card.rarity],
                    }}
                  >
                    {RARITY_LABELS[card.rarity]}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {card.duplicates} copies available
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-slate-400">x{card.count}</span>
                <ChevronRight size={16} className="text-slate-600" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selected card fusion panel */}
      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-purple-400/40 bg-purple-50/20 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-purple-400" />
              <span className="text-sm font-black text-[var(--text-primary)]">Fusion Preview</span>
            </div>
            <button onClick={() => setSelected(null)}>
              <X size={16} className="text-slate-400" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                style={{
                  background: `${RARITY_COLORS[selected.rarity]}20`,
                  border: `2px solid ${RARITY_COLORS[selected.rarity]}50`,
                }}
              >
                🎴
              </div>
              <span className="text-[10px] font-bold" style={{ color: RARITY_COLORS[selected.rarity] }}>
                {RARITY_LABELS[selected.rarity]}
              </span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <Sparkles size={20} className="text-purple-400" />
              <span className="text-[9px] text-slate-500">2x</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                style={{
                  background: `${RARITY_COLORS[rarityAbove(selected.rarity)]}20`,
                  border: `2px solid ${RARITY_COLORS[rarityAbove(selected.rarity)]}50`,
                }}
              >
                🎴
              </div>
              <span className="text-[10px] font-bold" style={{ color: RARITY_COLORS[rarityAbove(selected.rarity)] }}>
                {RARITY_LABELS[rarityAbove(selected.rarity)]}
              </span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-[var(--text-muted)]">
              Success rate:{" "}
              <span className="font-black text-purple-400">
                {Math.round((baseSuccessRate(selected.rarity) + (event?.bonus || 0)) * 100)}%
              </span>
            </p>
          </div>

          <button
            onClick={handleFusion}
            disabled={fusing}
            className="w-full rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 py-3 font-black text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {fusing ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Fusing...
              </>
            ) : (
              <>
                <Sparkles size={14} />
                FUSION
              </>
            )}
          </button>
        </motion.div>
      )}

      {/* Result Modal */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setResult(null)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-slate-900 p-6 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              {result.success ? (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 8 }}
                    className="text-6xl mb-3"
                  >
                    ✨
                  </motion.div>
                  <h3 className="text-lg font-black text-white mb-1">
                    Fusion Thành Công!
                  </h3>
                  <div
                    className="inline-block rounded-full px-3 py-1 text-xs font-black mb-3"
                    style={{
                      background: `${RARITY_COLORS[result.resultRarity]}20`,
                      color: RARITY_COLORS[result.resultRarity],
                    }}
                  >
                    {RARITY_LABELS[result.resultRarity]}
                  </div>
                  <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                    {result.lore}
                  </p>
                  <div className="flex justify-center gap-4 mb-4">
                    {result.fusionXP > 0 && (
                      <div className="flex items-center gap-1">
                        <Zap size={14} className="text-amber-400" />
                        <span className="text-sm font-black text-amber-400">+{result.fusionXP} XP</span>
                      </div>
                    )}
                    {result.consolationPoints > 0 && (
                      <div className="flex items-center gap-1">
                        <Star size={14} className="text-blue-400" />
                        <span className="text-sm font-black text-blue-400">+{result.consolationPoints} pts</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <motion.div
                    animate={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 0.5 }}
                    className="text-5xl mb-3"
                  >
                    😢
                  </motion.div>
                  <h3 className="text-lg font-black text-white mb-1">
                    Fusion Thất Bại
                  </h3>
                  <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                    {result.lore}
                  </p>
                  {result.consolationPoints > 0 && (
                    <div className="flex justify-center gap-2 mb-4">
                      <Star size={14} className="text-blue-400" />
                      <span className="text-sm font-black text-blue-400">
                        +{result.consolationPoints} points consolation
                      </span>
                    </div>
                  )}
                </>
              )}
              <button
                onClick={() => setResult(null)}
                className="w-full rounded-2xl py-3 font-bold text-sm bg-slate-800 text-white"
              >
                {result.success ? "Tuyệt vời!" : "Thử lại"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function rarityAbove(rarity: string): string {
  const order = ["common", "uncommon", "rare", "epic", "legendary"];
  const idx = order.indexOf(rarity);
  return idx < order.length - 1 ? order[idx + 1] : "legendary";
}

function baseSuccessRate(rarity: string): number {
  const rates: Record<string, number> = {
    common: 0.30,
    uncommon: 0.25,
    rare: 0.20,
    epic: 0.15,
    legendary: 0,
  };
  return rates[rarity] || 0.2;
}
