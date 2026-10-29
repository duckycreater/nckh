import React, { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  ChevronRight,
  Copy,
  Gamepad2,
  Layers3,
  Loader2,
  RefreshCw,
  Scale,
  Search,
  ScanLine,
  ShieldCheck,
  Swords,
} from "lucide-react";
import type {
  MatchState,
  MaterialCard,
  MaterialScenarioObject,
  ProcessingAction,
  SortingAction,
  WasteCategory,
} from "../../shared/materialCards";
import { getAuthHeaders } from "../lib/auth";
import { Badge, Button, ErrorRetry, ModalHeader, ModalShell, Tabs } from "../lib/ui";
import { toUserMessage } from "../lib/userFacingError";
import { MATERIAL_LABELS, MaterialVisual } from "./MaterialVisual";

interface MaterialCardsProps {
  actorNick: string;
  refreshKey?: number;
  onScan: () => void;
}

type Section = "collection" | "challenge" | "battle";

const CATEGORY: Record<WasteCategory, { label: string; accent: string; mark: string }> = {
  plastic: { label: "Nhựa", accent: "bg-cyan-500", mark: "P" },
  paper: { label: "Giấy", accent: "bg-amber-500", mark: "G" },
  glass: { label: "Thủy tinh", accent: "bg-sky-500", mark: "T" },
  metal: { label: "Kim loại", accent: "bg-slate-500", mark: "K" },
  organic: { label: "Hữu cơ", accent: "bg-emerald-500", mark: "H" },
  hazard: { label: "Thu gom riêng", accent: "bg-rose-500", mark: "!" },
};

const ACTIONS: Array<{ id: SortingAction; label: string }> = [
  { id: "recycle", label: "Tái chế" },
  { id: "compost", label: "Ủ hữu cơ" },
  { id: "special_collection", label: "Thu gom riêng" },
  { id: "residual", label: "Rác còn lại" },
];

const PROCESSING_ACTIONS: Array<{ id: ProcessingAction; label: string }> = [
  { id: "clean", label: "Làm sạch" },
  { id: "dry", label: "Làm khô" },
  { id: "protect", label: "Bảo vệ" },
];

function parseError(value: unknown, fallback: string) {
  return toUserMessage(value, fallback);
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...getAuthHeaders(),
      ...init?.headers,
    },
  });
  const payload = (await response.json().catch(() => null)) as T;
  if (!response.ok)
    throw new Error(parseError(payload, `Yêu cầu thất bại (HTTP ${response.status}).`));
  return payload;
}

function CardImage({ card, compact = false }: { card: MaterialCard; compact?: boolean }) {
  return (
    <MaterialVisual
      category={card.category}
      imageUrl={card.imageUrl}
      objectName={card.objectName}
      propertyIds={card.properties.map((property) => property.id)}
      className={compact ? "h-16 w-16 min-h-0 rounded-[8px]" : "aspect-[4/3] w-full min-h-0"}
    />
  );
}

function CollectionCard({
  card,
  onOpen,
  compareSelected,
  onToggleCompare,
}: {
  card: MaterialCard;
  onOpen: (trigger: HTMLButtonElement) => void;
  compareSelected: boolean;
  onToggleCompare: () => void;
}) {
  const visibleProperties = card.properties.filter((property) => property.value === true).slice(0, 2);
  return (
    <article className="overflow-hidden rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface)] transition-colors hover:border-[var(--border-strong)]">
      <div className="relative">
        <CardImage card={card} />
        <span className="absolute bottom-3 left-3 rounded-[6px] border border-white/25 bg-black/55 px-2 py-1 text-[10px] font-semibold text-white">
          {MATERIAL_LABELS[card.category]}
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 truncate text-base font-semibold text-[var(--graphite)]">
            {card.objectName}
          </h3>
          <button
            type="button"
            aria-pressed={compareSelected}
            onClick={onToggleCompare}
            className={
              "inline-flex min-h-9 shrink-0 items-center gap-1 rounded-[6px] border px-2 text-xs font-semibold " +
              (compareSelected
                ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border-strong)]")
            }
          >
            <Scale size={13} /> So sánh
          </button>
        </div>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Thẻ từ lần quét · {new Date(card.createdAt).toLocaleDateString("vi-VN")}
        </p>
        <div className="mt-4 flex min-h-7 flex-wrap gap-1.5">
          {visibleProperties.map((property) => (
            <Badge key={property.id} tone={property.source === "visual_observation" ? "accent" : "default"}>
              {property.label}
            </Badge>
          ))}
        </div>
        <Button onClick={(event) => onOpen(event.currentTarget)} variant="ghost" size="sm" className="mt-4 w-full">
          Xem hộ chiếu <ChevronRight size={15} />
        </Button>
      </div>
    </article>
  );
}

