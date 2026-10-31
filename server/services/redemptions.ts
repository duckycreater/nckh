import crypto from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import type { RedeemInfo } from "../../src/lib/redemption.js";
import type { RewardRecord } from "../rewardsDb.js";
import { getFirestore } from "../db.js";

export type RedemptionStatus = "pending" | "approved" | "fulfilled" | "cancelled";

export interface RedemptionRecord {
  id: string;
  ownerId: string;
  ownerNick: string;
  reward: Pick<RewardRecord, "id" | "name" | "desc" | "cost" | "imageUrl">;
  recipient: RedeemInfo;
  cost: number;
  status: RedemptionStatus;
  createdAt: number;
  updatedAt: number;
  approvedAt: number | null;
  fulfilledAt: number | null;
  cancelledAt: number | null;
  refundedAt: number | null;
  idempotencyKey: string;
}

export class RedemptionError extends Error {
  constructor(
    public readonly code:
      | "storage_unavailable"
      | "user_not_found"
      | "insufficient_points"
      | "invalid_transition"
      | "redemption_not_found",
    message: string,
  ) {
    super(message);
  }
}

function redemptionId(ownerId: string, idempotencyKey: string): string {
  return crypto
    .createHash("sha256")
    .update(`${ownerId}:${idempotencyKey}`)
    .digest("hex")
    .slice(0, 40);
}

export function canTransitionRedemption(
  current: RedemptionStatus,
  next: RedemptionStatus,
): boolean {
  if (current === next) return true;
  if (current === "pending") return next === "approved" || next === "cancelled";
  if (current === "approved") return next === "fulfilled" || next === "cancelled";
  return false;
}

export async function createRedemption(input: {
  ownerId: string;
  ownerNick: string;
  reward: RewardRecord;
  recipient: RedeemInfo;
  idempotencyKey: string;
}): Promise<{ redemption: RedemptionRecord; balance: number; created: boolean }> {
  const db = getFirestore();
  if (!db) throw new RedemptionError("storage_unavailable", "Kho giao dịch chưa sẵn sàng.");
  const id = redemptionId(input.ownerId, input.idempotencyKey);
  const redemptionRef = db.collection("redemptions").doc(id);
  const userRef = db.collection("users").doc(input.ownerNick.toLowerCase());
  const progressRef = db.collection("user_progress").doc(input.ownerNick.toLowerCase());
  return db.runTransaction(async (transaction) => {
    const [existing, userSnapshot] = await Promise.all([
      transaction.get(redemptionRef),
      transaction.get(userRef),
    ]);
    if (!userSnapshot.exists) {
      throw new RedemptionError("user_not_found", "Không tìm thấy tài khoản.");
    }
    const user = userSnapshot.data() as { points?: unknown; account_id?: unknown };
    if (existing.exists) {
      const redemption = existing.data() as RedemptionRecord;
      if (redemption.ownerId !== input.ownerId) {
        throw new RedemptionError("redemption_not_found", "Không tìm thấy đơn đổi quà.");
      }
      return {
        redemption,
        balance: Math.max(0, Math.trunc(Number(user.points) || 0)),
        created: false,
      };
    }
    if (user.account_id !== input.ownerId) {
      throw new RedemptionError("user_not_found", "Định danh tài khoản không khớp.");
    }
    const balance = Math.max(0, Math.trunc(Number(user.points) || 0));
    const cost = Math.max(1, Math.trunc(input.reward.cost));
    if (balance < cost) {
      throw new RedemptionError("insufficient_points", "Không đủ điểm.");
    }
    const now = Date.now();
    const redemption: RedemptionRecord = {
      id,
      ownerId: input.ownerId,
      ownerNick: input.ownerNick.toLowerCase(),
      reward: {
        id: input.reward.id,
        name: input.reward.name,
        desc: input.reward.desc,
        cost,
        imageUrl: input.reward.imageUrl,
      },
      recipient: input.recipient,
      cost,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      approvedAt: null,
      fulfilledAt: null,
      cancelledAt: null,
      refundedAt: null,
      idempotencyKey: input.idempotencyKey,
    };
    const nextBalance = balance - cost;
    transaction.update(userRef, { points: nextBalance });
    transaction.set(
      progressRef,
      { crafted: FieldValue.arrayUnion(input.reward.id) },
      { merge: true },
    );
    transaction.create(redemptionRef, redemption);
    transaction.create(db.collection("point_transactions").doc(`redeem_${id}`), {
      id: `redeem_${id}`,
      accountId: input.ownerId,
      nickname: input.ownerNick.toLowerCase(),
      type: "spend",
      source: "redemption",
      amount: -cost,
      balanceAfter: nextBalance,
      relatedId: id,
      idempotencyKey: input.idempotencyKey,
      createdAt: now,
    });
    transaction.create(db.collection("notifications").doc(`redemption_created_${id}`), {
      id: `redemption_created_${id}`,
      userId: input.ownerId,
      kind: "redemption_status",
      title: "Đã tiếp nhận yêu cầu đổi quà",
      body: `${input.reward.name} đang chờ duyệt.`,
      relatedId: id,
      readAt: null,
      createdAt: now,
    });
    return { redemption, balance: nextBalance, created: true };
  });
}

