import crypto from "node:crypto";
import { getFirestore } from "../db.js";
import {
  deliverEmail,
  type EmailDeliveryResult,
  type EmailSender,
  type TransactionalEmail,
} from "./emailDelivery.js";

export type OutboxStatus = "queued" | "sending" | "accepted" | "delivered" | "bounced" | "failed";

export interface EmailOutboxDocument {
  id: string;
  kind: string;
  message: TransactionalEmail;
  status: OutboxStatus;
  attempts: number;
  providerMessageId: string | null;
  lastError: string | null;
  createdAt: number;
  updatedAt: number;
  nextAttemptAt: number;
  acceptedAt: number | null;
  deliveredAt: number | null;
  leaseExpiresAt: number | null;
}

export type EmailQueueResult =
  | { status: "accepted"; outboxId: string; providerMessageId?: string }
  | { status: "queued"; outboxId: string; reason: string; nextAttemptAt: number }
  | Extract<EmailDeliveryResult, { status: "skipped" }>;

const COLLECTION = "email_outbox";
const MAX_ATTEMPTS = 5;
const SEND_LEASE_MS = 2 * 60 * 1000;
const memoryOutbox = new Map<string, EmailOutboxDocument>();

function retryDelay(attempts: number) {
  return Math.min(60 * 60 * 1000, 30_000 * 2 ** Math.max(0, attempts - 1));
}

async function save(document: EmailOutboxDocument) {
  const db = getFirestore();
  if (db) await db.collection(COLLECTION).doc(document.id).set(document, { merge: false });
  else memoryOutbox.set(document.id, structuredClone(document));
}

async function read(id: string): Promise<EmailOutboxDocument | null> {
  const db = getFirestore();
  if (db) {
    const snapshot = await db.collection(COLLECTION).doc(id).get();
    return snapshot.exists ? (snapshot.data() as EmailOutboxDocument) : null;
  }
  return structuredClone(memoryOutbox.get(id) ?? null);
}

async function claim(id: string): Promise<EmailOutboxDocument | null> {
  const db = getFirestore();
  if (db) {
    const ref = db.collection(COLLECTION).doc(id);
    return db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return null;
      const document = snapshot.data() as EmailOutboxDocument;
      if (
        document.status === "accepted" ||
        document.status === "delivered" ||
        document.status === "bounced" ||
        (document.status === "sending" && (document.leaseExpiresAt ?? Infinity) > Date.now()) ||
        document.attempts >= MAX_ATTEMPTS ||
        document.nextAttemptAt > Date.now()
      ) {
        return null;
      }
      const next = {
        ...document,
        status: "sending" as const,
        attempts: document.attempts + 1,
        updatedAt: Date.now(),
        leaseExpiresAt: Date.now() + SEND_LEASE_MS,
      };
      transaction.set(ref, next, { merge: false });
      return next;
    });
  }
  const document = memoryOutbox.get(id);
  if (
    !document ||
    document.status === "accepted" ||
    document.status === "delivered" ||
    document.status === "bounced" ||
    (document.status === "sending" && (document.leaseExpiresAt ?? Infinity) > Date.now()) ||
    document.attempts >= MAX_ATTEMPTS ||
    document.nextAttemptAt > Date.now()
  ) {
    return null;
  }
  const next = {
    ...document,
    status: "sending" as const,
    attempts: document.attempts + 1,
    updatedAt: Date.now(),
    leaseExpiresAt: Date.now() + SEND_LEASE_MS,
  };
  memoryOutbox.set(id, structuredClone(next));
  return next;
}

export async function processEmailOutboxItem(
  id: string,
  sender: EmailSender,
): Promise<EmailOutboxDocument | null> {
  const claimed = await claim(id);
  if (!claimed) return read(id);
  const delivery = await deliverEmail(sender, claimed.message);
  const now = Date.now();
  const next: EmailOutboxDocument =
    delivery.status === "accepted"
      ? {
          ...claimed,
          status: "accepted",
          providerMessageId: delivery.id ?? null,
          lastError: null,
          updatedAt: now,
          acceptedAt: now,
          leaseExpiresAt: null,
          nextAttemptAt: 0,
        }
      : {
          ...claimed,
          status: "failed",
          lastError:
            delivery.status === "failed" ? delivery.reason : "provider_or_recipient_not_configured",
          updatedAt: now,
          leaseExpiresAt: null,
          nextAttemptAt: now + retryDelay(claimed.attempts),
        };
  await save(next);
  return next;
}