function CardDetail({ card, onClose, returnFocus }: { card: MaterialCard; onClose: () => void; returnFocus: HTMLElement | null }) {
  return (
    <ModalShell onClose={onClose} returnFocus={returnFocus} title={`Hộ chiếu ${card.objectName}`} className="max-h-[calc(100dvh-2rem)] max-w-4xl overflow-y-auto">
      <ModalHeader title={card.objectName} subtitle={`${MATERIAL_LABELS[card.category]} · ${new Date(card.createdAt).toLocaleDateString("vi-VN")}`} onClose={onClose} />
      <div className="grid gap-0 md:grid-cols-[0.85fr_1.15fr]">
        <CardImage card={card} />
        <div className="space-y-5 p-5 sm:p-6">
          <section>
            <h3 className="text-sm font-semibold text-[var(--graphite)]">Thuộc tính</h3>
            <ul className="mt-3 space-y-3">
              {card.properties.filter((property) => property.value === true).map((property) => (
                <li key={property.id} className="border-b border-[var(--border-subtle)] pb-3 text-sm last:border-0">
                  <div className="flex items-start justify-between gap-3">
                    <strong>{property.label}</strong>
                    <Badge>{property.source === "visual_observation" ? "Quan sát từ ảnh" : property.source === "material_library" ? "Thư viện vật liệu" : "Chưa xác định"}</Badge>
                  </div>
                  <p className="mt-1 leading-6 text-[var(--text-muted)]">{property.evidence}</p>
                </li>
              ))}
            </ul>
          </section>
          <section className="grid gap-3 sm:grid-cols-2">
            {[{ label: "Nội tại", ability: card.passive }, { label: "Chủ động", ability: card.active }].map(({ label, ability }) => (
              <div key={label} className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
                <p className="text-xs font-semibold text-[var(--text-muted)]">{label}</p>
                <p className="mt-2 font-semibold text-[var(--graphite)]">{ability.name}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{ability.description}</p>
                <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">{ability.rule}</p>
              </div>
            ))}
          </section>
          <details className="border-t border-[var(--border-subtle)] pt-4 text-xs text-[var(--text-muted)]">
            <summary className="cursor-pointer font-semibold text-[var(--text-secondary)]">Thông tin chi tiết</summary>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              <div><dt>Phiên bản quy tắc</dt><dd className="font-telemetry mt-1 text-[var(--graphite)]">{card.rulesetVersion}</dd></div>
              <div><dt>Mã hộ chiếu</dt><dd className="font-telemetry mt-1 break-all text-[var(--graphite)]">{card.id}</dd></div>
            </dl>
          </details>
        </div>
      </div>
    </ModalShell>
  );
}

