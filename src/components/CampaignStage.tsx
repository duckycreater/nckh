import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  CircleHelp,
  Crosshair,
  Gauge,
  LockKeyhole,
  MapPin,
  Radar,
  RotateCcw,
  Shield,
  Sparkles,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { getRegionById, getStageById } from "../data/worldMap";
import { ELEMENTS, FLAGSHIP_CARDS, getCardArt, tCardName, type Card } from "../lib/cards";
import { getCardHeroProfile } from "../lib/cardHeroes";
import { BMO_ASSETS } from "../lib/bmoAssets";
import { getAuthHeaders } from "../lib/auth";
import {
  CARD_ELEMENT_IDENTITIES,
  type CampaignRegionDefinition,
  type CardElementId,
} from "../../shared/cardGame";
import {
  applyCampaignCommand,
  CAMPAIGN_LANES,
  countResolvedTargets,
  createCampaignRun,
  getCampaignRunScore,
  getLaneLabel,
  isMaterialSynergy,
  type CampaignCommand,
  type CampaignCommandEvent,
  type CampaignCombatState,
  type CampaignIntent,
  type CampaignLane,
  type CampaignOperatorState,
  type CampaignRole,
  type CampaignTeamCard,
  type CampaignTargetState,
} from "../../shared/campaignCombat";

interface Props {
  regionId?: string;
  stageId?: string;
  onBack: () => void;
  onProgress?: (result: {
    points?: number;
    totalExpEarned?: number;
    progress?: unknown;
    unlockedRegions?: string[];
  }) => void;
}

type Phase = "briefing" | "run" | "result";
type RewardState = "idle" | "claiming" | "claimed" | "duplicate" | "failed";
type CampaignCopy = { [Key in keyof typeof vi]: string };

interface RewardPreview {
  points: number;
  shards: number;
  cardId: number | null;
  rewardId: string | null;
}

interface BriefingProps {
  c: CampaignCopy;
  stageTitle: string;
  region: CampaignRegionDefinition;
  encounters: Card[];
  teamCards: Card[];
  ownedIds: number[];
  teamIds: number[];
  rewardPreview: RewardPreview | null;
  notice: string;
  stageTone: string;
  toggleTeam: (id: number) => void;
  start: () => void;
}

interface RunBoardProps {
  c: CampaignCopy;
  english: boolean;
  run: CampaignCombatState;
  encounters: Card[];
  selectedTarget?: CampaignTargetState;
  selectedOperator?: CampaignOperatorState;
  targetId: number | null;
  operatorId: number | null;
  secondId: number | null;
  lane: CampaignLane;
  material: CardElementId;
  notice: string;
  setTargetId: (id: number) => void;
  setLane: (lane: CampaignLane) => void;
  setMaterial: (elementId: CardElementId) => void;
  selectOperator: (id: number) => void;
  act: (command: CampaignCommand) => void;
}

interface ResultProps {
  c: CampaignCopy;
  run: CampaignCombatState;
  rewardState: RewardState;
  serverStars: number;
  earnedPoints: number;
  earnedShards: number;
  cardReward: number | null;
  giftId: string | null;
  giftName: string | null;
  giftRecipient: string;
  giftAddress: string;
  giftMessage: string;
  giftSaving: boolean;
  setGiftRecipient: (value: string) => void;
  setGiftAddress: (value: string) => void;
  redeem: () => void;
  reset: () => void;
  onBack: () => void;
}

