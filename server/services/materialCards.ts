import crypto from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { getFirestore } from "../db.js";
import {
  MATERIAL_CARD_CREATE_COST,
  buildCardPreview,
  expectedActionForCategory,
  expectedActionForScenario,
  type CardPreview,
  type MatchState,
  type MatchSubmission,
  type MaterialCard,
  type MatchDeckCard,
  type MaterialMatchRound,
  type ScanAnalysis,
  type WasteCategory,
} from "../../shared/materialCards.js";

export interface StoredMaterialScan {
  id: string;
  ownerNick: string;
  ownerId: string;
  imageHash: string;
  imageUrl: string | null;
  analysis: ScanAnalysis;
  preview: CardPreview | null;
  cardId: string | null;
  createdAt: number;
  expiresAt: number;
}

export interface LocalEconomyAdapter {
  getPoints: () => Promise<number>;
  debit: (amount: number) => Promise<number>;
}

export class MaterialCardError extends Error {
  constructor(
    public readonly code:
      | "storage_unavailable"
      | "scan_not_found"
      | "scan_forbidden"
      | "scan_ineligible"
      | "insufficient_points"
      | "card_not_found"
      | "match_not_found"
      | "match_forbidden"
      | "match_closed"
      | "invalid_submission",
    message: string,
  ) {
    super(message);
  }
}

const memoryScans = new Map<string, StoredMaterialScan>();
const memoryCards = new Map<string, Map<string, MaterialCard>>();
const memoryMatches = new Map<string, MatchState>();
const memoryLocks = new Map<string, Promise<void>>();

function storage(): Firestore | null {
  return getFirestore();
}

function allowMemoryStorage(): boolean {
  return process.env.NODE_ENV !== "production";
}

async function withMemoryLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = memoryLocks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  memoryLocks.set(key, current);
  await previous;
  try {
    return await task();
  } finally {
    if (memoryLocks.get(key) === current) memoryLocks.delete(key);
    release();
  }
}

export function isMaterialCardStorageReady(): boolean {
  return Boolean(storage()) || allowMemoryStorage();
}

export async function saveMaterialScan(scan: StoredMaterialScan): Promise<void> {
  const db = storage();
  if (db) {
    await db.collection("material_scans").doc(scan.id).set(scan, { merge: false });
    return;
  }
  if (!allowMemoryStorage()) {
    throw new MaterialCardError("storage_unavailable", "Kho dữ liệu thẻ chưa được cấu hình.");
  }
  memoryScans.set(scan.id, structuredClone(scan));
}

function toMaterialCard(
  scan: StoredMaterialScan,
  ownerId: string,
  createdAt: number,
): MaterialCard {
  if (!scan.preview || !scan.analysis.category) {
    throw new MaterialCardError("scan_ineligible", "Lần quét này không đủ điều kiện tạo thẻ.");
  }
  return {
    id: scan.id,
    ownerId,
    scanId: scan.id,
    objectName: scan.analysis.objectName,
    category: scan.analysis.category,
    imageUrl: scan.imageUrl,
    properties: scan.analysis.properties,
    passive: scan.preview.passive,
    active: scan.preview.active,
    rulesetVersion: scan.preview.rulesetVersion,
    createdAt,
  };
}