export async function enqueueEmail(
  sender: EmailSender | null,
  kind: string,
  message: TransactionalEmail | null,
): Promise<EmailQueueResult> {
  if (!sender) return { status: "skipped", reason: "provider_not_configured" };
  if (!message || (Array.isArray(message.to) ? message.to.length === 0 : !message.to.trim())) {
    return { status: "skipped", reason: "recipient_not_configured" };
  }
  const now = Date.now();
  const document: EmailOutboxDocument = {
    id: crypto.randomUUID(),
    kind: kind.slice(0, 80),
    message,
    status: "queued",
    attempts: 0,
    providerMessageId: null,
    lastError: null,
    createdAt: now,
    updatedAt: now,
    nextAttemptAt: now,
    acceptedAt: null,
    deliveredAt: null,
    leaseExpiresAt: null,
  };
  await save(document);
  const processed = await processEmailOutboxItem(document.id, sender);
  if (processed?.status === "accepted") {
    return {
      status: "accepted",
      outboxId: processed.id,
      ...(processed.providerMessageId ? { providerMessageId: processed.providerMessageId } : {}),
    };
  }
  return {
    status: "queued",
    outboxId: document.id,
    reason: processed?.lastError || "delivery_deferred",
    nextAttemptAt: processed?.nextAttemptAt || now + retryDelay(1),
  };
}

export async function retryDueEmails(sender: EmailSender | null): Promise<number> {
  if (!sender) return 0;
  const now = Date.now();
  const db = getFirestore();
  const documents = db
    ? (
        await Promise.all(
          (["queued", "failed", "sending"] as const).map((status) =>
            // Keep deployment independent from a composite Firestore index.
            // Status has an automatic single-field index; due-time and lease
            // checks happen below before the batch is capped.
            db.collection(COLLECTION).where("status", "==", status).get(),
          ),
        )
      ).flatMap((result) => result.docs.map((snapshot) => snapshot.data() as EmailOutboxDocument))
    : [...memoryOutbox.values()];
  const due = documents
    .filter(
      (document) =>
        (document.status === "queued" ||
          document.status === "failed" ||
          (document.status === "sending" && (document.leaseExpiresAt ?? 0) <= now)) &&
        document.attempts < MAX_ATTEMPTS &&
        document.nextAttemptAt <= now,
    )
    .sort((left, right) => left.nextAttemptAt - right.nextAttemptAt)
    .slice(0, 50);
  await Promise.all(due.map((document) => processEmailOutboxItem(document.id, sender)));
  return due.length;
}

export function startEmailOutboxWorker(sender: EmailSender | null): NodeJS.Timeout | null {
  if (!sender) return null;
  void retryDueEmails(sender).catch((error) => console.error("[email-outbox] retry failed", error));
  const timer = setInterval(
    () =>
      void retryDueEmails(sender).catch((error) =>
        console.error("[email-outbox] retry failed", error),
      ),
    60_000,
  );
  timer.unref();
  return timer;
}

export async function getEmailOutboxSummary() {
  const db = getFirestore();
  const documents = db
    ? (await db.collection(COLLECTION).limit(200).get()).docs.map(
        (snapshot) => snapshot.data() as EmailOutboxDocument,
      )
    : [...memoryOutbox.values()];
  return {
    queued: documents.filter((document) => document.status === "queued").length,
    retrying: documents.filter(
      (document) => document.status === "failed" && document.attempts < MAX_ATTEMPTS,
    ).length,
    exhausted: documents.filter(
      (document) => document.status === "failed" && document.attempts >= MAX_ATTEMPTS,
    ).length,
    accepted: documents.filter((document) => document.status === "accepted").length,
    delivered: documents.filter((document) => document.status === "delivered").length,
    bounced: documents.filter((document) => document.status === "bounced").length,
    sending: documents.filter((document) => document.status === "sending").length,
  };
}

/** Provider webhooks call this after signature verification. "accepted" only
 * means that the provider took responsibility for a message; delivery and
 * bounce are deliberately recorded as separate terminal states. */
export async function recordEmailDeliveryEvent(
  providerMessageId: string,
  event: "delivered" | "bounced",
): Promise<boolean> {
  const normalizedId = providerMessageId.trim();
  if (!normalizedId) return false;
  const db = getFirestore();
  let document: EmailOutboxDocument | null = null;
  if (db) {
    const result = await db
      .collection(COLLECTION)
      .where("providerMessageId", "==", normalizedId)
      .limit(1)
      .get();
    document = result.empty ? null : (result.docs[0].data() as EmailOutboxDocument);
  } else {
    document =
      [...memoryOutbox.values()].find((item) => item.providerMessageId === normalizedId) ?? null;
  }
  if (!document) return false;
  // Webhooks are commonly delivered more than once. Replaying the same event
  // must be a no-op and a delivered message must never be downgraded.
  if (document.status === "delivered" || document.status === event) return true;
  const now = Date.now();
  await save({
    ...document,
    status: event,
    updatedAt: now,
    deliveredAt: event === "delivered" ? now : document.deliveredAt,
    leaseExpiresAt: null,
    nextAttemptAt: 0,
  });
  return true;
}

export const emailOutboxTestUtils = {
  reset: () => memoryOutbox.clear(),
  list: () => [...memoryOutbox.values()].map((document) => structuredClone(document)),
  seed: (documents: EmailOutboxDocument[]) => {
    for (const document of documents) memoryOutbox.set(document.id, structuredClone(document));
  },
};
