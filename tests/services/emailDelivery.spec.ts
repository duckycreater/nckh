import { describe, expect, it, vi } from "vitest";
import {
  deliverEmail,
  getEmailConfigurationStatus,
  type TransactionalEmail,
} from "../../server/services/emailDelivery";

const message: TransactionalEmail = {
  from: "BMO <no-reply@example.com>",
  to: "student@example.com",
  subject: "BMO email diagnostic",
  text: "Delivery check",
};

describe("email delivery", () => {
  it("reports missing provider configuration without throwing", async () => {
    await expect(deliverEmail(null, message)).resolves.toEqual({
      status: "skipped",
      reason: "provider_not_configured",
    });
  });

  it("reports missing recipient separately", async () => {
    const sender = vi.fn();
    await expect(deliverEmail(sender, { ...message, to: "" })).resolves.toEqual({
      status: "skipped",
      reason: "recipient_not_configured",
    });
    expect(sender).not.toHaveBeenCalled();
  });

  it("passes the exact message to the provider and returns its id", async () => {
    const sender = vi.fn().mockResolvedValue({ data: { id: "mail_123" }, error: null });
    await expect(deliverEmail(sender, message)).resolves.toEqual({
      status: "sent",
      id: "mail_123",
    });
    expect(sender).toHaveBeenCalledOnce();
    expect(sender).toHaveBeenCalledWith(message);
  });

  it("turns provider errors and exceptions into observable failures", async () => {
    const rejected = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "domain is not verified" },
    });
    await expect(deliverEmail(rejected, message)).resolves.toEqual({
      status: "failed",
      reason: "domain is not verified",
    });

    const crashed = vi.fn().mockRejectedValue(new Error("network unavailable"));
    await expect(deliverEmail(crashed, message)).resolves.toEqual({
      status: "failed",
      reason: "network unavailable",
    });
  });

  it("exposes configuration flags without exposing any secret values", () => {
    expect(
      getEmailConfigurationStatus({
        RESEND_API_KEY: "secret",
        NOTIFICATION_FROM_EMAIL: "BMO <mail@example.com>",
        PURCHASE_NOTIFICATION_EMAIL: "ops@example.com",
        PUBLIC_APP_URL: "https://example.com",
      }),
    ).toEqual({
      provider: "resend",
      configured: true,
      fromConfigured: true,
      notificationRecipientConfigured: true,
      publicAppUrlConfigured: true,
    });
  });

  it("accepts grouped Gmail App Password formatting when detecting SMTP", () => {
    expect(
      getEmailConfigurationStatus({
        EMAIL_PROVIDER: "smtp",
        SMTP_USER: "ops@example.com",
        SMTP_PASS: "abcd efgh ijkl mnop",
      }),
    ).toMatchObject({
      provider: "smtp",
      configured: true,
      fromConfigured: true,
    });
  });
});