export async function createMaterialCard(input: {
  ownerNick: string;
  ownerId: string;
  scanId: string;
  idempotencyKey: string;
  localEconomy?: LocalEconomyAdapter;
}): Promise<{ card: MaterialCard; points: number; charged: boolean }> {
  const db = storage();
  const ownerNick = input.ownerNick.trim().toLowerCase();
  if (db) {
    const scanRef = db.collection("material_scans").doc(input.scanId);
    const userRef = db.collection("users").doc(ownerNick);
    const cardRef = userRef.collection("material_cards").doc(input.scanId);
    const transactionRef = userRef.collection("point_transactions").doc(`card_${input.scanId}`);
    return db.runTransaction(async (tx) => {
      const [existingCard, scanSnapshot, userSnapshot] = await Promise.all([
        tx.get(cardRef),
        tx.get(scanRef),
        tx.get(userRef),
      ]);
      if (existingCard.exists) {
        const points = Number(userSnapshot.data()?.points ?? 0);
        return { card: existingCard.data() as MaterialCard, points, charged: false };
      }
      if (!scanSnapshot.exists) {
        throw new MaterialCardError("scan_not_found", "Không tìm thấy lần quét.");
      }
      const scan = scanSnapshot.data() as StoredMaterialScan;
      if (scan.ownerNick !== ownerNick || scan.ownerId !== input.ownerId) {
        throw new MaterialCardError("scan_forbidden", "Lần quét không thuộc tài khoản này.");
      }
      if (!scan.analysis.eligibleForCard || !scan.preview || scan.expiresAt <= Date.now()) {
        throw new MaterialCardError("scan_ineligible", "Lần quét này không đủ điều kiện tạo thẻ.");
      }
      if (!userSnapshot.exists) {
        throw new MaterialCardError("scan_forbidden", "Không tìm thấy tài khoản.");
      }
      const points = Math.max(0, Math.trunc(Number(userSnapshot.data()?.points) || 0));
      if (points < MATERIAL_CARD_CREATE_COST) {
        throw new MaterialCardError("insufficient_points", "Không đủ điểm để tạo thẻ.");
      }
      const createdAt = Date.now();
      const card = toMaterialCard(scan, input.ownerId, createdAt);
      const remainingPoints = points - MATERIAL_CARD_CREATE_COST;
      tx.set(cardRef, card, { merge: false });
      tx.update(userRef, { points: remainingPoints });
      tx.update(scanRef, { cardId: card.id, convertedAt: createdAt });
      tx.set(transactionRef, {
        idempotencyKey: input.idempotencyKey.slice(0, 160),
        type: "spend",
        source: "material_card_create",
        amount: -MATERIAL_CARD_CREATE_COST,
        pointsBalance: remainingPoints,
        scanId: scan.id,
        createdAt,
      });
      return { card, points: remainingPoints, charged: true };
    });
  }

  if (!allowMemoryStorage() || !input.localEconomy) {
    throw new MaterialCardError("storage_unavailable", "Kho dữ liệu thẻ chưa được cấu hình.");
  }
  return withMemoryLock(ownerNick, async () => {
    const cards = memoryCards.get(ownerNick) ?? new Map<string, MaterialCard>();
    const existing = cards.get(input.scanId);
    if (existing) {
      return {
        card: structuredClone(existing),
        points: await input.localEconomy!.getPoints(),
        charged: false,
      };
    }
    const scan = memoryScans.get(input.scanId);
    if (!scan) throw new MaterialCardError("scan_not_found", "Không tìm thấy lần quét.");
    if (scan.ownerNick !== ownerNick || scan.ownerId !== input.ownerId) {
      throw new MaterialCardError("scan_forbidden", "Lần quét không thuộc tài khoản này.");
    }
    if (!scan.analysis.eligibleForCard || !scan.preview || scan.expiresAt <= Date.now()) {
      throw new MaterialCardError("scan_ineligible", "Lần quét này không đủ điều kiện tạo thẻ.");
    }
    const currentPoints = await input.localEconomy!.getPoints();
    if (currentPoints < MATERIAL_CARD_CREATE_COST) {
      throw new MaterialCardError("insufficient_points", "Không đủ điểm để tạo thẻ.");
    }
    const card = toMaterialCard(scan, input.ownerId, Date.now());
    const points = await input.localEconomy!.debit(MATERIAL_CARD_CREATE_COST);
    cards.set(card.id, structuredClone(card));
    memoryCards.set(ownerNick, cards);
    scan.cardId = card.id;
    return { card, points, charged: true };
  });
}

export async function listMaterialCards(
  ownerNick: string,
  limit = 24,
  cursor?: string,
): Promise<{ cards: MaterialCard[]; nextCursor: string | null }> {
  const normalized = ownerNick.trim().toLowerCase();
  const safeLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
  const db = storage();
  if (db) {
    const collection = db.collection("users").doc(normalized).collection("material_cards");
    let query = collection.orderBy("createdAt", "desc").limit(safeLimit + 1);
    if (cursor) {
      const cursorSnapshot = await collection.doc(cursor).get();
      if (cursorSnapshot.exists) query = query.startAfter(cursorSnapshot);
    }
    const snapshot = await query.get();
    const values = snapshot.docs.map((document) => document.data() as MaterialCard);
    const hasMore = values.length > safeLimit;
    const cards = values.slice(0, safeLimit);
    return { cards, nextCursor: hasMore ? (cards.at(-1)?.id ?? null) : null };
  }
  if (!allowMemoryStorage()) {
    throw new MaterialCardError("storage_unavailable", "Kho dữ liệu thẻ chưa được cấu hình.");
  }
  const values = [...(memoryCards.get(normalized)?.values() ?? [])].sort(
    (a, b) => b.createdAt - a.createdAt,
  );
  const start = cursor ? Math.max(0, values.findIndex((card) => card.id === cursor) + 1) : 0;
  const cards = values.slice(start, start + safeLimit);
  return {
    cards: structuredClone(cards),
    nextCursor: start + safeLimit < values.length ? (cards.at(-1)?.id ?? null) : null,
  };
}

