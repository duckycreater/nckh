/**
 * Server-side guard for gameplay rewards.
 *
 * The client may request an action, but it never chooses an arbitrary point
 * balance.  This guard adds bounded action budgets and idempotency so retries
 * and replayed requests cannot mint unlimited points.  Persistence of the
 * resulting balance remains the responsibility of the route's user store.
 */
import crypto from "node:crypto";
import { getVietnamDayKey } from "../../src/lib/dayKey.js";

export interface RewardRequest {
  nick: string;
  points: unknown;
  action?: unknown;
  reason?: unknown;
  idempotencyKey?: unknown;
  now?: number;
}

export interface RewardReservation {
  reservationId: string;
  key: string;
  nick: string;
  points: number;
  action: string;
  reason: string;
  duplicate: false;
}

export interface DuplicateReward {
  duplicate: true;
  key: string;
}

export type RewardDecision = RewardReservation | DuplicateReward;

interface Claim {
  points: number;
  expiresAt: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_CLAIMS = 100_000;
const configuredDailyCap = Number.parseInt(process.env.REWARD_DAILY_CAP || "750", 10);
const DAILY_TOTAL_CAP =
  Number.isFinite(configuredDailyCap) && configuredDailyCap > 0 ? configuredDailyCap : 750;

// These are intentionally conservative.  A new action must be added here and
// documented before it can mint points in production.
const ACTION_CAPS: Record<string, number> = {
  ai_scan_local: 50,
  garden_pet: 3,
  garden_clean: 10,
  card_battle: 500,
  roguelike: 400,
};

const claims = new Map<string, Claim>();
const reservations = new Map<string, { key: string; nick: string; points: number; day: string }>();
const dailyTotals = new Map<string, { day: string; total: number }>();
const rewardLocks = new Map<string, Promise<void>>();

/** Serialize balance read/modify/write operations for one account in-process. */
export async function acquireRewardLock(nick: string): Promise<() => void> {
  const key = nick.trim().toLowerCase();
  const previous = rewardLocks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  rewardLocks.set(key, current);
  await previous;
  return () => {
    if (rewardLocks.get(key) === current) rewardLocks.delete(key);
    release();
  };
}

function dayKey(now: number): string {
  return getVietnamDayKey(now);
}

function clean(now: number): void {
  for (const [key, claim] of claims) {
    if (claim.expiresAt <= now) claims.delete(key);
  }
  if (claims.size > MAX_CLAIMS) {
    const excess = claims.size - MAX_CLAIMS;
    let removed = 0;
    for (const key of claims.keys()) {
      claims.delete(key);
      if (++removed >= excess) break;
    }
  }
}

function safeText(value: unknown, max: number, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const text = value.trim();
  return text.length > 0 ? text.slice(0, max) : fallback;
}

/** Reserve a reward before mutating the user's balance. */
export function reserveReward(input: RewardRequest): RewardDecision {
  const now = input.now ?? Date.now();
  clean(now);
  const nick = safeText(input.nick, 100, "");
  if (!nick) throw new Error("authenticated nickname required");

  const points =
    typeof input.points === "number" && Number.isSafeInteger(input.points)
      ? input.points
      : Number.NaN;
  if (!Number.isSafeInteger(points) || Math.abs(points) > 1000 || points === 0) {
    throw new Error("points must be a non-zero integer between -1000 and 1000");
  }

  const action = safeText(input.action, 40, "").toLowerCase();
  if (!(action in ACTION_CAPS)) throw new Error("unknown reward action");
  const reason = safeText(input.reason, 200, action);
  const today = dayKey(now);
  const suppliedKey = safeText(input.idempotencyKey, 160, "");
  const key =
    suppliedKey ||
    crypto
      .createHash("sha256")
      .update(`${nick.toLowerCase()}|${action}|${points}|${reason}|${today}`)
      .digest("hex");

  const previous = claims.get(key);
  if (previous && previous.expiresAt > now) return { duplicate: true, key };

  if (points > 0) {
    const actionCap = ACTION_CAPS[action];
    if (points > actionCap) throw new Error(`reward exceeds the ${action} action cap`);
    const totalKey = `${nick.toLowerCase()}:${today}`;
    const total = dailyTotals.get(totalKey)?.total ?? 0;
    if (total + points > DAILY_TOTAL_CAP) throw new Error("daily reward budget exceeded");
    dailyTotals.set(totalKey, { day: today, total: total + points });
  }

  const reservationId = crypto.randomUUID();
  reservations.set(reservationId, { key, nick, points, day: today });
  claims.set(key, { points, expiresAt: now + 10 * 60 * 1000 });
  return { reservationId, key, nick, points, action, reason, duplicate: false };
}

/** Commit after the user store has successfully changed the balance. */
export function commitReward(reservation: RewardReservation): void {
  reservations.delete(reservation.reservationId);
}

/** Roll back a failed persistence operation. */
export function rollbackReward(reservation: RewardReservation): void {
  const state = reservations.get(reservation.reservationId);
  reservations.delete(reservation.reservationId);
  claims.delete(reservation.key);
  if (state && state.points > 0) {
    const totalKey = `${state.nick.toLowerCase()}:${state.day}`;
    const current = dailyTotals.get(totalKey);
    if (current) {
      current.total = Math.max(0, current.total - state.points);
      if (current.total === 0) dailyTotals.delete(totalKey);
    }
  }
}

export function rewardPolicy(): { dailyCap: number; actionCaps: Record<string, number> } {
  return { dailyCap: DAILY_TOTAL_CAP, actionCaps: { ...ACTION_CAPS } };
}
