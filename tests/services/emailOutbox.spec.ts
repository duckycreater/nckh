import { beforeEach, describe, expect, it, vi } from "vitest";
import { emailOutboxTestUtils, enqueueEmail } from "../../server/services/emailOutbox.js";

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
});