const SCENARIO_POOL: Array<Omit<MaterialMatchRound["objects"][number], "id">> = [
  { label: "Chai nhựa sạch", category: "plastic", condition: "clean" },
  { label: "Hộp giấy ướt", category: "paper", condition: "wet" },
  { label: "Lọ thủy tinh", category: "glass", condition: "clean" },
  { label: "Ly thủy tinh vỡ", category: "glass", condition: "broken" },
  { label: "Lon nhôm sạch", category: "metal", condition: "clean" },
  { label: "Vỏ rau củ", category: "organic", condition: "clean" },
  {
    label: "Pin đã dùng",
    category: "hazard",
    condition: "clean",
  },
  {
    label: "Bao bì nhựa dính dầu",
    category: "plastic",
    condition: "dirty",
  },
  { label: "Giấy báo khô", category: "paper", condition: "clean" },
];

function buildRounds(seed: string): MaterialMatchRound[] {
  const digest = crypto.createHash("sha256").update(seed).digest();
  return Array.from({ length: 5 }, (_, roundIndex) => ({
    index: roundIndex,
    actionBudget: 3 as const,
    objects: Array.from({ length: 3 }, (_, objectIndex) => {
      const poolIndex =
        (digest[(roundIndex * 3 + objectIndex) % digest.length] + objectIndex) %
        SCENARIO_POOL.length;
      return { ...SCENARIO_POOL[poolIndex], id: `r${roundIndex}-o${objectIndex}` };
    }),
  }));
}

function scoreSubmission(
  round: MaterialMatchRound,
  submission: MatchSubmission,
  deck: MatchDeckCard[] = [],
): number {
  const unique = new Set(submission.choices.map((choice) => choice.objectId));
  if (submission.choices.length !== 3 || unique.size !== 3) {
    throw new MaterialCardError("invalid_submission", "Mỗi vật thể cần đúng một lựa chọn.");
  }
  let score = 0;
  for (const object of round.objects) {
    const choice = submission.choices.find((candidate) => candidate.objectId === object.id);
    if (!choice) throw new MaterialCardError("invalid_submission", "Thiếu lựa chọn cho vật thể.");
    if (choice.action === expectedActionForScenario(object)) {
      score += object.category === "hazard" ? 14 : 10;
    }
  }
  if (submission.abilityCardId) {
    const abilityCard = deck.find((card) => card.id === submission.abilityCardId);
    if (!abilityCard) {
      throw new MaterialCardError(
        "invalid_submission",
        "Kỹ năng không thuộc bộ thẻ của người chơi.",
      );
    }
    // Skills improve efficiency only when the card's material is actually
    // relevant to a correctly handled object. Hazard cards protect safety but
    // deliberately do not create a stronger farming bonus.
    const relevantCorrectChoice = round.objects.some((object) => {
      const choice = submission.choices.find((candidate) => candidate.objectId === object.id);
      return (
        object.category === abilityCard.category &&
        choice?.action === expectedActionForScenario(object)
      );
    });
    if (relevantCorrectChoice && abilityCard.category !== "hazard") score += 2;
  }
  return score;
}

function botScore(rounds: MaterialMatchRound[], matchId: string): number {
  const variance = crypto.createHash("sha256").update(matchId).digest()[0] % 16;
  return rounds.length * 24 + variance;
}

function finalizeMatch(state: MatchState): MatchState {
  if (state.playerSubmissions.length < state.rounds.length) return state;
  if (state.mode === "asynchronous" && state.opponentSubmissions.length < state.rounds.length) {
    return { ...state, status: "waiting" };
  }
  const opponentScore =
    state.mode === "practice" ? botScore(state.rounds, state.id) : state.opponentScore;
  const result =
    state.playerScore === opponentScore
      ? "draw"
      : state.playerScore > opponentScore
        ? "win"
        : "loss";
  return {
    ...state,
    status: "completed",
    opponentScore,
    result,
    ratingDelta: state.mode === "practice" ? 0 : result === "win" ? 12 : result === "loss" ? -8 : 0,
  };
}

