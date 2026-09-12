import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Heart,
  RotateCcw,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { getRegionById, getStageById, REGIONS } from "../data/worldMap";
import { ALL_CARDS, ELEMENTS, getCardArt, tCardName } from "../lib/cards";
import { BMO_ASSETS } from "../lib/bmoAssets";
import { getAuthHeaders } from "../lib/auth";

interface CampaignStageProps {
  regionId?: string;
  stageId?: string;
  onBack: () => void;
}

type BattlePhase = "briefing" | "battle" | "result";
type RewardState = "idle" | "claiming" | "claimed" | "duplicate" | "failed";

const copy = {
  vi: {
    mission: "Nhiệm vụ phân loại",
    brief:
      "Nhận diện đúng hệ vật liệu của từng thẻ. Bạn có 3 năng lượng và cần đúng ít nhất 60% để hoàn thành.",
    intel: "Dữ liệu đối tượng",
    start: "Bắt đầu nhiệm vụ",
    question: "Vật phẩm này thuộc nhóm nào?",
    round: "Lượt",
    correct: "Chính xác",
    wrong: "Chưa đúng",
    correctWas: "Đáp án đúng",
    next: "Lượt tiếp theo",
    finish: "Xem kết quả",
    victory: "Nhiệm vụ hoàn thành",
    defeat: "Nhiệm vụ chưa hoàn thành",
    victoryHint: "Phân loại tốt! Phần thưởng sẽ được máy chủ xác minh trước khi cộng.",
    defeatHint: "Xem lại nhóm vật liệu rồi thử lại. Không mất điểm khi thất bại.",
    retry: "Thử lại",
    claimed: "EXP đã được cộng",
    duplicate: "Bạn đã nhận thưởng chiến dịch hôm nay",
    claimFailed: "Kết quả đã lưu, nhưng chưa thể cộng EXP. Hãy thử lại sau.",
    claiming: "Đang xác minh phần thưởng…",
    accuracy: "Độ chính xác",
    hp: "Năng lượng",
    serverReward: "Thưởng máy chủ",
    noCards: "Chặng này chưa có dữ liệu thẻ hợp lệ.",
  },
  en: {
    mission: "Sorting mission",
    brief:
      "Identify each card's material class. You have 3 energy and need at least 60% accuracy to clear the stage.",
    intel: "Encounter intel",
    start: "Start mission",
    question: "Which material class does this item belong to?",
    round: "Round",
    correct: "Correct",
    wrong: "Not quite",
    correctWas: "Correct answer",
    next: "Next round",
    finish: "View result",
    victory: "Mission complete",
    defeat: "Mission incomplete",
    victoryHint: "Great sorting. The server verifies the reward before crediting it.",
    defeatHint: "Review the material groups and retry. Losing never costs points.",
    retry: "Retry",
    claimed: "EXP added",
    duplicate: "Today's campaign reward was already claimed",
    claimFailed: "Result saved, but EXP could not be added yet. Please retry later.",
    claiming: "Verifying reward…",
    accuracy: "Accuracy",
    hp: "Energy",
    serverReward: "Server reward",
    noCards: "This stage has no valid card data yet.",
  },
} as const;

function resolveStageNameKey(nameKey: string): string {
  // Stage metadata historically used the campaign.* namespace while locale
  // files store the 100 stage names under stages.*. Resolve both formats so a
  // missing translation never leaks a raw i18next key into the UI.
  return nameKey.startsWith("campaign.") ? nameKey.replace(/^campaign\./, "stages.") : nameKey;
}