export async function listRedemptions(ownerId?: string): Promise<RedemptionRecord[]> {
  const db = getFirestore();
  if (!db) throw new RedemptionError("storage_unavailable", "Kho giao dịch chưa sẵn sàng.");
  const query = ownerId
    ? db.collection("redemptions").where("ownerId", "==", ownerId).limit(200)
    : db.collection("redemptions").limit(500);
  const snapshot = await query.get();
  return snapshot.docs
    .map((document) => document.data() as RedemptionRecord)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function updateRedemptionStatus(
  id: string,
  nextStatus: RedemptionStatus,
): Promise<RedemptionRecord> {
  const db = getFirestore();
  if (!db) throw new RedemptionError("storage_unavailable", "Kho giao dịch chưa sẵn sàng.");
  const redemptionRef = db.collection("redemptions").doc(id);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(redemptionRef);
    if (!snapshot.exists) {
      throw new RedemptionError("redemption_not_found", "Không tìm thấy đơn đổi quà.");
    }
    const current = snapshot.data() as RedemptionRecord;
    if (!canTransitionRedemption(current.status, nextStatus)) {
      throw new RedemptionError("invalid_transition", "Không thể chuyển đơn sang trạng thái này.");
    }
    if (current.status === nextStatus) return current;
    const now = Date.now();
    const next: RedemptionRecord = {
      ...current,
      status: nextStatus,
      updatedAt: now,
      approvedAt: nextStatus === "approved" ? now : current.approvedAt,
      fulfilledAt: nextStatus === "fulfilled" ? now : current.fulfilledAt,
      cancelledAt: nextStatus === "cancelled" ? now : current.cancelledAt,
      refundedAt: current.refundedAt,
    };
    if (nextStatus === "cancelled" && !current.refundedAt) {
      const userRef = db.collection("users").doc(current.ownerNick);
      const userSnapshot = await transaction.get(userRef);
      if (!userSnapshot.exists)
        throw new RedemptionError("user_not_found", "Không tìm thấy tài khoản.");
      const balance = Math.max(0, Math.trunc(Number(userSnapshot.data()?.points) || 0));
      const nextBalance = balance + current.cost;
      transaction.update(userRef, { points: nextBalance });
      next.refundedAt = now;
      transaction.create(db.collection("point_transactions").doc(`refund_${current.id}`), {
        id: `refund_${current.id}`,
        accountId: current.ownerId,
        nickname: current.ownerNick,
        type: "earn",
        source: "redemption_refund",
        amount: current.cost,
        balanceAfter: nextBalance,
        relatedId: current.id,
        idempotencyKey: `refund:${current.id}`,
        createdAt: now,
      });
    }
    transaction.set(redemptionRef, next, { merge: false });
    transaction.create(db.collection("notifications").doc(`redemption_${nextStatus}_${id}`), {
      id: `redemption_${nextStatus}_${id}`,
      userId: current.ownerId,
      kind: "redemption_status",
      title:
        nextStatus === "approved"
          ? "Đơn đổi quà đã được duyệt"
          : nextStatus === "fulfilled"
            ? "Đơn đổi quà đã hoàn tất"
            : "Đơn đổi quà đã hủy",
      body: current.reward.name,
      relatedId: id,
      readAt: null,
      createdAt: now,
    });
    return next;
  });
}