export async function createMaterialMatch(input: {
  playerId: string;
  playerNick: string;
  opponentId?: string;
  deckCardIds?: string[];
}): Promise<MatchState> {
  const now = Date.now();
  const id = crypto.randomUUID();
  const playerId = input.playerId.trim().toLowerCase();
  const opponentId = input.opponentId?.trim().toLowerCase() || "practice-bot";
  if (opponentId === playerId) {
    throw new MaterialCardError("invalid_submission", "Không thể tự thách đấu chính mình.");
  }
  const requestedDeck = [...new Set(input.deckCardIds ?? [])].slice(0, 3);
  const db = storage();
  let playerDeck: MatchDeckCard[] = [];
  if (db && requestedDeck.length > 0) {
    const snapshots = await Promise.all(
      requestedDeck.map((cardId) =>
        db
          .collection("users")
          .doc(input.playerNick.toLowerCase())
          .collection("material_cards")
          .doc(cardId)
          .get(),
      ),
    );
    playerDeck = snapshots
      .filter((snapshot) => snapshot.exists)
      .map((snapshot) => {
        const card = snapshot.data() as MaterialCard;
        return {
          id: card.id,
          category: card.category,
          abilityName: card.active.name,
          sample: false,
        };
      });
    if (playerDeck.length !== requestedDeck.length) {
      throw new MaterialCardError("card_not_found", "Bộ thẻ chứa thẻ không thuộc tài khoản.");
    }
  } else if (!db && requestedDeck.length > 0) {
    const ownedCards = memoryCards.get(input.playerNick.toLowerCase());
    playerDeck = requestedDeck.map((cardId) => {
      const card = ownedCards?.get(cardId);
      if (!card)
        throw new MaterialCardError("card_not_found", "Bộ thẻ chứa thẻ không thuộc tài khoản.");
      return { id: card.id, category: card.category, abilityName: card.active.name, sample: false };
    });
  }
  if (db && opponentId !== "practice-bot") {
    const opponent = await db.collection("users").doc(opponentId.toLowerCase()).get();
    if (!opponent.exists)
      throw new MaterialCardError("invalid_submission", "Không tìm thấy tài khoản đối thủ.");
  }
  if (opponentId !== "practice-bot" && playerDeck.length !== 3) {
    throw new MaterialCardError("invalid_submission", "Đối kháng cần đúng ba thẻ đã sở hữu.");
  }
  if (opponentId === "practice-bot" && playerDeck.length < 3) {
    playerDeck = ["plastic", "paper", "hazard"].map((category) => ({
      id: `practice:${category}`,
      category: category as WasteCategory,
      abilityName: buildCardPreview("practice", "Thẻ mẫu", category as WasteCategory, null, [])
        .active.name,
      sample: true,
    }));
  }
  const state: MatchState = {
    id,
    playerId,
    opponentId,
    mode: opponentId === "practice-bot" ? "practice" : "asynchronous",
    status: opponentId === "practice-bot" ? "active" : "waiting",
    playerDeck,
    opponentDeck:
      opponentId === "practice-bot"
        ? ["glass", "organic", "metal"].map((category) => ({
            id: `practice:${category}`,
            category: category as WasteCategory,
            abilityName: buildCardPreview(
              "practice",
              "Thẻ mẫu",
              category as WasteCategory,
              null,
              [],
            ).active.name,
            sample: true,
          }))
        : [],
    rounds: buildRounds(id),
    playerSubmissions: [],
    opponentSubmissions: [],
    playerScore: 0,
    opponentScore: 0,
    result: null,
    ratingDelta: 0,
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000,
  };
  if (db) await db.collection("material_matches").doc(id).set(state);
  else if (allowMemoryStorage()) memoryMatches.set(id, structuredClone(state));
  else
    throw new MaterialCardError("storage_unavailable", "Kho dữ liệu trận đấu chưa được cấu hình.");
  return state;
}

