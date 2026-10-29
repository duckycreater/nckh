import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  emailOutboxTestUtils,
  enqueueEmail,
  recordEmailDeliveryEvent,
  retryDueEmails,
  type EmailOutboxDocument,
} from "../../server/services/emailOutbox.js";

const message = {
  from: "BMO <no-reply@example.com>",
  to: "ops@example.com",
  subject: "Reward request",
  text: "A student requested a reward.",
};

describe("durable email outbox", () => {
  beforeEach(() => emailOutboxTestUtils.reset());

  it("persists provider failures with retry state", async () => {
    const sender = vi.fn().mockRejectedValue(new Error("temporary network failure"));
    const result = await enqueueEmail(sender, "redemption", message);
    expect(result.status).toBe("queued");
    expect(emailOutboxTestUtils.list()).toMatchObject([
      {
        kind: "redemption",
        status: "failed",
        attempts: 1,
        lastError: "temporary network failure",
      },
    ]);
  });

  it("records acceptance without claiming mailbox delivery", async () => {
    const sender = vi.fn().mockResolvedValue({ data: { id: "provider-1" }, error: null });
    const result = await enqueueEmail(sender, "purchase", message);
    expect(result).toMatchObject({ status: "accepted", providerMessageId: "provider-1" });
    expect(emailOutboxTestUtils.list()[0]).toMatchObject({
      status: "accepted",
      providerMessageId: "provider-1",
      attempts: 1,
    });
  });

  it("does not starve a due message behind more than fifty accepted messages", async () => {
    const now = Date.now();
    const base: EmailOutboxDocument = {
      id: "accepted-0",
      kind: "test",
      message,
      status: "accepted",
      attempts: 1,
      providerMessageId: "provider-old",
      lastError: null,
      createdAt: now - 60_000,
      updatedAt: now - 60_000,
      nextAttemptAt: 0,
      acceptedAt: now - 60_000,
      deliveredAt: null,
      leaseExpiresAt: null,
    };
    emailOutboxTestUtils.seed([
      ...Array.from({ length: 60 }, (_, index) => ({
        ...base,
        id: `accepted-${index}`,
        providerMessageId: `provider-${index}`,
      })),
      {
        ...base,
        id: "due",
        status: "failed",
        providerMessageId: null,
        nextAttemptAt: now - 1,
        acceptedAt: null,
      },
    ]);
    const sender = vi.fn().mockResolvedValue({ data: { id: "provider-due" }, error: null });

    await expect(retryDueEmails(sender)).resolves.toBe(1);
    expect(sender).toHaveBeenCalledTimes(1);
    expect(emailOutboxTestUtils.list().find((item) => item.id === "due")?.status).toBe("accepted");
  });

  it("drains more than fifty due messages across bounded worker batches", async () => {
    const now = Date.now();
    emailOutboxTestUtils.seed(
      Array.from({ length: 75 }, (_, index): EmailOutboxDocument => ({
        id: `due-${index}`,
        kind: "test",
        message,
        status: "queued",
        attempts: 0,
        providerMessageId: null,
        lastError: null,
        createdAt: now - 60_000 + index,
        updatedAt: now - 60_000 + index,
        nextAttemptAt: now - 1_000 + index,
        acceptedAt: null,
        deliveredAt: null,
        leaseExpiresAt: null,
      })),
    );
    const sender = vi.fn().mockImplementation(async () => ({
      data: { id: `provider-${sender.mock.calls.length}` },
      error: null,
    }));

    await expect(retryDueEmails(sender)).resolves.toBe(50);
    await expect(retryDueEmails(sender)).resolves.toBe(25);
    expect(sender).toHaveBeenCalledTimes(75);
    expect(emailOutboxTestUtils.list().every((item) => item.status === "accepted")).toBe(true);
  });

  it("reclaims an expired sending lease after a worker crash", async () => {
    const now = Date.now();
    emailOutboxTestUtils.seed([
      {
        id: "stale-send",
        kind: "test",
        message,
        status: "sending",
        attempts: 1,
        providerMessageId: null,
        lastError: null,
        createdAt: now - 180_000,
        updatedAt: now - 180_000,
        nextAttemptAt: now - 120_000,
        acceptedAt: null,
        deliveredAt: null,
        leaseExpiresAt: now - 1,
      },
    ]);
    const sender = vi.fn().mockResolvedValue({ data: { id: "provider-recovered" }, error: null });

    await expect(retryDueEmails(sender)).resolves.toBe(1);
    expect(emailOutboxTestUtils.list()[0]).toMatchObject({
      status: "accepted",
      attempts: 2,
      providerMessageId: "provider-recovered",
    });
  });

  it("records provider delivery webhooks idempotently", async () => {
    const sender = vi.fn().mockResolvedValue({ data: { id: "provider-webhook" }, error: null });
    await enqueueEmail(sender, "purchase", message);

    await expect(recordEmailDeliveryEvent("provider-webhook", "delivered")).resolves.toBe(true);
    await expect(recordEmailDeliveryEvent("provider-webhook", "delivered")).resolves.toBe(true);
    expect(emailOutboxTestUtils.list()[0].status).toBe("delivered");
  });
});