const vi = {
  op: "TACTICAL SALVAGE RUN",
  brief: "Đây không phải trận đánh theo lượt. Đây là một dây chuyền cứu hộ đang sập.",
  body: "Mỗi tín hiệu báo trước rủi ro. Điều đội hình vào đúng lane, đọc vật liệu, phối hợp hai hệ để xử lý sạch — hoặc chấp nhận nhiễm bẩn để giữ nhịp.",
  deploy: "Triển khai đội hình",
  deployHint: "Chọn 3 đơn vị. Thứ tự chọn vào FRONT / MID / BACK; có thể SHIFT trong run.",
  start: "Bắt đầu salvage run",
  needTeam: "Cần 3 đơn vị đã sở hữu",
  nodes: "tín hiệu cần thu hồi",
  run: "SALVAGE GRID",
  ap: "AP",
  integrity: "Ổn định hệ thống",
  contamination: "Nhiễm bẩn",
  combo: "Chuỗi sạch",
  target: "Node đang mở",
  material: "Đọc vật liệu",
  operator: "Operator",
  salvage: "SALVAGE",
  salvageHint: "1 AP · đúng hệ sẽ thu hồi sạch",
  sync: "SYNC BURST",
  syncHint: "2 AP · cần cặp synergy",
  brace: "BRACE LANE",
  braceHint: "1 AP · chặn tín hiệu sắp tới",
  shift: "SHIFT",
  shiftHint: "Đổi lane · đặt đúng người trước đúng rủi ro",
  endTurn: "Khóa lane & kết thúc lượt",
  intent: "Ý định tín hiệu",
  secured: "SECURED",
  jammed: "JAMMED",
  chooseLane: "Chọn lane",
  selectTarget: "Chọn một node để xử lý",
  clean: "Đọc đúng hệ",
  wrong: "Sai hệ · node mất ổn định",
  victory: "DÂY CHUYỀN ĐƯỢC CỨU",
  victoryBody: "Đội hình đã biến kiến thức phân loại thành quyết định chiến thuật.",
  defeat: "MẠNG THU HỒI SỤP",
  defeatBody: "Nhiễm bẩn vượt kiểm soát. Đổi đội hình và thử một route khác.",
  retry: "Chạy lại route",
  back: "Về bản đồ",
  score: "Recovery score",
  reward: "Thưởng máy chủ",
  claiming: "Đang xác minh run…",
  claimFailed: "Run kết thúc nhưng phần thưởng chưa được cộng.",
  duplicate: "Mốc sao này đã nhận trước đó",
  exp: "EXP",
  shards: "mảnh",
  card: "thẻ",
  gift: "quà đặc biệt",
  recipient: "Họ tên người nhận",
  address: "Địa chỉ nhận quà",
  redeem: "Xác nhận nhận quà",
  redeeming: "Đang tạo yêu cầu giao quà…",
  redeemed: "Đã tạo yêu cầu giao quà",
  insufficient: "Chưa đủ năng lượng chiến dịch",
  noAp: "Hết AP — hãy khóa lane để kết thúc lượt.",
} as const;
const en = {
  op: "TACTICAL SALVAGE RUN",
  brief: "This is not a turn-based brawl. It is a failing recovery line.",
  body: "Every signal telegraphs a risk. Place the right operator in the right lane, read the material, and pair systems for clean recovery — or accept contamination to keep tempo.",
  deploy: "Deploy squad",
  deployHint: "Pick 3 units. Selection order enters FRONT / MID / BACK; SHIFT during the run.",
  start: "Start salvage run",
  needTeam: "Three owned units required",
  nodes: "signals to recover",
  run: "SALVAGE GRID",
  ap: "AP",
  integrity: "System integrity",
  contamination: "Contamination",
  combo: "Clean chain",
  target: "Open node",
  material: "Read material",
  operator: "Operator",
  salvage: "SALVAGE",
  salvageHint: "1 AP · matching the material recovers it clean",
  sync: "SYNC BURST",
  syncHint: "2 AP · requires a synergy pair",
  brace: "BRACE LANE",
  braceHint: "1 AP · block the incoming signal",
  shift: "SHIFT",
  shiftHint: "Move lane · place the right unit before the risk",
  endTurn: "Lock lane & end turn",
  intent: "Signal intent",
  secured: "SECURED",
  jammed: "JAMMED",
  chooseLane: "Choose lane",
  selectTarget: "Select a node to process",
  clean: "Material read correct",
  wrong: "Wrong material · node destabilized",
  victory: "RECOVERY LINE SAVED",
  victoryBody: "The squad turned material knowledge into real tactical decisions.",
  defeat: "RECOVERY NETWORK COLLAPSED",
  defeatBody: "Contamination exceeded control. Change formation and try another route.",
  retry: "Retry route",
  back: "Back to map",
  score: "Recovery score",
  reward: "Server reward",
  claiming: "Verifying run…",
  claimFailed: "The run ended but the reward could not be credited.",
  duplicate: "This star tier was already claimed",
  exp: "EXP",
  shards: "shards",
  card: "card",
  gift: "special gift",
  recipient: "Recipient name",
  address: "Delivery address",
  redeem: "Confirm delivery",
  redeeming: "Creating delivery request…",
  redeemed: "Delivery request created",
  insufficient: "Not enough campaign energy",
  noAp: "No AP — lock a lane to end the turn.",
} as const;

function roleLabel(role: CampaignRole, english: boolean) {
  const labels: Record<CampaignRole, [string, string]> = {
    vanguard: ["Tiên phong", "Vanguard"],
    striker: ["Đột kích", "Striker"],
    controller: ["Điều khiển", "Controller"],
    support: ["Hỗ trợ", "Support"],
    specialist: ["Chuyên gia", "Specialist"],
  };
  return labels[role][english ? 1 : 0];
}
function intentMeta(intent: CampaignIntent, english: boolean) {
  if (intent === "impact")
    return {
      label: "IMPACT",
      detail: english ? "Hits the occupied lane" : "Đập vào lane đang bị chiếm",
      color: "#fb7185",
    };
  if (intent === "spill")
    return {
      label: "SPILL",
      detail: english ? "Spreads contamination" : "Lan nhiễm bẩn ra hệ thống",
      color: "#fbbf24",
    };
  return {
    label: "JAM",
    detail: english ? "Locks one operator" : "Khóa một operator",
    color: "#c084fc",
  };
}