export async function getMaterialMatch(matchId: string, actorId: string): Promise<MatchState> {
  const normalizedActorId = actorId.trim().toLowerCase();
  const db = storage();
  let state: MatchState | undefined;
  if (db) {
    const snapshot = await db.collection("material_matches").doc(matchId).get();
    state = snapshot.exists ? (snapshot.data() as MatchState) : undefined;
  } else if (allowMemoryStorage()) {
    state = memoryMatches.get(matchId);
  } else {
    throw new MaterialCardError("storage_unavailable", "Kho dữ liệu trận đấu chưa được cấu hình.");
  }
  if (!state) throw new MaterialCardError("match_not_found", "Không tìm thấy trận đấu.");
  if (state.playerId !== normalizedActorId && state.opponentId !== normalizedActorId) {
    throw new MaterialCardError("match_forbidden", "Tài khoản không thuộc trận đấu.");
  }
  if (state.status !== "completed" && Date.now() >= state.expiresAt) {
    state = { ...state, status: "expired" };
    if (db)
      await db
        .collection("material_matches")
        .doc(matchId)
        .set({ status: "expired" }, { merge: true });
    else memoryMatches.set(matchId, structuredClone(state));
  }
  return structuredClone(state);
}

export async function joinMaterialMatch(input: {
  matchId: string;
  opponentId: string;
  opponentNick: string;
  deckCardIds: string[];
}): Promise<MatchState> {
  const opponentId = input.opponentId.trim().toLowerCase();
  const requestedDeck = [...new Set(input.deckCardIds)].slice(0, 3);
  if (requestedDeck.length !== 3) {
    throw new MaterialCardError("invalid_submission", "Đối kháng cần đúng ba thẻ đã sở hữu.");
  }
  const db = storage();
  let deck: MatchDeckCard[];
  if (db) {
    const snapshots = await Promise.all(
      requestedDeck.map((cardId) =>
        db
          .collection("users")
          .doc(input.opponentNick.toLowerCase())
          .collection("material_cards")
          .doc(cardId)
          .get(),
      ),
    );
    if (snapshots.some((snapshot) => !snapshot.exists)) {
      throw new MaterialCardError("card_not_found", "Bộ thẻ chứa thẻ không thuộc tài khoản.");
    }
    deck = snapshots.map((snapshot) => {
      const card = snapshot.data() as MaterialCard;
      return { id: card.id, category: card.category, abilityName: card.active.name, sample: false };
    });
    const ref = db.collection("material_matches").doc(input.matchId);
    return db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists)
        throw new MaterialCardError("match_not_found", "Không tìm thấy trận đấu.");
      const state = snapshot.data() as MatchState;
      if (state.mode !== "asynchronous" || state.opponentId !== opponentId) {
        throw new MaterialCardError("match_forbidden", "Tài khoản không được mời vào trận này.");
      }
      if (state.opponentDeck.length > 0) return state;
      const next = { ...state, opponentDeck: deck, status: "active" as const };
      tx.set(ref, next, { merge: false });
      return next;
    });
  }
  if (!allowMemoryStorage()) {
    throw new MaterialCardError("storage_unavailable", "Kho dữ liệu trận đấu chưa được cấu hình.");
  }
  const ownedCards = memoryCards.get(input.opponentNick.toLowerCase());
  deck = requestedDeck.map((cardId) => {
    const card = ownedCards?.get(cardId);
    if (!card)
      throw new MaterialCardError("card_not_found", "Bộ thẻ chứa thẻ không thuộc tài khoản.");
    return { id: card.id, category: card.category, abilityName: card.active.name, sample: false };
  });
  return withMemoryLock(`match:${input.matchId}`, async () => {
    const state = memoryMatches.get(input.matchId);
    if (!state) throw new MaterialCardError("match_not_found", "Không tìm thấy trận đấu.");
    if (state.mode !== "asynchronous" || state.opponentId !== opponentId) {
      throw new MaterialCardError("match_forbidden", "Tài khoản không được mời vào trận này.");
    }
    if (state.opponentDeck.length > 0) return structuredClone(state);
    const next = { ...state, opponentDeck: deck, status: "active" as const };
    memoryMatches.set(next.id, structuredClone(next));
    return next;
  });
}