export default function CampaignStage({
  regionId: regionIdProp,
  stageId: stageIdProp,
  onBack,
}: CampaignStageProps) {
  const { t, i18n } = useTranslation();
  const params = useParams<{ regionId: string; stageId: string }>();
  const regionId = regionIdProp || params.regionId || "";
  const stageId = stageIdProp || params.stageId || "";
  const region = getRegionById(regionId);
  const stage = getStageById(regionId, stageId);
  const c = i18n.resolvedLanguage?.startsWith("vi") ? copy.vi : copy.en;
  const reduceMotion = useReducedMotion();
  const stageNameKey = stage ? resolveStageNameKey(stage.nameKey) : "";

  const encounters = useMemo(() => {
    if (!stage) return [];
    const ids = [...stage.trashCardIds.slice(0, 4)];
    if (stage.bossCardId) ids.push(stage.bossCardId);
    else if (stage.trashCardIds[4]) ids.push(stage.trashCardIds[4]);
    return ids
      .map((id) => ALL_CARDS.find((card) => card.id === id))
      .filter((card): card is (typeof ALL_CARDS)[number] => Boolean(card));
  }, [stage]);

  const [phase, setPhase] = useState<BattlePhase>("briefing");
  const [round, setRound] = useState(0);
  const [energy, setEnergy] = useState(3);
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [rewardState, setRewardState] = useState<RewardState>("idle");
  const [earnedPoints, setEarnedPoints] = useState(0);

  if (!region || !stage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <p className="mb-4 text-xl text-white">{t("campaign.stageNotFound")}</p>
          <button
            onClick={onBack}
            className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-500"
          >
            {t("campaign.backToMap")}
          </button>
        </div>
      </div>
    );
  }

  const regionIndex = Math.max(
    0,
    REGIONS.findIndex((item) => item.id === region.id),
  );
  const rewardLevel = Math.min(5, regionIndex + 1);
  const currentCard = encounters[round];
  const stageNumber = region.stages.findIndex((item) => item.id === stageId) + 1;
  const threshold = Math.ceil(encounters.length * 0.6);
  const won = correctCount >= threshold && energy > 0;
  const accuracy = encounters.length ? Math.round((correctCount / encounters.length) * 100) : 0;

  const answerOptions = currentCard
    ? [
        currentCard.element,
        ...ELEMENTS.filter((element) => element.id !== currentCard.element.id)
          .slice(currentCard.id % Math.max(1, ELEMENTS.length - 3))
          .concat(ELEMENTS)
          .filter(
            (element, index, array) =>
              element.id !== currentCard.element.id &&
              array.findIndex((candidate) => candidate.id === element.id) === index,
          )
          .slice(0, 3),
      ].sort(
        (a, b) =>
          ((a.id.charCodeAt(0) + currentCard.id) % 7) - ((b.id.charCodeAt(0) + currentCard.id) % 7),
      )
    : [];

  const resetBattle = () => {
    setPhase("battle");
    setRound(0);
    setEnergy(3);
    setCorrectCount(0);
    setSelectedElement(null);
    setRewardState("idle");
    setEarnedPoints(0);
  };

  const chooseAnswer = (elementId: string) => {
    if (!currentCard || selectedElement) return;
    setSelectedElement(elementId);
    if (elementId === currentCard.element.id) setCorrectCount((value) => value + 1);
    else setEnergy((value) => Math.max(0, value - 1));
  };

  const claimReward = async () => {
    setRewardState("claiming");
    try {
      const response = await fetch("/api/reward", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ action: "card_battle", level: rewardLevel }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) throw new Error(result?.message || "reward_failed");
      setEarnedPoints(Number(result.earnedPoints || 0));
      setRewardState(result.duplicate ? "duplicate" : "claimed");
    } catch {
      setRewardState("failed");
    }
  };

  const nextRound = () => {
    const lastRound = round >= encounters.length - 1;
    if (lastRound || energy <= 0) {
      setPhase("result");
      if (correctCount >= threshold && energy > 0) void claimReward();
      return;
    }
    setRound((value) => value + 1);
    setSelectedElement(null);
  };

  const stageTone =
    stage.type === "boss"
      ? "from-rose-500 to-red-700"
      : stage.type === "elite"
        ? "from-violet-500 to-fuchsia-700"
        : stage.type === "miniboss"
          ? "from-amber-500 to-orange-700"
          : "from-emerald-500 to-teal-700";

  return (
    <div className="fixed inset-0 overflow-auto bg-[#020b0a] text-white">
      <img
        src={BMO_ASSETS.campaignArena}
        alt=""
        aria-hidden="true"
        className="fixed inset-0 h-full w-full object-cover opacity-45"
      />
      <div className="fixed inset-0 bg-[linear-gradient(180deg,rgba(2,11,10,0.55),rgba(2,11,10,0.95)_75%)]" />
      {!reduceMotion && (
        <>
          <motion.div
            aria-hidden="true"
            className="pointer-events-none fixed -left-24 top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl"
            animate={{ x: [0, 45, 0], y: [0, 28, 0], opacity: [0.35, 0.6, 0.35] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden="true"
            className="pointer-events-none fixed -right-24 bottom-10 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl"
            animate={{ x: [0, -36, 0], y: [0, -24, 0], opacity: [0.25, 0.5, 0.25] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}

      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#031713]/80 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <motion.button
            onClick={onBack}
            aria-label={t("campaign.backToMap")}
            whileHover={reduceMotion ? undefined : { scale: 1.05 }}
            whileTap={reduceMotion ? undefined : { scale: 0.95 }}
            className="rounded-xl border border-white/10 bg-white/10 p-2.5 transition hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </motion.button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black sm:text-lg">
              {stage ? t(stageNameKey, { defaultValue: stage.nameKey }) : ""}
            </p>
            <p className="truncate text-xs text-emerald-100/65">
              {t(region.nameKey)} · {t("campaign.stage")} {stageNumber}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-sm font-black text-amber-200">
            <Zap className="h-4 w-4 fill-current" /> {stage.staminaCost}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-68px)] max-w-5xl items-center px-4 py-8 sm:px-6">
        <AnimatePresence mode="wait">
          {phase === "briefing" && (
            <motion.section
              key="briefing"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="w-full overflow-hidden rounded-[32px] border border-emerald-200/20 bg-[#061d19]/90 shadow-[0_30px_100px_rgba(0,0,0,0.55)] backdrop-blur-xl"
            >
              <div className={`relative overflow-hidden bg-gradient-to-r ${stageTone} p-6 sm:p-8`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.24),transparent_38%)]" />
                <div className="relative">
                  <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/15 px-3 py-1 text-xs font-black uppercase tracking-[0.16em]">
                    <Swords className="h-3.5 w-3.5" /> {c.mission}
                  </span>
                  <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                    {t(stageNameKey, { defaultValue: stage.nameKey })}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
                    {c.brief}
                  </p>
                </div>
              </div>

              <div className="p-5 sm:p-8">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-black">
                    <Shield className="h-5 w-5 text-emerald-300" /> {c.intel}
                  </h2>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/65">
                    {encounters.length} cards
                  </span>
                </div>
                {encounters.length ? (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {encounters.map((card, index) => (
                      <motion.div
                        key={`${card.id}-${index}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.07 }}
                        className="group overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-2"
                      >
                        <div className="mx-auto aspect-[3/4] w-full max-w-28 transition-transform duration-300 group-hover:scale-[1.03]">
                          {getCardArt(
                            card.id,
                            card.element.id,
                            card.artVariant || 1,
                            card.rarity.id,
                          )}
                        </div>
                        <p className="mt-1 truncate text-center text-[10px] font-bold text-white/65 sm:text-xs">
                          {tCardName(card.name)}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-200">
                    {c.noCards}
                  </p>
                )}

                <motion.button
                  onClick={resetBattle}
                  disabled={!encounters.length}
                  whileHover={reduceMotion || !encounters.length ? undefined : { y: -3, scale: 1.01 }}
                  whileTap={reduceMotion || !encounters.length ? undefined : { scale: 0.98 }}
                  className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 px-6 py-4 text-lg font-black text-emerald-950 shadow-[0_12px_34px_rgba(251,191,36,0.2)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Swords className="h-5 w-5" /> {c.start}
                </motion.button>
              </div>
            </motion.section>
          )}

          {phase === "battle" && currentCard && (
            <motion.section
              key={`battle-${round}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full"
            >
              <div className="mb-5 flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3 backdrop-blur">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-300">
                    {c.round}
                  </p>
                  <p className="font-black">
                    {round + 1} / {encounters.length}
                  </p>
                </div>
                <div className="flex items-center gap-1" aria-label={`${c.hp}: ${energy}`}>
                  {[0, 1, 2].map((index) => (
                    <motion.div
                      key={index}
                      animate={
                        reduceMotion || index >= energy
                          ? { scale: 1 }
                          : { scale: [1, 1.14, 1] }
                      }
                      transition={
                        reduceMotion || index >= energy
                          ? { duration: 0 }
                          : { duration: 1.8, repeat: Infinity, delay: index * 0.12 }
                      }
                    >
                      <Heart
                      className={`h-6 w-6 ${index < energy ? "fill-rose-400 text-rose-400" : "text-white/15"}`}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-white/10" aria-label={`${c.round} ${round + 1}/${encounters.length}`}>
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-amber-300"
                  initial={{ width: 0 }}
                  animate={{ width: `${((round + 1) / encounters.length) * 100}%` }}
                  transition={{ duration: reduceMotion ? 0 : 0.45, ease: "easeOut" }}
                />
              </div>

              <div className="grid items-center gap-6 lg:grid-cols-[300px_1fr]">
                <motion.div
                  initial={{ scale: 0.9, rotateY: 10 }}
                  animate={
                    reduceMotion
                      ? { scale: 1, rotateY: 0 }
                      : { scale: 1, rotateY: 0, y: [0, -5, 0] }
                  }
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { duration: 4, repeat: Infinity, ease: "easeInOut" }
                  }
                  className="mx-auto aspect-[3/4] w-52 drop-shadow-[0_28px_30px_rgba(0,0,0,0.55)] sm:w-64"
                >
                  {getCardArt(
                    currentCard.id,
                    currentCard.element.id,
                    currentCard.artVariant || 1,
                    currentCard.rarity.id,
                  )}
                </motion.div>

                <div className="rounded-[28px] border border-white/10 bg-[#061d19]/90 p-5 shadow-2xl backdrop-blur-xl sm:p-7">
                  <span className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">
                    {tCardName(currentCard.name)}
                  </span>
                  <h2 className="mb-5 mt-2 text-2xl font-black">{c.question}</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {answerOptions.map((element) => {
                      const chosen = selectedElement === element.id;
                      const correct = element.id === currentCard.element.id;
                      const revealCorrect = Boolean(selectedElement && correct);
                      const revealWrong = Boolean(chosen && !correct);
                      return (
                        <motion.button
                          key={element.id}
                          onClick={() => chooseAnswer(element.id)}
                          disabled={Boolean(selectedElement)}
                          whileHover={reduceMotion || Boolean(selectedElement) ? undefined : { x: 3 }}
                          whileTap={reduceMotion || Boolean(selectedElement) ? undefined : { scale: 0.98 }}
                          className={`relative flex items-center gap-3 rounded-2xl border px-4 py-3 text-left font-bold transition ${
                            revealCorrect
                              ? "border-emerald-300 bg-emerald-400/20 text-emerald-100"
                              : revealWrong
                                ? "border-rose-300 bg-rose-400/20 text-rose-100"
                                : "border-white/10 bg-white/5 text-white/85 hover:border-amber-200/50 hover:bg-white/10"
                          }`}
                        >
                          <span
                            className="h-3 w-3 rounded-full shadow-[0_0_12px_currentColor]"
                            style={{ backgroundColor: element.accent }}
                          />
                          <span className="flex-1">
                            {i18n.resolvedLanguage?.startsWith("vi")
                              ? element.name
                              : element.nameShort}
                          </span>
                          {revealCorrect && <Check className="h-5 w-5" />}
                          {revealWrong && <X className="h-5 w-5" />}
                        </motion.button>
                      );
                    })}
                  </div>

                  {selectedElement && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-5"
                    >
                      <div
                        role="status"
                        aria-live="polite"
                        className={`rounded-xl p-3 text-sm font-bold ${
                          selectedElement === currentCard.element.id
                            ? "bg-emerald-400/15 text-emerald-200"
                            : "bg-rose-400/15 text-rose-200"
                        }`}
                      >
                        {selectedElement === currentCard.element.id ? c.correct : c.wrong}.{" "}
                        {c.correctWas}:{" "}
                        {i18n.resolvedLanguage?.startsWith("vi")
                          ? currentCard.element.name
                          : currentCard.element.nameShort}
                        .
                      </div>
                      <motion.button
                        onClick={nextRound}
                        whileHover={reduceMotion ? undefined : { y: -2 }}
                        whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                        className="mt-3 w-full rounded-xl bg-white px-4 py-3 font-black text-emerald-950 transition hover:bg-emerald-50"
                      >
                        {round >= encounters.length - 1 || energy <= 0 ? c.finish : c.next}
                      </motion.button>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.section>
          )}

          {phase === "result" && (
            <motion.section
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mx-auto w-full max-w-2xl overflow-hidden rounded-[32px] border border-white/10 bg-[#061d19]/95 text-center shadow-[0_30px_100px_rgba(0,0,0,0.65)] backdrop-blur-xl"
            >
              <div
                className={`bg-gradient-to-r ${won ? "from-emerald-500 to-teal-700" : "from-slate-600 to-slate-800"} p-8`}
              >
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-white/25 bg-black/15">
                  {won ? (
                    <Trophy className="h-10 w-10 text-amber-200" />
                  ) : (
                    <Shield className="h-10 w-10 text-white/70" />
                  )}
                </div>
                <h1 className="text-3xl font-black">{won ? c.victory : c.defeat}</h1>
                <p className="mt-2 text-sm text-white/80">{won ? c.victoryHint : c.defeatHint}</p>
              </div>

              <div className="p-6 sm:p-8">
                <div className="grid grid-cols-3 gap-3">
                  <ResultMetric label={c.accuracy} value={`${accuracy}%`} />
                  <ResultMetric label={c.correct} value={`${correctCount}/${encounters.length}`} />
                  <ResultMetric label={c.hp} value={`${energy}/3`} />
                </div>

                {won && (
                  <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm font-bold text-amber-100">
                    <div className="mb-1 flex items-center justify-center gap-2 text-amber-300">
                      <Sparkles className="h-4 w-4" /> {c.serverReward}
                    </div>
                    {rewardState === "claiming" && c.claiming}
                    {rewardState === "claimed" && `${c.claimed}: +${earnedPoints} EXP`}
                    {rewardState === "duplicate" && c.duplicate}
                    {rewardState === "failed" && c.claimFailed}
                  </div>
                )}

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <motion.button
                    onClick={resetBattle}
                    whileHover={reduceMotion ? undefined : { y: -2 }}
                    whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 font-black transition hover:bg-white/10"
                  >
                    <RotateCcw className="h-4 w-4" /> {c.retry}
                  </motion.button>
                  <motion.button
                    onClick={onBack}
                    whileHover={reduceMotion ? undefined : { y: -2 }}
                    whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                    className="rounded-2xl bg-white px-5 py-3 font-black text-emerald-950 transition hover:bg-emerald-50"
                  >
                    {t("campaign.backToMap")}
                  </motion.button>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <p className="text-xl font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-white/50">{label}</p>
    </div>
  );
}
