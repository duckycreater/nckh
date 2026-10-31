import crypto from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { getFirestore } from "../db.js";
import {
  MATERIAL_CARD_CREATE_COST,
  MATERIAL_MATCH_RULESET_VERSION,
  buildCardPreview,
  expectedActionForCategory,
  expectedActionForScenario,
  type CardPreview,
  type MatchState,
  type MatchSubmission,
  type MatchRoundEvaluation,
  type MaterialCard,
  type MatchDeckCard,
  type MaterialMatchRound,
  type ProcessingAction,
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

export async function getMaterialScan(scanId: string): Promise<StoredMaterialScan | null> {
  const db = storage();
  if (db) {
    const snapshot = await db.collection("material_scans").doc(scanId).get();
    return snapshot.exists ? (snapshot.data() as StoredMaterialScan) : null;
  }
  if (!allowMemoryStorage()) return null;
  const scan = memoryScans.get(scanId);
  return scan ? structuredClone(scan) : null;
}

export async function listMaterialScans(
  ownerId: string,
  limit = 30,
): Promise<StoredMaterialScan[]> {
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  const db = storage();
  if (db) {
    const snapshot = await db
      .collection("material_scans")
      .where("ownerId", "==", ownerId)
      .limit(safeLimit)
      .get();
    return snapshot.docs
      .map((document) => document.data() as StoredMaterialScan)
      .sort((a, b) => b.createdAt - a.createdAt);
  }
  if (!allowMemoryStorage()) return [];
  return [...memoryScans.values()]
    .filter((scan) => scan.ownerId === ownerId)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, safeLimit)
    .map((scan) => structuredClone(scan));
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
    const ledgerRef = db.collection("point_transactions").doc(`card_${input.scanId}`);
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
      tx.create(ledgerRef, {
        id: `card_${input.scanId}`,
        accountId: input.ownerId,
        nickname: ownerNick,
        idempotencyKey: input.idempotencyKey.slice(0, 160),
        type: "spend",
        source: "material_card_create",
        reason: "Tạo hộ chiếu vật liệu",
        amount: -MATERIAL_CARD_CREATE_COST,
        balanceAfter: remainingPoints,
        relatedId: input.scanId,
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
  search = "",
  category?: WasteCategory,
): Promise<{ cards: MaterialCard[]; nextCursor: string | null }> {
  const normalized = ownerNick.trim().toLowerCase();
  const safeLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
  const normalizedSearch = search.trim().toLocaleLowerCase("vi-VN").slice(0, 80);
  const filterCards = (values: MaterialCard[]) =>
    values.filter(
      (card) =>
        (!category || card.category === category) &&
        (!normalizedSearch ||
          card.objectName.toLocaleLowerCase("vi-VN").includes(normalizedSearch)),
    );
  const db = storage();
  if (db) {
    const collection = db.collection("users").doc(normalized).collection("material_cards");
    const snapshot = await collection.orderBy("createdAt", "desc").limit(500).get();
    const values = filterCards(snapshot.docs.map((document) => document.data() as MaterialCard));
    const start = cursor ? Math.max(0, values.findIndex((card) => card.id === cursor) + 1) : 0;
    const cards = values.slice(start, start + safeLimit);
    return {
      cards,
      nextCursor: start + safeLimit < values.length ? (cards.at(-1)?.id ?? null) : null,
    };
  }
  if (!allowMemoryStorage()) {
    throw new MaterialCardError("storage_unavailable", "Kho dữ liệu thẻ chưa được cấu hình.");
  }
  const values = filterCards(
    [...(memoryCards.get(normalized)?.values() ?? [])].sort((a, b) => b.createdAt - a.createdAt),
  );
  const start = cursor ? Math.max(0, values.findIndex((card) => card.id === cursor) + 1) : 0;
  const cards = values.slice(start, start + safeLimit);
  return {
    cards: structuredClone(cards),
    nextCursor: start + safeLimit < values.length ? (cards.at(-1)?.id ?? null) : null,
  };
}

const SCENARIO_POOL: Array<Omit<MaterialMatchRound["objects"][number], "id">> = [
  { label: "Chai nhựa sạch", category: "plastic", condition: "clean", transportCost: 1 },
  { label: "Hộp giấy ướt", category: "paper", condition: "wet", transportCost: 1 },
  { label: "Lọ thủy tinh", category: "glass", condition: "clean", transportCost: 1 },
  { label: "Ly thủy tinh vỡ", category: "glass", condition: "broken", transportCost: 1 },
  { label: "Lon nhôm sạch", category: "metal", condition: "clean", transportCost: 1 },
  { label: "Vỏ rau củ", category: "organic", condition: "clean", transportCost: 1 },
  {
    label: "Pin đã dùng",
    category: "hazard",
    condition: "clean",
    transportCost: 1,
  },
  {
    label: "Bao bì nhựa dính dầu",
    category: "plastic",
    condition: "dirty",
    transportCost: 1,
  },
  { label: "Giấy báo khô", category: "paper", condition: "clean", transportCost: 1 },
];

function buildRounds(seed: string): MaterialMatchRound[] {
  const digest = crypto.createHash("sha256").update(seed).digest();
  return Array.from({ length: 5 }, (_, roundIndex) => ({
    index: roundIndex,
    actionBudget: 5 as const,
    transportBudget: 3 as const,
    objects: Array.from({ length: 3 }, (_, objectIndex) => {
      const poolIndex =
        (digest[(roundIndex * 3 + objectIndex) % digest.length] + objectIndex) %
        SCENARIO_POOL.length;
      return { ...SCENARIO_POOL[poolIndex], id: `r${roundIndex}-o${objectIndex}` };
    }),
  }));
}

function normalizeSteps(steps: ProcessingAction[] | undefined): ProcessingAction[] {
  return Array.isArray(steps) ? steps : [];
}

function evaluateSubmission(
  round: MaterialMatchRound,
  submission: MatchSubmission,
  deck: MatchDeckCard[] = [],
): MatchRoundEvaluation {
  const unique = new Set(submission.choices.map((choice) => choice.objectId));
  if (submission.choices.length !== 3 || unique.size !== 3) {
    throw new MaterialCardError("invalid_submission", "Mỗi vật thể cần đúng một lựa chọn.");
  }
  const actionBudget = Number(round.actionBudget) || 5;
  const transportBudget = Number(round.transportBudget) || 3;
  const actionsUsed = submission.choices.reduce(
    (total, choice) => total + normalizeSteps(choice.steps).length,
    0,
  );
  if (actionsUsed > actionBudget) {
    throw new MaterialCardError(
      "invalid_submission",
      "Vượt quá " + actionBudget + " lượt xử lý của vòng.",
    );
  }

  const abilityCard = submission.abilityCardId
    ? deck.find((card) => card.id === submission.abilityCardId)
    : undefined;
  if (submission.abilityCardId && !abilityCard) {
    throw new MaterialCardError("invalid_submission", "Kỹ năng không thuộc bộ thẻ của người chơi.");
  }
  const abilityTarget = submission.abilityTargetId
    ? round.objects.find((object) => object.id === submission.abilityTargetId)
    : undefined;
  if (abilityCard && !abilityTarget) {
    throw new MaterialCardError("invalid_submission", "Hãy chọn vật thể nhận kỹ năng.");
  }

  let safety = 0;
  let correctness = 0;
  let transportUsed = round.objects.reduce(
    (total, object) => total + (object.transportCost ?? 1),
    0,
  );
  let abilityEfficiency = 0;
  const log: string[] = [];

  for (const object of round.objects) {
    const choice = submission.choices.find((candidate) => candidate.objectId === object.id);
    if (!choice) throw new MaterialCardError("invalid_submission", "Thiếu lựa chọn cho vật thể.");
    const steps = normalizeSteps(choice.steps);
    if (new Set(steps).size !== steps.length) {
      throw new MaterialCardError(
        "invalid_submission",
        "Một bước xử lý không thể lặp lại trên cùng vật thể.",
      );
    }

    let effectiveCondition = object.condition ?? "clean";
    let protectedObject = steps.includes("protect");
    if (effectiveCondition === "dirty" && steps.includes("clean")) effectiveCondition = "clean";
    if (effectiveCondition === "wet" && steps.includes("dry")) effectiveCondition = "clean";

    const isAbilityTarget = abilityCard && abilityTarget?.id === object.id;
    if (isAbilityTarget && abilityCard.category === object.category) {
      if (
        ["paper", "plastic"].includes(abilityCard.category) &&
        effectiveCondition === "clean" &&
        /(Ép|Nén)/i.test(abilityCard.abilityName)
      ) {
        transportUsed = Math.max(0, transportUsed - 1);
        abilityEfficiency += 1;
        log.push(object.label + ": kỹ năng giảm 1 đơn vị vận chuyển.");
      } else if (abilityCard.category === "glass" && effectiveCondition === "broken") {
        protectedObject = true;
        log.push(object.label + ": đã được bọc an toàn bằng kỹ năng.");
      } else if (abilityCard.category === "organic" && effectiveCondition === "dirty") {
        effectiveCondition = "clean";
        log.push(object.label + ": kỹ năng đã tách tạp chất.");
      } else if (
        abilityCard.category === "metal" &&
        choice.action === "recycle" &&
        /Thu hồi/i.test(abilityCard.abilityName)
      ) {
        abilityEfficiency += 1;
        log.push(object.label + ": được đưa vào đúng tuyến thu hồi kim loại.");
      } else if (abilityCard.category === "hazard" && choice.action === "special_collection") {
        protectedObject = true;
        log.push(object.label + ": đã được niêm phong trước khi thu gom riêng.");
      } else {
        log.push(object.label + ": kỹ năng không đủ điều kiện để kích hoạt.");
      }
    }

    if (object.category === "hazard") {
      safety += choice.action === "special_collection" ? 2 : 0;
    } else if (object.category === "glass" && object.condition === "broken") {
      safety += protectedObject ? 2 : choice.action === "residual" ? 1 : 0;
    } else if (
      (object.condition === "dirty" && effectiveCondition === "dirty") ||
      (object.condition === "wet" && effectiveCondition === "wet")
    ) {
      safety += choice.action === "residual" ? 2 : 0;
    } else {
      safety += 2;
    }

    const preferred = expectedActionForCategory(object.category);
    const routeReady =
      effectiveCondition === "clean" ||
      (object.category === "glass" && effectiveCondition === "broken" && protectedObject);
    if (choice.action === preferred && routeReady) {
      correctness += 2;
      log.push(object.label + ": xử lý đúng tuyến sau khi kiểm tra tình trạng.");
    } else if (
      choice.action === "residual" &&
      (effectiveCondition === "dirty" || effectiveCondition === "wet")
    ) {
      correctness += 1;
      log.push(object.label + ": tuyến rác còn lại an toàn nhưng chưa thu hồi được vật liệu.");
    } else {
      log.push(object.label + ": tuyến xử lý chưa phù hợp.");
    }
  }

  if (transportUsed > transportBudget) {
    throw new MaterialCardError(
      "invalid_submission",
      "Cần " + transportUsed + " đơn vị vận chuyển nhưng vòng chỉ có " + transportBudget + ".",
    );
  }
  const efficiency = Math.max(
    0,
    actionBudget + transportBudget - actionsUsed - transportUsed + abilityEfficiency,
  );
  const score = safety * 10 + correctness * 5 + efficiency;
  return {
    score,
    safety,
    safetyMax: round.objects.length * 2,
    correctness,
    correctnessMax: round.objects.length * 2,
    efficiency,
    actionsUsed,
    actionBudget,
    transportUsed,
    transportBudget,
    log,
  };
}

function scoreSubmission(
  round: MaterialMatchRound,
  submission: MatchSubmission,
  deck: MatchDeckCard[] = [],
): number {
  return evaluateSubmission(round, submission, deck).score;
}

function evaluateLegacySubmission(
  round: MaterialMatchRound,
  submission: MatchSubmission,
  deck: MatchDeckCard[] = [],
): MatchRoundEvaluation {
  const unique = new Set(submission.choices.map((choice) => choice.objectId));
  if (submission.choices.length !== 3 || unique.size !== 3) {
    throw new MaterialCardError("invalid_submission", "Mỗi vật thể cần đúng một lựa chọn.");
  }
  let score = 0;
  let correctness = 0;
  for (const object of round.objects) {
    const choice = submission.choices.find((candidate) => candidate.objectId === object.id);
    if (!choice) throw new MaterialCardError("invalid_submission", "Thiếu lựa chọn cho vật thể.");
    if (choice.action === expectedActionForScenario(object)) {
      score += object.category === "hazard" ? 14 : 10;
      correctness += 2;
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
    const applicable = round.objects.some((object) => {
      const choice = submission.choices.find((candidate) => candidate.objectId === object.id);
      if (
        object.category !== abilityCard.category ||
        choice?.action !== expectedActionForScenario(object)
      ) {
        return false;
      }
      if (abilityCard.category === "paper")
        return !["wet", "dirty"].includes(object.condition ?? "");
      if (abilityCard.category === "plastic") return object.condition !== "dirty";
      if (abilityCard.category === "glass") return object.condition === "broken";
      if (abilityCard.category === "organic") return object.condition === "dirty";
      if (abilityCard.category === "metal") return object.condition === "clean";
      return false;
    });
    if (applicable) score += 2;
  }
  return {
    score,
    safety: correctness,
    safetyMax: round.objects.length * 2,
    correctness,
    correctnessMax: round.objects.length * 2,
    efficiency: 0,
    actionsUsed: 0,
    actionBudget: Number(round.actionBudget) || 3,
    transportUsed: round.objects.length,
    transportBudget: Number(round.transportBudget) || 3,
    log: ["Trận này tiếp tục dùng luật phân loại phiên bản cũ."],
  };
}

function botSubmission(round: MaterialMatchRound, matchId: string): MatchSubmission {
  const digest = crypto
    .createHash("sha256")
    .update(matchId + ":" + round.index)
    .digest()[0];
  const choices = round.objects.map((object, index) => {
    const steps: ProcessingAction[] = [];
    if (object.condition === "dirty") steps.push("clean");
    if (object.condition === "wet") steps.push("dry");
    if (object.condition === "broken") steps.push("protect");
    const makeMistake = digest % 7 === index;
    return {
      objectId: object.id,
      steps,
      action: makeMistake ? ("residual" as const) : expectedActionForCategory(object.category),
    };
  });
  const submission: MatchSubmission = { roundIndex: round.index, choices };
  return { ...submission, evaluation: evaluateSubmission(round, submission) };
}

function finalizeMatch(state: MatchState): MatchState {
  if (state.playerSubmissions.length < state.rounds.length) return state;
  if (state.mode === "asynchronous" && state.opponentSubmissions.length < state.rounds.length) {
    return { ...state, status: "waiting" };
  }
  const practiceSubmissions =
    state.mode === "practice"
      ? state.rounds.map((round) => botSubmission(round, state.id))
      : state.opponentSubmissions;
  const opponentScore =
    state.mode === "practice"
      ? practiceSubmissions.reduce(
          (total, submission) => total + (submission.evaluation?.score ?? 0),
          0,
        )
      : state.opponentScore;
  const result =
    state.playerScore === opponentScore
      ? "draw"
      : state.playerScore > opponentScore
        ? "win"
        : "loss";
  return {
    ...state,
    status: "completed",
    opponentSubmissions: practiceSubmissions,
    opponentScore,
    result,
    ratingDelta: state.mode === "practice" ? 0 : result === "win" ? 12 : result === "loss" ? -8 : 0,
    opponentRatingDelta:
      state.mode === "practice" ? 0 : result === "win" ? -8 : result === "loss" ? 12 : 0,
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
    rulesetVersion: MATERIAL_MATCH_RULESET_VERSION,
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
    opponentRatingDelta: 0,
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

export async function listMaterialMatches(actorId: string): Promise<MatchState[]> {
  const normalizedActorId = actorId.trim().toLowerCase();
  const db = storage();
  let matches: MatchState[];
  if (db) {
    const [created, invited] = await Promise.all([
      db.collection("material_matches").where("playerId", "==", normalizedActorId).limit(100).get(),
      db
        .collection("material_matches")
        .where("opponentId", "==", normalizedActorId)
        .limit(100)
        .get(),
    ]);
    const unique = new Map<string, MatchState>();
    for (const snapshot of [...created.docs, ...invited.docs]) {
      unique.set(snapshot.id, snapshot.data() as MatchState);
    }
    matches = [...unique.values()];
    const expired = matches.filter(
      (match) =>
        match.status !== "completed" && match.status !== "expired" && match.expiresAt <= Date.now(),
    );
    if (expired.length > 0) {
      const batch = db.batch();
      for (const match of expired) {
        match.status = "expired";
        batch.set(
          db.collection("material_matches").doc(match.id),
          { status: "expired" },
          { merge: true },
        );
      }
      await batch.commit();
    }
  } else if (allowMemoryStorage()) {
    matches = [...memoryMatches.values()].filter(
      (match) => match.playerId === normalizedActorId || match.opponentId === normalizedActorId,
    );
    for (const match of matches) {
      if (match.status !== "completed" && match.expiresAt <= Date.now()) match.status = "expired";
    }
  } else {
    throw new MaterialCardError("storage_unavailable", "Kho dữ liệu trận đấu chưa được cấu hình.");
  }
  return matches.sort((a, b) => b.createdAt - a.createdAt).map((match) => structuredClone(match));
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
  const evaluation =
    state.rulesetVersion === MATERIAL_MATCH_RULESET_VERSION
      ? evaluateSubmission(round, submission, isPlayer ? state.playerDeck : state.opponentDeck)
      : evaluateLegacySubmission(
          round,
          submission,
          isPlayer ? state.playerDeck : state.opponentDeck,
        );
  const scoredSubmission: MatchSubmission = { ...submission, evaluation };
  const next: MatchState = isPlayer
    ? {
        ...state,
        playerSubmissions: [...submissions, scoredSubmission],
        playerScore: state.playerScore + evaluation.score,
      }
    : {
        ...state,
        opponentSubmissions: [...submissions, scoredSubmission],
        opponentScore: state.opponentScore + evaluation.score,
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
        const opponentDelta = next.opponentRatingDelta ?? 0;
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
  evaluateSubmission,
  buildRounds,
  expectedActionForCategory,
};