function ComparePassports({
  cards,
  onClose,
}: {
  cards: MaterialCard[];
  onClose: () => void;
}) {
  const properties = Array.from(
    new Map(
      cards
        .flatMap((card) => card.properties)
        .map((property) => [property.id, property.label] as const),
    ),
  );
  return (
    <ModalShell
      onClose={onClose}
      title="So sánh hộ chiếu"
      className="max-h-[calc(100dvh-2rem)] max-w-6xl overflow-y-auto"
    >
      <ModalHeader
        title="So sánh hộ chiếu"
        subtitle="Đối chiếu vật liệu, tình trạng và cách kỹ năng được hình thành."
        onClose={onClose}
      />
      <div className="space-y-6 p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <div key={card.id} className="min-w-0 rounded-[10px] border border-slate-200 p-3">
              <CardImage card={card} compact />
              <h3 className="mt-3 truncate text-sm font-semibold text-slate-950">
                {card.objectName}
              </h3>
              <p className="mt-1 text-xs text-slate-500">{MATERIAL_LABELS[card.category]}</p>
            </div>
          ))}
        </div>
        <section>
          <h3 className="text-sm font-semibold text-slate-950">Thuộc tính</h3>
          <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
            {properties.map(([propertyId, label]) => (
              <div key={propertyId} className="py-3">
                <p className="mb-2 text-xs font-semibold text-slate-500">{label}</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {cards.map((card) => {
                    const property = card.properties.find((item) => item.id === propertyId);
                    return (
                      <div
                        key={card.id}
                        className="rounded-md bg-slate-50 p-2 text-xs leading-5 text-slate-700"
                      >
                        {property?.value === true
                          ? property.source === "visual_observation"
                            ? "Quan sát từ ảnh"
                            : "Theo thư viện vật liệu"
                          : property?.value === false
                            ? "Không phù hợp"
                            : "Chưa xác định"}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h3 className="text-sm font-semibold text-slate-950">Kỹ năng chủ động</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <div key={card.id} className="rounded-[10px] border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-950">{card.active.name}</p>
                <p className="mt-2 text-xs leading-5 text-slate-600">{card.active.rule}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </ModalShell>
  );
}

function expectedFor(card: MaterialCard, variant: number): SortingAction {
  if (card.category === "hazard") return "special_collection";
  if (card.category === "organic") return "compost";
  if ((card.category === "paper" || card.category === "plastic") && variant % 3 === 1)
    return "residual";
  return "recycle";
}

function Challenge({ cards }: { cards: MaterialCard[] }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<SortingAction | null>(null);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(0);
  const card = cards.length ? cards[index % cards.length] : null;
  if (!card)
    return (
      <EmptyState
        title="Chưa có thẻ để học"
        description="Quét một vật thể thật và tạo thẻ trước khi bắt đầu thử thách."
      />
    );
  const expected = expectedFor(card, index);
  const contaminated = expected === "residual";
  const answer = (action: SortingAction) => {
    if (selected) return;
    setSelected(action);
    setAnswered((value) => value + 1);
    if (action === expected) setCorrect((value) => value + 1);
  };
  return (
    <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="overflow-hidden rounded-[14px] border border-slate-200 bg-white">
        <CardImage card={card} />
        <div className="p-5">
          <Badge tone="default">{CATEGORY[card.category].label}</Badge>
          <h3 className="mt-3 text-xl font-black text-slate-950">{card.objectName}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {contaminated
              ? "Tình huống: vật thể đang ướt hoặc dính bẩn và chưa thể làm sạch."
              : card.category === "glass" && index % 2
                ? "Tình huống: vật thể đã vỡ, cần bảo vệ trước khi vận chuyển."
                : "Tình huống: vật thể sạch, đã tách riêng."}
          </p>
        </div>
      </div>
      <div className="rounded-[14px] border border-slate-200 bg-white p-5 sm:p-7">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">
              Bài tập theo thẻ của bạn
            </p>
            <h3 className="mt-2 text-xl font-black text-slate-950">Chọn tuyến xử lý phù hợp</h3>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {correct}/{answered}
          </span>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {ACTIONS.map((action) => {
            const isSelected = selected === action.id;
            const isExpected = selected && expected === action.id;
            return (
              <button
                key={action.id}
                onClick={() => answer(action.id)}
                className={`rounded-[10px] border p-4 text-left text-sm font-bold transition ${isExpected ? "border-emerald-400 bg-emerald-50 text-emerald-900" : isSelected ? "border-red-300 bg-red-50 text-red-800" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-cyan-400"}`}
              >
                {action.label}
              </button>
            );
          })}
        </div>
        {selected && (
          <div
            className={`mt-5 rounded-[10px] p-4 text-sm leading-6 ${selected === expected ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950"}`}
          >
            <strong>{selected === expected ? "Đúng." : "Chưa đúng."}</strong>{" "}
            {contaminated
              ? "Vật liệu tái chế bị ướt/bẩn có thể làm nhiễm dòng thu hồi; trong tình huống này chọn rác còn lại."
              : card.category === "hazard"
                ? "Vật thể này cần tuyến thu gom riêng để tránh nhiễm chéo."
                : card.category === "organic"
                  ? "Vật thể hữu cơ phù hợp được đưa vào tuyến ủ."
                  : "Vật thể sạch được đưa vào đúng tuyến tái chế."}
            <Button
              className="mt-4 w-full"
              variant="ghost"
              onClick={() => {
                setIndex((value) => value + 1);
                setSelected(null);
              }}
            >
              Tình huống tiếp <ChevronRight size={15} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[14px] border border-dashed border-slate-300 bg-white p-10 text-center">
      <Layers3 className="mx-auto text-slate-300" size={38} />
      <h3 className="mt-4 text-lg font-black text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function Battle({ deck, actorNick }: { deck: string[]; actorNick: string }) {
  const [match, setMatch] = useState<MatchState | null>(null);
  const [recentMatches, setRecentMatches] = useState<MatchState[]>([]);
  const [opponent, setOpponent] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [choices, setChoices] = useState<Record<string, SortingAction>>({});
  const [processing, setProcessing] = useState<Record<string, ProcessingAction[]>>({});
  const [abilityCardId, setAbilityCardId] = useState("");
  const [abilityTargetId, setAbilityTargetId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actorIsOpponent = Boolean(
    match &&
    match.opponentId !== "practice-bot" &&
    match.opponentId === actorNick.trim().toLowerCase(),
  );
  const ownSubmissions = actorIsOpponent
    ? (match?.opponentSubmissions ?? [])
    : (match?.playerSubmissions ?? []);
  const round = match?.rounds.find(
    (candidate) => !ownSubmissions.some((item) => item.roundIndex === candidate.index),
  );
  const ownDeck = actorIsOpponent ? (match?.opponentDeck ?? []) : (match?.playerDeck ?? []);
  const lastEvaluation = ownSubmissions
    .slice()
    .sort((left, right) => left.roundIndex - right.roundIndex)
    .at(-1)?.evaluation;
  const processingUsed = Object.values(processing).reduce(
    (total, steps) => total + steps.length,
    0,
  );
  const matchId = match?.id;
  const matchMode = match?.mode;
  const matchStatus = match?.status;

  const loadMatches = useCallback(async () => {
    try {
      const payload = await api<{ matches: MatchState[] }>("/api/material-matches");
      setRecentMatches(payload.matches);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được danh sách trận.");
    }
  }, []);

  useEffect(() => {
    if (!match) void loadMatches();
  }, [loadMatches, match]);

  const refreshMatch = useCallback(async () => {
    if (!matchId) return;
    try {
      const payload = await api<{ match: MatchState }>(
        `/api/material-matches/${encodeURIComponent(matchId)}`,
      );
      setMatch(payload.match);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không cập nhật được trận.");
    }
  }, [matchId]);

  useEffect(() => {
    if (!matchId || matchMode !== "asynchronous" || matchStatus === "completed") return;
    const timer = window.setInterval(() => void refreshMatch(), 10_000);
    return () => window.clearInterval(timer);
  }, [matchId, matchMode, matchStatus, refreshMatch]);

  const create = async (mode: "practice" | "asynchronous") => {
    if (mode === "asynchronous" && (deck.length !== 3 || !opponent.trim())) {
      setError("Chọn đúng ba thẻ và nhập tài khoản đối thủ.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = await api<{ match: MatchState }>("/api/material-matches", {
        method: "POST",
        body: JSON.stringify({
          deckCardIds: mode === "practice" ? deck : deck.slice(0, 3),
          ...(mode === "asynchronous" ? { opponentId: opponent.trim().toLowerCase() } : {}),
        }),
      });
      setMatch(payload.match);
      setChoices({});
      setProcessing({});
      setAbilityCardId("");
      setAbilityTargetId("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tạo được trận.");
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    if (deck.length !== 3 || !joinCode.trim()) {
      setError("Chọn đúng ba thẻ và nhập mã trận.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = await api<{ match: MatchState }>(
        `/api/material-matches/${encodeURIComponent(joinCode.trim())}/join`,
        { method: "POST", body: JSON.stringify({ deckCardIds: deck }) },
      );
      setMatch(payload.match);
      setChoices({});
      setProcessing({});
      setAbilityCardId("");
      setAbilityTargetId("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không vào được trận.");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!match || !round || round.objects.some((object) => !choices[object.id])) return;
    setBusy(true);
    setError(null);
    try {
      const payload = await api<{ match: MatchState }>(`/api/material-matches/${match.id}/rounds`, {
        method: "POST",
        body: JSON.stringify({
          roundIndex: round.index,
          choices: round.objects.map((object) => ({
            objectId: object.id,
            action: choices[object.id],
            steps: processing[object.id] ?? [],
          })),
          ...(abilityCardId ? { abilityCardId } : {}),
          ...(abilityCardId && abilityTargetId ? { abilityTargetId } : {}),
        }),
      });
      setMatch(payload.match);
      setChoices({});
      setProcessing({});
      setAbilityCardId("");
      setAbilityTargetId("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không gửi được lượt chơi.");
    } finally {
      setBusy(false);
    }
  };

  if (!match)
    return (
      <div className="space-y-5">
        {recentMatches.length > 0 && (
          <div className="rounded-[14px] border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-slate-950">Trận của bạn</h3>
                <p className="mt-1 text-sm text-slate-500">Tiếp tục lời mời và trận đang chơi sau khi tải lại trang.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => void loadMatches()}>
                <RefreshCw size={15} /> Làm mới
              </Button>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {recentMatches.slice(0, 6).map((savedMatch) => (
                <button
                  key={savedMatch.id}
                  type="button"
                  onClick={() => setMatch(savedMatch)}
                  className="min-h-11 rounded-[10px] border border-slate-200 p-3 text-left transition-colors hover:border-emerald-500"
                >
                  <span className="block text-xs font-bold uppercase text-slate-400">
                    {savedMatch.status === "active"
                      ? "Đang chơi"
                      : savedMatch.status === "waiting"
                        ? "Đang chờ"
                        : savedMatch.status === "completed"
                          ? "Đã xong"
                          : "Hết hạn"}
                  </span>
                  <span className="mt-1 block font-mono text-sm text-slate-800">
                    {savedMatch.id.slice(0, 8)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[14px] border border-slate-200 bg-white p-6">
          <Gamepad2 className="text-cyan-600" />
          <h3 className="mt-4 text-xl font-black text-slate-950">Luyện tập 5 vòng</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Mỗi vòng có năm lượt xử lý và ba đơn vị vận chuyển. An toàn được ưu tiên trước độ chính
            xác và hiệu quả. Bộ mẫu chỉ dùng trong luyện tập, không ghi thành sở hữu.
          </p>
          <Button className="mt-5 w-full" onClick={() => void create("practice")} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" size={16} /> : null}Bắt đầu với máy
          </Button>
        </div>
        <div className="rounded-[14px] border border-slate-800 bg-slate-950 p-6 text-white">
          <Swords className="text-cyan-300" />
          <h3 className="mt-4 text-xl font-black">Đối kháng bất đồng bộ</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Hai người giải cùng bộ tình huống. Trận hết hạn sau 24 giờ; điểm xếp hạng tách khỏi điểm
            đổi quà.
          </p>
          <input
            value={opponent}
            onChange={(event) => setOpponent(event.target.value)}
            placeholder="Tài khoản đối thủ"
            className="mt-4 w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm outline-none focus:border-cyan-400"
          />
          <Button
            className="mt-3 w-full"
            onClick={() => void create("asynchronous")}
            disabled={busy || deck.length !== 3}
          >
            Tạo lời mời · {deck.length}/3 thẻ
          </Button>
          <div className="my-4 flex items-center gap-3 text-xs text-slate-500">
            <span className="h-px flex-1 bg-white/10" />
            HOẶC VÀO TRẬN
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              placeholder="Mã trận được gửi"
              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm outline-none focus:border-cyan-400"
            />
            <Button
              variant="ghost"
              className="border border-white/15 bg-white/10 text-white"
              onClick={() => void join()}
              disabled={busy || deck.length !== 3}
            >
              Vào
            </Button>
          </div>
        </div>
        {error && (
          <p role="alert" className="lg:col-span-2 rounded-[10px] bg-red-50 p-4 text-sm text-red-800">
            {error}
          </p>
        )}
        </div>
      </div>
    );

  return (
    <div className="rounded-[14px] border border-slate-200 bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">
            {match.mode === "practice" ? "Luyện tập" : "Đối kháng"} · {match.id.slice(0, 8)}
          </p>
          <h3 className="mt-2 text-xl font-black text-slate-950">
            {match.status === "completed"
              ? "Trận đã kết thúc"
              : match.status === "waiting" && !round
                ? "Đang chờ đối thủ"
                : `Vòng ${(round?.index ?? 4) + 1}/5`}
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void navigator.clipboard.writeText(match.id)}
            className="rounded-xl border border-slate-200 p-2 text-slate-500"
            aria-label="Sao chép mã trận"
          >
            <Copy size={16} />
          </button>
          <button
            onClick={() => void refreshMatch()}
            className="rounded-xl border border-slate-200 p-2 text-slate-500"
            aria-label="Cập nhật trận"
          >
            <RefreshCw size={16} />
          </button>
          <Button variant="ghost" onClick={() => setMatch(null)}>
            Trận mới
          </Button>
        </div>
      </div>
      {match.mode === "asynchronous" && (
        <p className="mt-3 rounded-xl bg-slate-100 p-3 text-xs text-slate-600">
          Gửi mã <strong>{match.id}</strong> cho đúng tài khoản đã mời. Máy chủ kiểm tra danh tính
          và quyền sở hữu thẻ.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-[10px] bg-red-50 p-4 text-sm text-red-800">
          {error}
        </p>
      )}
      {lastEvaluation && match.status !== "completed" && (
        <div className="mt-4 grid gap-3 rounded-[10px] border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
          <div>
            <span className="text-xs font-bold text-slate-500">An toàn</span>
            <p className="mt-1 font-mono text-lg font-bold text-slate-950">
              {lastEvaluation.safety}/{lastEvaluation.safetyMax}
            </p>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500">Phân luồng đúng</span>
            <p className="mt-1 font-mono text-lg font-bold text-slate-950">
              {lastEvaluation.correctness}/{lastEvaluation.correctnessMax}
            </p>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500">Hiệu quả</span>
            <p className="mt-1 font-mono text-lg font-bold text-slate-950">
              {lastEvaluation.efficiency}
            </p>
          </div>
          <ul className="space-y-1 text-xs leading-5 text-slate-600 sm:col-span-3">
            {lastEvaluation.log.map((entry, index) => (
              <li key={entry + index}>• {entry}</li>
            ))}
          </ul>
        </div>
      )}
      {match.status === "completed" ? (
        <div className="mt-6 rounded-[14px] bg-slate-950 p-7 text-center text-white">
          <ShieldCheck className="mx-auto text-cyan-300" size={34} />
          <p className="mt-3 text-3xl font-black">
            {match.result === "win" ? "Thắng" : match.result === "loss" ? "Thua" : "Hòa"}
          </p>
          <p className="mt-2 text-sm text-slate-300">
            {match.playerScore} — {match.opponentScore} · xếp hạng{" "}
            {match.ratingDelta >= 0 ? "+" : ""}
            {match.ratingDelta}
          </p>
          <p className="mt-3 text-xs text-slate-500">Không cộng hoặc trừ điểm đổi quà.</p>
        </div>
      ) : round ? (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-[10px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <span className="font-bold text-slate-900">
              Xử lý {processingUsed}/{round.actionBudget}
            </span>
            <span className="h-4 w-px bg-slate-300" />
            <span className="text-slate-600">
              Vận chuyển{" "}
              {round.objects.reduce((sum, object) => sum + (object.transportCost ?? 1), 0)}/
              {round.transportBudget}
            </span>
          </div>
          <div className="mt-6 grid gap-3 lg:grid-cols-3">
            {round.objects.map((object: MaterialScenarioObject) => (
              <div key={object.id} className="rounded-[10px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                  {object.condition === "dirty"
                    ? "Dính bẩn"
                    : object.condition === "wet"
                      ? "Bị ướt"
                      : object.condition === "broken"
                        ? "Đã vỡ"
                        : "Sạch"}
                </p>
                <h4 className="mt-2 font-black text-slate-900">{object.label}</h4>
                <div className="mt-4 flex flex-wrap gap-2" aria-label={"Xử lý " + object.label}>
                  {PROCESSING_ACTIONS.map((step) => {
                    const selected = (processing[object.id] ?? []).includes(step.id);
                    return (
                      <button
                        key={step.id}
                        type="button"
                        aria-pressed={selected}
                        disabled={!selected && processingUsed >= round.actionBudget}
                        onClick={() =>
                          setProcessing((current) => {
                            const currentSteps = current[object.id] ?? [];
                            return {
                              ...current,
                              [object.id]: selected
                                ? currentSteps.filter((item) => item !== step.id)
                                : [...currentSteps, step.id],
                            };
                          })
                        }
                        className={
                          "min-h-9 rounded-md border px-2.5 text-xs font-bold transition-colors " +
                          (selected
                            ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-400") +
                          " disabled:cursor-not-allowed disabled:opacity-40"
                        }
                      >
                        {step.label}
                      </button>
                    );
                  })}
                </div>
                <select
                  value={choices[object.id] ?? ""}
                  onChange={(event) =>
                    setChoices((current) => ({
                      ...current,
                      [object.id]: event.target.value as SortingAction,
                    }))
                  }
                  className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="" disabled>
                    Chọn xử lý
                  </option>
                  {ACTIONS.map((action) => (
                    <option key={action.id} value={action.id}>
                      {action.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={abilityCardId}
                onChange={(event) => {
                  setAbilityCardId(event.target.value);
                  if (!event.target.value) setAbilityTargetId("");
                }}
                className="min-h-11 rounded-[10px] border border-slate-200 bg-white px-4 text-sm"
                aria-label="Kỹ năng sử dụng"
              >
                <option value="">Không dùng kỹ năng vòng này</option>
                {ownDeck.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.abilityName} · {CATEGORY[card.category].label}
                    {card.sample ? " (thẻ mẫu)" : ""}
                  </option>
                ))}
              </select>
              {abilityCardId && (
                <select
                  value={abilityTargetId}
                  onChange={(event) => setAbilityTargetId(event.target.value)}
                  className="min-h-11 rounded-[10px] border border-slate-200 bg-white px-4 text-sm"
                  aria-label="Vật thể nhận kỹ năng"
                >
                  <option value="">Chọn vật thể nhận kỹ năng</option>
                  {round.objects.map((object) => (
                    <option key={object.id} value={object.id}>
                      {object.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <Button
              onClick={() => void submit()}
              disabled={
                busy ||
                processingUsed > round.actionBudget ||
                round.objects.some((object) => !choices[object.id]) ||
                Boolean(abilityCardId && !abilityTargetId)
              }
            >
              {busy ? <Loader2 className="animate-spin" size={16} /> : null}Khóa lựa chọn
            </Button>
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-[10px] bg-amber-50 p-5 text-sm text-amber-900">
          Bạn đã hoàn thành lượt của mình. Kết quả được chốt khi đối thủ hoàn tất.
        </div>
      )}
    </div>
  );
}

export function MaterialCards({ actorNick, refreshKey = 0, onScan }: MaterialCardsProps) {
  const [section, setSection] = useState<Section>("collection");
  const [cards, setCards] = useState<MaterialCard[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deck, setDeck] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | WasteCategory>("all");
  const [selectedCard, setSelectedCard] = useState<MaterialCard | null>(null);
  const [detailTrigger, setDetailTrigger] = useState<HTMLElement | null>(null);
  const [compareCards, setCompareCards] = useState<MaterialCard[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const load = useCallback(
    async (append = false) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: "24" });
        if (append && cursor) params.set("cursor", cursor);
        if (search.trim()) params.set("search", search.trim());
        if (categoryFilter !== "all") params.set("category", categoryFilter);
        const payload = await api<{ cards: MaterialCard[]; nextCursor: string | null }>(
          `/api/material-cards?${params.toString()}`,
        );
        setCards((current) => (append ? [...current, ...payload.cards] : payload.cards));
        setCursor(payload.nextCursor);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Không tải được bộ sưu tập.");
      } finally {
        setLoading(false);
      }
    },
    [categoryFilter, cursor, search],
  );
  useEffect(() => {
    const timer = window.setTimeout(() => void load(false), 250);
    return () => window.clearTimeout(timer);
  }, [refreshKey, search, categoryFilter]); // eslint-disable-line react-hooks/exhaustive-deps
  const selectedCards = deck;
  const filteredCards = cards;
  const hasActiveFilter = Boolean(search.trim() || categoryFilter !== "all");
  const toggle = (id: string) =>
    setDeck((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : current.length < 3
          ? [...current, id]
          : current,
    );
  const toggleCompare = (card: MaterialCard) =>
    setCompareCards((current) =>
      current.some((item) => item.id === card.id)
        ? current.filter((item) => item.id !== card.id)
        : current.length < 3
          ? [...current, card]
          : current,
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs className="grid w-full grid-cols-3 overflow-visible sm:flex sm:w-auto">
          {(
            [
              { id: "collection", label: "Bộ sưu tập", icon: Layers3 },
              { id: "challenge", label: "Thử thách", icon: BookOpen },
              { id: "battle", label: "Đối kháng", icon: Swords },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              role="tab"
              aria-selected={section === id}
              tabIndex={section === id ? 0 : -1}
              className={`flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[8px] border px-2 py-2.5 text-sm font-semibold transition-colors sm:min-w-fit sm:gap-2 sm:px-4 ${section === id ? "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--graphite)]" : "border-transparent text-[var(--text-muted)] hover:text-[var(--graphite)]"}`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </Tabs>
        <div className="flex shrink-0 items-center gap-4 text-xs text-[var(--text-muted)]">
          {section === "battle" && <span><strong className="font-telemetry text-[var(--graphite)]">{selectedCards.length}/3</strong> thẻ đã chọn</span>}
        </div>
      </div>
      {error && (
        <ErrorRetry message={error} onRetry={() => void load(false)} />
      )}
      {!error && section === "collection" && (
        <>
          {(cards.length > 0 || hasActiveFilter) && (
            <div className="grid gap-3 rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface)] p-3 lg:grid-cols-[minmax(15rem,1fr)_auto]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                <span className="sr-only">Tìm hộ chiếu vật liệu</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm theo tên vật thể"
                  className="min-h-11 w-full rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-muted)] pl-9 pr-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-ring)]"
                />
              </label>
              <label className="sm:hidden">
                <span className="sr-only">Lọc theo vật liệu</span>
                <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as "all" | WasteCategory)} className="min-h-11 w-full rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-ring)]">
                  <option value="all">Tất cả vật liệu</option>
                  {(Object.keys(CATEGORY) as WasteCategory[]).map((category) => <option key={category} value={category}>{CATEGORY[category].label}</option>)}
                </select>
              </label>
              <div className="thin-scrollbar hidden gap-1 overflow-x-auto sm:flex" aria-label="Lọc theo vật liệu">
                {(["all", ...Object.keys(CATEGORY)] as Array<"all" | WasteCategory>).map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setCategoryFilter(category)}
                    className={`min-h-11 shrink-0 rounded-[6px] border px-3 py-2 text-xs font-semibold transition-colors ${categoryFilter === category ? "border-[var(--graphite)] bg-[var(--graphite)] text-white" : "border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"}`}
                  >
                    {category === "all" ? "Tất cả" : CATEGORY[category].label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {compareCards.length > 0 && (
            <div className="flex flex-col gap-3 rounded-[10px] border border-emerald-200 bg-emerald-50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-emerald-950">
                Đã chọn {compareCards.length}/3 hộ chiếu để so sánh
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => setCompareOpen(true)}
                  disabled={compareCards.length < 2}
                >
                  <Scale size={14} /> So sánh
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCompareCards([])}>
                  Bỏ chọn
                </Button>
              </div>
            </div>
          )}
          {loading && !cards.length ? (
            <div className="flex min-h-48 items-center justify-center">
              <Loader2 className="animate-spin text-cyan-600" />
            </div>
          ) : filteredCards.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredCards.map((card) => (
                <CollectionCard
                  key={card.id}
                  card={card}
                  compareSelected={compareCards.some((item) => item.id === card.id)}
                  onToggleCompare={() => toggleCompare(card)}
                  onOpen={(trigger) => {
                    setDetailTrigger(trigger);
                    setSelectedCard(card);
                  }}
                />
              ))}
            </div>
          ) : hasActiveFilter ? (
            <EmptyState
              title="Không tìm thấy hộ chiếu phù hợp"
              description="Thử tên khác hoặc đổi bộ lọc vật liệu."
            />
          ) : (
            <EmptyState
              title="Bộ sưu tập đang trống"
              description="Quét một vật thể đủ điều kiện để tạo hộ chiếu đầu tiên."
            />
          )}
          {cursor && (
            <Button
              variant="ghost"
              className="mx-auto"
              onClick={() => void load(true)}
              disabled={loading}
            >
              Tải thêm
            </Button>
          )}
          <Button
            onClick={onScan}
            className="w-full sm:ml-auto sm:w-auto"
          >
            <ScanLine size={17} /> Quét rác
          </Button>
        </>
      )}
      {!error && section === "challenge" && <Challenge cards={cards} />}
      {!error && section === "battle" && (
        <div className="space-y-5">
          {cards.length > 0 && (
            <section className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div><h3 className="font-semibold text-[var(--graphite)]">Chọn bộ ba thẻ</h3><p className="mt-1 text-sm text-[var(--text-muted)]">Bộ thẻ này được dùng khi tạo hoặc tham gia trận đối kháng.</p></div>
                <span className="font-telemetry text-sm font-semibold">{selectedCards.length}/3</span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((card) => {
                  const selected = deck.includes(card.id);
                  return (
                    <button key={card.id} type="button" onClick={() => toggle(card.id)} aria-pressed={selected} className={`flex min-h-16 items-center gap-3 rounded-[10px] border p-2 text-left ${selected ? "border-[var(--primary)] bg-[var(--primary-soft)]" : "border-[var(--border-subtle)] bg-[var(--surface)]"}`}>
                      <CardImage card={card} compact />
                      <span className="min-w-0"><strong className="block truncate text-sm">{card.objectName}</strong><span className="mt-1 block text-xs text-[var(--text-muted)]">{MATERIAL_LABELS[card.category]}</span></span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
          <Battle deck={selectedCards} actorNick={actorNick} />
        </div>
      )}
      {selectedCard && <CardDetail card={selectedCard} returnFocus={detailTrigger} onClose={() => setSelectedCard(null)} />}
      {compareOpen && (
        <ComparePassports cards={compareCards} onClose={() => setCompareOpen(false)} />
      )}
    </div>
  );
}