export default function CampaignStage({
  regionId: regionIdProp,
  stageId: stageIdProp,
  onBack,
  onProgress,
}: Props) {
  const { t, i18n } = useTranslation();
  const params = useParams<{ regionId: string; stageId: string }>();
  const region = getRegionById(regionIdProp || params.regionId || "");
  const stageId = stageIdProp || params.stageId || "";
  const stage = getStageById(region?.id || "", stageId);
  const english = !i18n.resolvedLanguage?.startsWith("vi");
  const c = english ? en : vi;
  const encounters = useMemo(() => {
    if (!stage) return [];
    const ids = [
      ...stage.trashCardIds.slice(0, 4),
      ...(stage.bossCardId
        ? [stage.bossCardId]
        : stage.trashCardIds[4]
          ? [stage.trashCardIds[4]]
          : []),
    ];
    return [...new Set(ids)]
      .map((id) => FLAGSHIP_CARDS.find((card) => card.id === id))
      .filter((card): card is (typeof FLAGSHIP_CARDS)[number] => Boolean(card));
  }, [stage]);
  const [phase, setPhase] = useState<Phase>("briefing");
  const [run, setRun] = useState<CampaignCombatState | null>(null);
  const [events, setEvents] = useState<CampaignCommandEvent[]>([]);
  const [answers, setAnswers] = useState<Record<number, CardElementId>>({});
  const [ownedIds, setOwnedIds] = useState<number[]>([]);
  const [teamIds, setTeamIds] = useState<number[]>([]);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [operatorId, setOperatorId] = useState<number | null>(null);
  const [secondId, setSecondId] = useState<number | null>(null);
  const [lane, setLane] = useState<CampaignLane>("front");
  const [material, setMaterial] = useState<CardElementId>("plastic");
  const [stamina, setStamina] = useState(100);
  const [maxStamina, setMaxStamina] = useState(100);
  const [notice, setNotice] = useState("");
  const [rewardPreview, setRewardPreview] = useState<RewardPreview | null>(null);
  const [rewardState, setRewardState] = useState<RewardState>("idle");
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [earnedShards, setEarnedShards] = useState(0);
  const [serverStars, setServerStars] = useState(0);
  const [cardReward, setCardReward] = useState<number | null>(null);
  const [giftId, setGiftId] = useState<string | null>(null);
  const [giftName, setGiftName] = useState<string | null>(null);
  const [giftRecipient, setGiftRecipient] = useState("");
  const [giftAddress, setGiftAddress] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [giftSaving, setGiftSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/campaign/config", { headers: getAuthHeaders() })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled || !payload) return;
        const config = payload.rewardConfigs?.find(
          (item: { stageId?: string }) => item.stageId === stageId,
        );
        if (config) {
          setRewardPreview(config);
          const unlocked = payload.progress?.campaignGiftByStage?.[stageId];
          const redeemed =
            Array.isArray(payload.progress?.campaignRedeemedStages) &&
            payload.progress.campaignRedeemedStages.includes(stageId);
          if (unlocked && !redeemed) setGiftId(String(unlocked));
          const catalog = Array.isArray(payload.rewardCatalog)
            ? payload.rewardCatalog.find(
                (item: { id?: string | number }) =>
                  String(item.id) === String(unlocked || config.rewardId),
              )
            : null;
          if (catalog?.name) setGiftName(String(catalog.name));
        }
        setStamina(Math.max(0, Number(payload.progress?.stamina ?? 100)));
        setMaxStamina(Math.max(1, Number(payload.progress?.maxStamina ?? 100)));
        const roster = new Set(FLAGSHIP_CARDS.map((card) => card.id));
        const owned = Array.isArray(payload.progress?.flashcardsRead)
          ? payload.progress.flashcardsRead.map(Number).filter((id: number) => roster.has(id))
          : [];
        setOwnedIds(owned);
        setTeamIds((current) =>
          current.filter((id) => owned.includes(id)).length === 3
            ? current.filter((id) => owned.includes(id))
            : owned.slice(0, 3),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [stageId]);

  if (!region || !stage)
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <p className="mb-4 text-xl">{t("campaign.stageNotFound")}</p>
          <button onClick={onBack} className="rounded-xl bg-emerald-600 px-6 py-3 font-bold">
            {c.back}
          </button>
        </div>
      </div>
    );
  const stageTitle = t(
    stage.nameKey.startsWith("campaign.")
      ? stage.nameKey.replace(/^campaign\./, "stages.")
      : stage.nameKey,
    { defaultValue: stage.nameKey },
  );
  const teamCards = teamIds
    .map((id) => FLAGSHIP_CARDS.find((card) => card.id === id))
    .filter((card): card is (typeof FLAGSHIP_CARDS)[number] => Boolean(card));
  const selectedTarget =
    run?.targets.find((item) => item.id === targetId) ||
    run?.targets.find((item) => !item.resolved);
  const selectedOperator = run?.operators.find((item) => item.id === operatorId);
  const stageTone =
    stage.type === "boss"
      ? "from-rose-500 to-red-950"
      : stage.type === "elite"
        ? "from-violet-500 to-indigo-950"
        : "from-emerald-500 to-teal-950";

  const toggleTeam = (id: number) =>
    setTeamIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length >= 3
          ? [...current.slice(1), id]
          : [...current, id],
    );
  const start = () => {
    if (teamCards.length !== 3) return setNotice(c.needTeam);
    if (stamina < stage.staminaCost) return setNotice(c.insufficient);
    const team: CampaignTeamCard[] = teamCards.map((card) => {
      const profile = getCardHeroProfile(card);
      return {
        id: card.id,
        elementId: card.element.id as CardElementId,
        role: profile.role,
        name: profile.callsign,
        maxHp: Math.max(78, card.hp),
      };
    });
    const next = createCampaignRun(
      `run_${stage.id}_${Date.now()}`,
      team,
      encounters.map((card) => ({
        id: card.id,
        elementId: card.element.id as CardElementId,
        name: tCardName(card.name),
      })),
    );
    setRun(next);
    setEvents([]);
    setAnswers({});
    setTargetId(next.activeTargetId);
    setOperatorId(next.operators[0]?.id ?? null);
    setSecondId(null);
    setMaterial(next.operators[0]?.elementId ?? "plastic");
    setNotice("");
    setRewardState("idle");
    setPhase("run");
  };
  const claim = async (
    nextAnswers: Record<number, CardElementId>,
    nextEvents: CampaignCommandEvent[],
  ) => {
    setRewardState("claiming");
    try {
      const response = await fetch(`/api/campaign/stages/${stage.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          answers: encounters.map((card) => ({
            cardId: card.id,
            elementId: nextAnswers[card.id] || "",
          })),
          teamCardIds: teamIds,
          combat: { events: nextEvents },
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success || !result?.cleared)
        throw new Error(result?.error || c.claimFailed);
      setEarnedPoints(Number(result.reward?.points || 0));
      setEarnedShards(Number(result.reward?.shards || 0));
      setServerStars(Number(result.stars || 0));
      setCardReward(result.reward?.cardId ? Number(result.reward.cardId) : null);
      setGiftId(result.reward?.rewardId ? String(result.reward.rewardId) : null);
      setStamina(Number(result.stamina ?? stamina));
      setMaxStamina(Number(result.maxStamina ?? maxStamina));
      setRewardState(result.duplicate ? "duplicate" : "claimed");
      onProgress?.(result);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : c.claimFailed);
      setRewardState("failed");
    }
  };
  const act = (command: CampaignCommand) => {
    if (!run) return;
    const outcome = applyCampaignCommand(run, command);
    if (outcome.event.result === "invalid") return setNotice(run.ap <= 0 ? c.noAp : c.operator);
    const nextAnswers = { ...answers };
    if (command.type === "salvage" || command.type === "sync")
      nextAnswers[command.targetId] = command.claimedElementId;
    const nextEvents = [...events, outcome.event];
    setRun(outcome.state);
    setEvents(nextEvents);
    setAnswers(nextAnswers);
    setTargetId(outcome.state.activeTargetId);
    setNotice(
      outcome.event.result === "clean"
        ? c.clean
        : outcome.event.result === "contaminated"
          ? c.wrong
          : "",
    );
    if (outcome.state.status !== "active") {
      setPhase("result");
      if (outcome.state.status === "victory") void claim(nextAnswers, nextEvents);
    }
  };
  const selectOperator = (id: number) => {
    if (operatorId === id) {
      if (secondId !== null) setSecondId(null);
      else setOperatorId(null);
    } else if (secondId === id) setSecondId(null);
    else if (operatorId !== null && secondId === null) setSecondId(id);
    else setOperatorId(id);
    const unit = run?.operators.find((item) => item.id === id);
    if (unit && operatorId === null) setMaterial(unit.elementId);
  };
  const redeem = async () => {
    setGiftSaving(true);
    try {
      const response = await fetch(`/api/campaign/stages/${stage.id}/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ redeemInfo: { fullName: giftRecipient, address: giftAddress } }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) throw new Error(result?.error || c.claimFailed);
      setGiftMessage(`${c.redeemed} · ${result.redemptionId}`);
      onProgress?.(result);
    } catch (error) {
      setGiftMessage(error instanceof Error ? error.message : c.claimFailed);
    } finally {
      setGiftSaving(false);
    }
  };
  const reset = () => {
    setPhase("briefing");
    setRun(null);
    setEvents([]);
    setAnswers({});
    setRewardState("idle");
    setNotice("");
  };

  return (
    <div className="fixed inset-0 overflow-auto bg-[#020b0a] text-white">
      <img
        src={BMO_ASSETS.campaignArena}
        alt=""
        aria-hidden="true"
        className="fixed inset-0 h-full w-full object-cover opacity-35"
      />
      <div className="fixed inset-0 bg-black/65" />
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#031713]/85 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <button onClick={onBack} className="rounded-xl border border-white/10 bg-white/10 p-2">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-black">{stageTitle}</p>
            <p className="truncate text-xs text-white/50">
              {t(region.nameKey)} · {c.op}
            </p>
          </div>
          <div className="rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-sm font-black text-amber-200">
            <Zap className="mr-1 inline h-4 w-4" />
            {stamina}/{maxStamina}
          </div>
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-6xl px-4 py-6">
        <AnimatePresence mode="wait">
          {phase === "briefing" && (
            <Briefing
              c={c}
              stageTitle={stageTitle}
              region={region}
              encounters={encounters}
              teamCards={teamCards}
              ownedIds={ownedIds}
              teamIds={teamIds}
              rewardPreview={rewardPreview}
              notice={notice}
              stageTone={stageTone}
              toggleTeam={toggleTeam}
              start={start}
            />
          )}
          {phase === "run" && run && (
            <RunBoard
              c={c}
              english={english}
              run={run}
              encounters={encounters}
              selectedTarget={selectedTarget}
              selectedOperator={selectedOperator}
              targetId={targetId}
              operatorId={operatorId}
              secondId={secondId}
              lane={lane}
              material={material}
              notice={notice}
              setTargetId={setTargetId}
              setLane={setLane}
              setMaterial={setMaterial}
              selectOperator={selectOperator}
              act={act}
            />
          )}
          {phase === "result" && run && (
            <Result
              c={c}
              run={run}
              rewardState={rewardState}
              serverStars={serverStars}
              earnedPoints={earnedPoints}
              earnedShards={earnedShards}
              cardReward={cardReward}
              giftId={giftId}
              giftName={giftName}
              giftRecipient={giftRecipient}
              giftAddress={giftAddress}
              giftMessage={giftMessage}
              giftSaving={giftSaving}
              setGiftRecipient={setGiftRecipient}
              setGiftAddress={setGiftAddress}
              redeem={redeem}
              reset={reset}
              onBack={onBack}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function Briefing({
  c,
  stageTitle,
  region,
  encounters,
  teamCards,
  ownedIds,
  teamIds,
  rewardPreview,
  notice,
  stageTone,
  toggleTeam,
  start,
}: BriefingProps) {
  return (
    <motion.section
      key="briefing"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-3xl border border-cyan-200/15 bg-[#061d19]/90 shadow-2xl"
    >
      <div className={`bg-gradient-to-r ${stageTone} p-6 sm:p-9`}>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-3 py-1 text-xs font-black">
          <Radar className="h-4 w-4" />
          {c.op}
        </div>
        <h1 className="text-3xl font-black sm:text-5xl">{stageTitle}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80">{c.brief}</p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">{c.body}</p>
      </div>
      <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200/60">
            {region.elementId} · {encounters.length} {c.nodes}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {encounters.map((card, index) => (
              <div
                key={card.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-2"
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl">
                  {getCardArt(card.id, card.element.id, card.artVariant || 1, card.rarity.id)}
                  <span className="absolute left-1 top-1 rounded bg-black/70 px-1 text-[9px]">
                    N{index + 1}
                  </span>
                </div>
                <p className="mt-1 truncate text-center text-[10px]">{tCardName(card.name)}</p>
              </div>
            ))}
          </div>
          {rewardPreview && (
            <p className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/10 p-3 text-xs font-bold text-amber-100">
              3★ · +{rewardPreview.points} {c.exp} · +{rewardPreview.shards} {c.shards}
            </p>
          )}
        </div>
        <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-black">{c.deploy}</p>
              <p className="mt-1 text-xs text-white/50">{c.deployHint}</p>
            </div>
            <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
              {teamIds.length}/3
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {CAMPAIGN_LANES.map((lane: CampaignLane, index: number) => (
              <div
                key={lane}
                className="min-h-24 rounded-xl border border-dashed border-white/15 p-2"
              >
                <p className="text-[9px] text-white/40">{getLaneLabel(lane)}</p>
                {teamCards[index] ? (
                  <div className="mt-2 overflow-hidden rounded-lg">
                    <div className="aspect-[3/2]">
                      {getCardArt(
                        teamCards[index].id,
                        teamCards[index].element.id,
                        teamCards[index].artVariant || 1,
                        teamCards[index].rarity.id,
                      )}
                    </div>
                    <p className="truncate text-[9px] font-bold">
                      {getCardHeroProfile(teamCards[index]).callsign}
                    </p>
                  </div>
                ) : (
                  <MapPin className="mx-auto mt-8 h-4 w-4 text-white/20" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 max-h-52 overflow-auto">
            <div className="grid grid-cols-2 gap-2">
              {ownedIds.map((id: number) => {
                const card = FLAGSHIP_CARDS.find((item) => item.id === id);
                if (!card) return null;
                const selected = teamIds.includes(id);
                const profile = getCardHeroProfile(card);
                return (
                  <button
                    key={id}
                    onClick={() => toggleTeam(id)}
                    className={`flex items-center gap-2 rounded-xl border p-2 text-left ${selected ? "border-cyan-300/60 bg-cyan-300/10" : "border-white/10 bg-white/[0.03]"}`}
                  >
                    <div className="h-9 w-7 overflow-hidden rounded">
                      <>
                        {getCardArt(card.id, card.element.id, card.artVariant || 1, card.rarity.id)}
                      </>
                    </div>
                    <span className="min-w-0 truncate text-[10px]">{profile.callsign}</span>
                    {selected && <Check className="ml-auto h-4 w-4 text-cyan-200" />}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            onClick={start}
            disabled={teamIds.length !== 3}
            className="mt-4 w-full rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-40"
          >
            {teamIds.length === 3 ? c.start : c.needTeam}
          </button>
          {notice && <p className="mt-2 text-center text-xs text-amber-200">{notice}</p>}
        </div>
      </div>
    </motion.section>
  );
}

function RunBoard({
  c,
  english,
  run,
  encounters,
  selectedTarget,
  selectedOperator,
  targetId,
  operatorId,
  secondId,
  lane,
  material,
  notice,
  setTargetId,
  setLane,
  setMaterial,
  selectOperator,
  act,
}: RunBoardProps) {
  const operatorsIn = (selectedLane: CampaignLane) =>
    run.operators.filter((operator) => operator.lane === selectedLane);
  const secondOperator = run.operators.find((operator) => operator.id === secondId);
  const syncReady =
    selectedOperator &&
    secondOperator &&
    isMaterialSynergy(selectedOperator.elementId, secondOperator.elementId);
  return (
    <motion.section
      key="run"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          [c.ap, `${run.ap}/${run.maxAp}`],
          [c.integrity, `${run.integrity}/${run.maxIntegrity}`],
          [c.contamination, run.contamination],
          [c.combo, `x${run.combo}`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] p-4">
            <p className="text-[10px] font-black uppercase text-white/55">{label}</p>
            <p className="mt-1 text-3xl font-black">{value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-3xl border border-cyan-200/15 bg-[#061d19]/90 p-4 shadow-2xl sm:p-6">
        <div className="flex justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200/60">
              {c.run} · TURN {run.turn}
            </p>
            <p className="mt-1 text-sm text-white/60">{run.lastEnemyAction}</p>
          </div>
          <span className="rounded-full bg-rose-300/10 px-3 py-1 text-xs font-black">
            {countResolvedTargets(run)}/{run.targets.length} {c.secured}
          </span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-5">
          {run.targets.map((target, index) => {
            const card = encounters.find((item) => item.id === target.id);
            const meta = intentMeta(target.intent, english);
            return (
              <button
                key={target.id}
                onClick={() => setTargetId(target.id)}
                className={`rounded-2xl border p-2 text-left ${target.resolved ? "border-emerald-300/50 bg-emerald-300/10" : targetId === target.id ? "border-cyan-300/70 bg-cyan-300/10" : "border-white/10 bg-white/[0.03]"}`}
              >
                <div className="aspect-[3/2] overflow-hidden rounded-xl">
                  {card &&
                    getCardArt(card.id, card.element.id, card.artVariant || 1, card.rarity.id)}
                </div>
                <div className="mt-2 flex justify-between text-[9px] font-black">
                  <span>
                    N{index + 1} · {getLaneLabel(target.lane)}
                  </span>
                  <span style={{ color: target.resolved ? "#86efac" : meta.color }}>
                    {target.resolved ? "✓" : meta.label}
                  </span>
                </div>
                <p className="truncate text-[10px]">{card ? tCardName(card.name) : target.id}</p>
                {!target.resolved && (
                  <div
                    className="mt-1 h-1 rounded bg-cyan-300"
                    style={{ width: `${target.integrity}%` }}
                  />
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2">
              <CircleHelp className="h-5 w-5 text-cyan-200" />
              <div>
                <p className="text-[10px] uppercase text-cyan-200/60">{c.target}</p>
                <p className="font-black">
                  {selectedTarget
                    ? tCardName(
                        encounters.find((card) => card.id === selectedTarget.id)?.name ||
                          selectedTarget.name ||
                          `#${selectedTarget.id}`,
                      )
                    : c.selectTarget}
                </p>
                <p className="text-xs text-white/50">
                  {selectedTarget && !selectedTarget.resolved
                    ? intentMeta(selectedTarget.intent, english).detail
                    : c.secured}
                </p>
              </div>
            </div>
            {selectedTarget && !selectedTarget.resolved && (
              <div className="mt-3">
                <p className="text-[10px] uppercase text-amber-200/60">{c.material}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {ELEMENTS.map((element) => (
                    <button
                      key={element.id}
                      onClick={() => setMaterial(element.id as CardElementId)}
                      className={`rounded-lg border px-2 py-1 text-[10px] ${material === element.id ? "border-cyan-200 bg-cyan-300/20" : "border-white/10"}`}
                    >
                      {CARD_ELEMENT_IDENTITIES[element.id as CardElementId].icon} {element.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="mb-2 text-[10px] uppercase text-white/45">
              {c.operator}: {selectedOperator?.name || "—"}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {CAMPAIGN_LANES.map((selectedLane) => (
                <div key={selectedLane} className="rounded-xl border border-white/10 p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/40">{getLaneLabel(selectedLane)}</span>
                    <button
                      onClick={() => setLane(selectedLane)}
                      className="text-[9px] text-cyan-200"
                    >
                      {c.chooseLane}
                    </button>
                  </div>
                  {operatorsIn(selectedLane).map((operator) => (
                    <button
                      key={operator.id}
                      onClick={() => selectOperator(operator.id)}
                      className={`mt-1 w-full rounded-lg border p-2 text-left text-[10px] ${operatorId === operator.id || secondId === operator.id ? "border-cyan-300/70 bg-cyan-300/10" : "border-white/10"}`}
                    >
                      <b className="block truncate">
                        {operatorId === operator.id
                          ? "A · "
                          : secondId === operator.id
                            ? "B · "
                            : ""}
                        {operator.name || operator.id}
                      </b>
                      <span className="text-cyan-200/60">
                        {operator.elementId} · {roleLabel(operator.role, english)}
                      </span>
                      <span className="block text-[9px] text-white/35">
                        {english
                          ? CARD_ELEMENT_IDENTITIES[operator.elementId as CardElementId].mechanicEn
                          : CARD_ELEMENT_IDENTITIES[operator.elementId as CardElementId].mechanicVi}
                      </span>
                      <span className="block text-white/45">
                        HP {operator.hp}/{operator.maxHp} {operator.jammed ? `· ${c.jammed}` : ""}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <button
            disabled={
              !selectedTarget || selectedTarget.resolved || operatorId === null || run.ap < 1
            }
            onClick={() =>
              selectedTarget &&
              operatorId !== null &&
              act({
                type: "salvage",
                targetId: selectedTarget.id,
                operatorId,
                claimedElementId: material,
              })
            }
            className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 p-3 text-left disabled:opacity-40"
          >
            <b>
              <Crosshair className="mr-1 inline h-4 w-4" />
              {c.salvage}
            </b>
            <small className="mt-1 block text-white/50">{c.salvageHint}</small>
          </button>
          <button
            disabled={
              !selectedTarget ||
              selectedTarget.resolved ||
              operatorId === null ||
              secondId === null ||
              !syncReady ||
              run.ap < 2
            }
            onClick={() =>
              selectedTarget &&
              operatorId !== null &&
              secondId !== null &&
              act({
                type: "sync",
                targetId: selectedTarget.id,
                firstOperatorId: operatorId,
                secondOperatorId: secondId,
                claimedElementId: material,
              })
            }
            className="rounded-xl border border-fuchsia-300/30 bg-fuchsia-300/10 p-3 text-left disabled:opacity-40"
          >
            <b>
              <Sparkles className="mr-1 inline h-4 w-4" />
              {c.sync}
            </b>
            <small className="mt-1 block text-white/50">{c.syncHint}</small>
          </button>
          <button
            disabled={run.ap < 1}
            onClick={() => act({ type: "brace", lane })}
            className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 p-3 text-left disabled:opacity-40"
          >
            <b>
              <Shield className="mr-1 inline h-4 w-4" />
              {c.brace}
            </b>
            <small className="mt-1 block text-white/50">{c.braceHint}</small>
          </button>
          <button
            disabled={run.ap < 1 || operatorId === null}
            onClick={() => operatorId !== null && act({ type: "shift", operatorId, lane })}
            className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-left disabled:opacity-40"
          >
            <b>
              <Gauge className="mr-1 inline h-4 w-4" />
              {c.shift}
            </b>
            <small className="mt-1 block text-white/50">{c.shiftHint}</small>
          </button>
        </div>
        <div className="mt-3 flex justify-between border-t border-white/10 pt-3">
          <p className="text-xs text-white/55">{notice}</p>
          <button
            onClick={() => act({ type: "commit" })}
            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black"
          >
            <LockKeyhole className="mr-1 inline h-3.5 w-3.5" />
            {c.endTurn}
          </button>
        </div>
      </div>
    </motion.section>
  );
}

function Result({
  c,
  run,
  rewardState,
  serverStars,
  earnedPoints,
  earnedShards,
  cardReward,
  giftId,
  giftName,
  giftRecipient,
  giftAddress,
  giftMessage,
  giftSaving,
  setGiftRecipient,
  setGiftAddress,
  redeem,
  reset,
  onBack,
}: ResultProps) {
  return (
    <motion.section
      key="result"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-[#061d19]/95 shadow-2xl"
    >
      <div
        className={`p-8 ${run.status === "victory" ? "bg-gradient-to-r from-emerald-500 to-cyan-800" : "bg-gradient-to-r from-rose-500 to-indigo-950"}`}
      >
        <div className="flex items-center gap-3">
          {run.status === "victory" ? <Trophy /> : <X />}
          <h1 className="text-3xl font-black">{run.status === "victory" ? c.victory : c.defeat}</h1>
        </div>
        <p className="mt-3 text-sm text-white/80">
          {run.status === "victory" ? c.victoryBody : c.defeatBody}
        </p>
      </div>
      <div className="grid gap-3 p-6 sm:grid-cols-3">
        <div className="rounded-xl bg-cyan-300/10 p-4">
          <small>{c.score}</small>
          <p className="text-3xl font-black">{getCampaignRunScore(run)}</p>
        </div>
        <div className="rounded-xl bg-emerald-300/10 p-4">
          <small>{c.secured}</small>
          <p className="text-3xl font-black">
            {countResolvedTargets(run)}/{run.targets.length}
          </p>
        </div>
        <div className="rounded-xl bg-fuchsia-300/10 p-4">
          <small>{c.combo}</small>
          <p className="text-3xl font-black">x{run.bestCombo}</p>
        </div>
      </div>
      {run.status === "victory" && (
        <div className="mx-6 rounded-xl border border-amber-300/20 bg-amber-300/10 p-4">
          <p className="font-black text-amber-100">{c.reward}</p>
          {rewardState === "claiming" && <p className="mt-2 text-xs">{c.claiming}</p>}
          {rewardState === "failed" && (
            <p className="mt-2 text-xs text-rose-200">{c.claimFailed}</p>
          )}
          {(rewardState === "claimed" || rewardState === "duplicate") && (
            <p className="mt-2 text-xs text-amber-100">
              ★ {serverStars} · +{earnedPoints} {c.exp} · +{earnedShards} {c.shards}{" "}
              {cardReward ? `· #${cardReward} ${c.card}` : ""}{" "}
              {rewardState === "duplicate" ? `· ${c.duplicate}` : ""}
            </p>
          )}
        </div>
      )}
      {giftId && (
        <div className="mx-6 mt-4 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-4">
          <p className="font-black text-cyan-100">{giftName || c.gift}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              value={giftRecipient}
              onChange={(event) => setGiftRecipient(event.target.value)}
              placeholder={c.recipient}
              className="rounded-lg bg-black/20 p-2 text-sm"
            />
            <input
              value={giftAddress}
              onChange={(event) => setGiftAddress(event.target.value)}
              placeholder={c.address}
              className="rounded-lg bg-black/20 p-2 text-sm"
            />
          </div>
          <button
            onClick={redeem}
            disabled={giftSaving || !giftRecipient || !giftAddress}
            className="mt-3 rounded-lg bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950"
          >
            {giftSaving ? c.redeeming : c.redeem}
          </button>
          {giftMessage && <p className="mt-2 text-xs">{giftMessage}</p>}
        </div>
      )}
      <div className="flex justify-end gap-3 p-6">
        <button
          onClick={reset}
          className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black"
        >
          <RotateCcw className="mr-1 inline h-4 w-4" />
          {c.retry}
        </button>
        <button
          onClick={onBack}
          className="rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950"
        >
          <ArrowLeft className="mr-1 inline h-4 w-4" />
          {c.back}
        </button>
      </div>
    </motion.section>
  );
}