function applySubmission(
  state: MatchState,
  actorId: string,
  submission: MatchSubmission,
): MatchState {
  const normalizedActorId = actorId.trim().toLowerCase();
  if (Date.now() >= state.expiresAt) return { ...state, status: "expired" };
  if (["completed", "expired"].includes(state.status)) {
    throw new MaterialCardError("match_closed", "Trận đấu đã kết thúc.");
  }
  const isPlayer = normalizedActorId === state.playerId;
  const isOpponent = normalizedActorId === state.opponentId;
  if (!isPlayer && !isOpponent) {
    throw new MaterialCardError("match_forbidden", "Tài khoản không thuộc trận đấu.");
  }
  if (isOpponent && state.mode === "asynchronous" && state.opponentDeck.length !== 3) {
    throw new MaterialCardError("invalid_submission", "Đối thủ cần chọn ba thẻ trước khi thi đấu.");
  }
  const round = state.rounds[submission.roundIndex];
  if (!round) throw new MaterialCardError("invalid_submission", "Vòng đấu không hợp lệ.");
  const submissions = isPlayer ? state.playerSubmissions : state.opponentSubmissions;
  if (submissions.some((item) => item.roundIndex === submission.roundIndex)) return state;
  const score = scoreSubmission(
    round,
    submission,
    isPlayer ? state.playerDeck : state.opponentDeck,
  );
  const next: MatchState = isPlayer
    ? {
        ...state,
        playerSubmissions: [...submissions, submission],
        playerScore: state.playerScore + score,
      }
    : {
        ...state,
        opponentSubmissions: [...submissions, submission],
        opponentScore: state.opponentScore + score,
      };
  return finalizeMatch(next);
}

export async function submitMaterialMatch(input: {
  matchId: string;
  actorId: string;
  submission: MatchSubmission;
}): Promise<MatchState> {
  const db = storage();
  if (db) {
    const ref = db.collection("material_matches").doc(input.matchId);
    return db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists)
        throw new MaterialCardError("match_not_found", "Không tìm thấy trận đấu.");
      const current = snapshot.data() as MatchState;
      const next = applySubmission(current, input.actorId, input.submission);
      if (
        current.mode === "asynchronous" &&
        current.status !== "completed" &&
        next.status === "completed"
      ) {
        const playerRef = db.collection("users").doc(next.playerId);
        const opponentRef = db.collection("users").doc(next.opponentId);
        const opponentDelta = next.result === "win" ? -8 : next.result === "loss" ? 12 : 0;
        const [playerSnapshot, opponentSnapshot] = await Promise.all([
          tx.get(playerRef),
          tx.get(opponentRef),
        ]);
        if (!playerSnapshot.exists || !opponentSnapshot.exists) {
          throw new MaterialCardError("match_forbidden", "Tài khoản trong trận không còn hợp lệ.");
        }
        const playerRating = Math.max(
          0,
          Math.trunc(Number(playerSnapshot.data()?.materialRating) || 1000),
        );
        const opponentRating = Math.max(
          0,
          Math.trunc(Number(opponentSnapshot.data()?.materialRating) || 1000),
        );
        tx.set(
          playerRef,
          { materialRating: Math.max(0, playerRating + next.ratingDelta) },
          { merge: true },
        );
        tx.set(
          opponentRef,
          { materialRating: Math.max(0, opponentRating + opponentDelta) },
          { merge: true },
        );
        tx.set(playerRef.collection("material_rating_history").doc(next.id), {
          matchId: next.id,
          opponentId: next.opponentId,
          result: next.result,
          delta: next.ratingDelta,
          createdAt: Date.now(),
        });
        tx.set(opponentRef.collection("material_rating_history").doc(next.id), {
          matchId: next.id,
          opponentId: next.playerId,
          result: next.result === "win" ? "loss" : next.result === "loss" ? "win" : "draw",
          delta: opponentDelta,
          createdAt: Date.now(),
        });
      }
      tx.set(ref, next, { merge: false });
      return next;
    });
  }
  if (!allowMemoryStorage()) {
    throw new MaterialCardError("storage_unavailable", "Kho dữ liệu trận đấu chưa được cấu hình.");
  }
  return withMemoryLock(`match:${input.matchId}`, async () => {
    const state = memoryMatches.get(input.matchId);
    if (!state) throw new MaterialCardError("match_not_found", "Không tìm thấy trận đấu.");
    const next = applySubmission(state, input.actorId, input.submission);
    memoryMatches.set(next.id, structuredClone(next));
    return next;
  });
}

export function makeCardPreview(
  scanId: string,
  objectName: string,
  category: WasteCategory,
  imageUrl: string | null,
  analysis: ScanAnalysis,
): CardPreview {
  return buildCardPreview(scanId, objectName, category, imageUrl, analysis.properties);
}

export const materialCardTestUtils = {
  reset() {
    memoryScans.clear();
    memoryCards.clear();
    memoryMatches.clear();
    memoryLocks.clear();
  },
  scoreSubmission,
  buildRounds,
  expectedActionForCategory,
};
