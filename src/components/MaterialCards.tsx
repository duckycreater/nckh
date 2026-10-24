import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Gamepad2,
  Layers3,
  Loader2,
  Plus,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Swords,
} from "lucide-react";
import type {
  MatchState,
  MaterialCard,
  MaterialScenarioObject,
  SortingAction,
  WasteCategory,
} from "../../shared/materialCards";
import { getAuthHeaders } from "../lib/auth";
import { Badge, Button } from "../lib/ui";

interface MaterialCardsProps {
  actorNick: string;
  points: number;
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

function parseError(value: unknown, fallback: string) {
  if (value && typeof value === "object" && "error" in value) {
    const message = (value as { error?: unknown }).error;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
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
  const category = CATEGORY[card.category];
  if (card.imageUrl) {
    return (
      <img
        src={card.imageUrl}
        alt={card.objectName}
        loading="lazy"
        className={`${compact ? "h-16 w-16" : "aspect-[4/3] w-full"} object-cover`}
      />
    );
  }
  return (
    <div
      className={`${compact ? "h-16 w-16" : "aspect-[4/3] w-full"} flex items-center justify-center bg-slate-900`}
    >
      <span
        className={`flex ${compact ? "h-9 w-9 text-sm" : "h-16 w-16 text-xl"} items-center justify-center rounded-2xl ${category.accent} font-black text-white`}
      >
        {category.mark}
      </span>
    </div>
  );
}

function CollectionCard({
  card,
  selected,
  onSelect,
}: {
  card: MaterialCard;
  selected: boolean;
  onSelect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const category = CATEGORY[card.category];
  return (
    <article
      className={`overflow-hidden rounded-3xl border bg-white shadow-sm transition duration-200 motion-reduce:transition-none ${selected ? "border-cyan-500 ring-2 ring-cyan-100" : "border-slate-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0"}`}
    >
      <div className="relative">
        <CardImage card={card} />
        <span
          className={`absolute left-3 top-3 rounded-full ${category.accent} px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-white`}
        >
          {category.label}
        </span>
        <button
          onClick={onSelect}
          className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border text-sm shadow ${selected ? "border-cyan-400 bg-cyan-500 text-white" : "border-white/60 bg-slate-950/75 text-white"}`}
          aria-label={selected ? "Bỏ khỏi bộ đấu" : "Thêm vào bộ đấu"}
        >
          {selected ? <Check size={16} /> : <Plus size={16} />}
        </button>
      </div>
      <div className="p-4">
        <h3 className="truncate text-base font-black text-slate-950">{card.objectName}</h3>
        <p className="mt-1 text-xs text-slate-500">
          Thẻ từ lần quét · {new Date(card.createdAt).toLocaleDateString("vi-VN")}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-slate-100 p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
              Nội tại
            </p>
            <p className="mt-1 text-xs font-bold text-slate-800">{card.passive.name}</p>
          </div>
          <div className="rounded-2xl bg-slate-950 p-3 text-white">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-300">
              Chủ động
            </p>
            <p className="mt-1 text-xs font-bold">{card.active.name}</p>
          </div>
        </div>
        <button
          onClick={() => setExpanded((value) => !value)}
          className="mt-3 flex w-full items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold text-slate-600"
        >
          Căn cứ kỹ năng{" "}
          <ChevronDown size={15} className={`transition ${expanded ? "rotate-180" : ""}`} />
        </button>
        {expanded && (
          <div className="mt-3 space-y-3 text-xs leading-5 text-slate-600">
            <p>
              <strong className="text-slate-900">{card.passive.name}:</strong> {card.passive.rule}
            </p>
            <p>
              <strong className="text-slate-900">{card.active.name}:</strong> {card.active.rule}
            </p>
            <ul className="space-y-1 border-t border-slate-100 pt-3">
              {card.properties
                .filter((property) => property.value === true)
                .map((property) => (
                  <li key={property.id}>
                    • {property.label} —{" "}
                    {property.source === "visual_observation" ? "từ ảnh" : "từ thư viện"}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </article>
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
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
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
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
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
                className={`rounded-2xl border p-4 text-left text-sm font-bold transition ${isExpected ? "border-emerald-400 bg-emerald-50 text-emerald-900" : isSelected ? "border-red-300 bg-red-50 text-red-800" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-cyan-400"}`}
              >
                {action.label}
              </button>
            );
          })}
        </div>
        {selected && (
          <div
            className={`mt-5 rounded-2xl p-4 text-sm leading-6 ${selected === expected ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950"}`}
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
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <Layers3 className="mx-auto text-slate-300" size={38} />
      <h3 className="mt-4 text-lg font-black text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function Battle({ deck, actorNick }: { deck: string[]; actorNick: string }) {
  const [match, setMatch] = useState<MatchState | null>(null);
  const [opponent, setOpponent] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [choices, setChoices] = useState<Record<string, SortingAction>>({});
  const [abilityCardId, setAbilityCardId] = useState("");
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
  const matchId = match?.id;
  const matchMode = match?.mode;
  const matchStatus = match?.status;

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
      setAbilityCardId("");
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
          })),
          ...(abilityCardId ? { abilityCardId } : {}),
        }),
      });
      setMatch(payload.match);
      setChoices({});
      setAbilityCardId("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không gửi được lượt chơi.");
    } finally {
      setBusy(false);
    }
  };

  if (!match)
    return (
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <Gamepad2 className="text-cyan-600" />
          <h3 className="mt-4 text-xl font-black text-slate-950">Luyện tập 5 vòng</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Ba vật thể mỗi vòng, ngân sách ba hành động. Nếu chưa đủ thẻ, hệ thống cho mượn bộ mẫu
            nhưng không ghi thành sở hữu.
          </p>
          <Button className="mt-5 w-full" onClick={() => void create("practice")} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" size={16} /> : null}Bắt đầu với máy
          </Button>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 text-white">
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
          <p role="alert" className="lg:col-span-2 rounded-2xl bg-red-50 p-4 text-sm text-red-800">
            {error}
          </p>
        )}
      </div>
    );

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
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
        <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800">
          {error}
        </p>
      )}
      {match.status === "completed" ? (
        <div className="mt-6 rounded-3xl bg-slate-950 p-7 text-center text-white">
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
          <div className="mt-6 grid gap-3 lg:grid-cols-3">
            {round.objects.map((object: MaterialScenarioObject) => (
              <div key={object.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
            <select
              value={abilityCardId}
              onChange={(event) => setAbilityCardId(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <option value="">Không dùng kỹ năng vòng này</option>
              {ownDeck.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.abilityName} · {CATEGORY[card.category].label}
                  {card.sample ? " (thẻ mẫu)" : ""}
                </option>
              ))}
            </select>
            <Button
              onClick={() => void submit()}
              disabled={busy || round.objects.some((object) => !choices[object.id])}
            >
              {busy ? <Loader2 className="animate-spin" size={16} /> : null}Khóa lựa chọn
            </Button>
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-2xl bg-amber-50 p-5 text-sm text-amber-900">
          Bạn đã hoàn thành lượt của mình. Kết quả được chốt khi đối thủ hoàn tất.
        </div>
      )}
    </div>
  );
}

export function MaterialCards({ actorNick, points, refreshKey = 0, onScan }: MaterialCardsProps) {
  const [section, setSection] = useState<Section>("collection");
  const [cards, setCards] = useState<MaterialCard[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deck, setDeck] = useState<string[]>([]);
  const load = useCallback(
    async (append = false) => {
      setLoading(true);
      setError(null);
      try {
        const query =
          append && cursor ? `?limit=24&cursor=${encodeURIComponent(cursor)}` : "?limit=24";
        const payload = await api<{ cards: MaterialCard[]; nextCursor: string | null }>(
          `/api/material-cards${query}`,
        );
        setCards((current) => (append ? [...current, ...payload.cards] : payload.cards));
        setCursor(payload.nextCursor);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Không tải được bộ sưu tập.");
      } finally {
        setLoading(false);
      }
    },
    [cursor],
  );
  useEffect(() => {
    void load(false);
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const selectedCards = useMemo(
    () => deck.filter((id) => cards.some((card) => card.id === id)),
    [cards, deck],
  );
  const toggle = (id: string) =>
    setDeck((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : current.length < 3
          ? [...current, id]
          : current,
    );

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-white shadow-xl">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
              Material Lab
            </p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              Học từ vật thể bạn thật sự tìm thấy
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Không gacha, không chỉ số bịa. Mỗi kỹ năng truy ngược về thuộc tính quan sát hoặc quy
              tắc vật liệu.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Bộ thẻ đấu</p>
              <p className="mt-1 font-black">{selectedCards.length}/3</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Điểm hiện có</p>
              <p className="mt-1 font-black">{points.toLocaleString("vi-VN")}</p>
            </div>
          </div>
        </div>
        <div className="flex overflow-x-auto border-t border-white/10 p-2">
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
              className={`flex min-w-fit flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${section === id ? "bg-white text-slate-950" : "text-slate-400 hover:text-white"}`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {section === "collection" && (
        <>
          {loading && !cards.length ? (
            <div className="flex min-h-48 items-center justify-center">
              <Loader2 className="animate-spin text-cyan-600" />
            </div>
          ) : cards.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {cards.map((card) => (
                <CollectionCard
                  key={card.id}
                  card={card}
                  selected={deck.includes(card.id)}
                  onSelect={() => toggle(card.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Bộ sưu tập đang trống"
              description="Thẻ chỉ được tạo từ một lần quét online đủ điều kiện. Mỗi lần quét tạo tối đa một thẻ."
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
            className="fixed bottom-20 right-4 z-20 rounded-full shadow-xl sm:static sm:ml-auto sm:rounded-xl"
          >
            <ScanLine size={17} /> Quét để tạo thẻ
          </Button>
        </>
      )}
      {section === "challenge" && <Challenge cards={cards} />}
      {section === "battle" && <Battle deck={selectedCards} actorNick={actorNick} />}
    </div>
  );
}
