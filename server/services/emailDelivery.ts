export interface TransactionalEmail {
  from: string;
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}

export interface EmailProviderResponse {
  data?: { id?: string } | null;
  error?: unknown;
}

export type EmailSender = (message: TransactionalEmail) => Promise<EmailProviderResponse>;

export type EmailDeliveryResult =
  | { status: "sent"; id?: string }
  | { status: "skipped"; reason: "provider_not_configured" | "recipient_not_configured" }
  | { status: "failed"; reason: string };

export type EmailProvider = "resend" | "smtp" | "none";

export interface EmailConfigurationStatus {
  provider: EmailProvider;
  configured: boolean;
  fromConfigured: boolean;
  notificationRecipientConfigured: boolean;
  publicAppUrlConfigured: boolean;
}

export function getConfiguredEmailProvider(
  env: Readonly<Record<string, string | undefined>> = process.env,
): Exclude<EmailProvider, "none"> | null {
  const requested = env.EMAIL_PROVIDER?.trim().toLowerCase();
  const smtpConfigured = Boolean(
    env.SMTP_USER?.trim() && env.SMTP_PASS?.replace(/\s+/g, "").trim(),
  );
  const resendConfigured = Boolean(env.RESEND_API_KEY?.trim());
  if (requested === "smtp" && smtpConfigured) return "smtp";
  if (requested === "resend" && resendConfigured) return "resend";
  if (!requested && smtpConfigured) return "smtp";
  if (!requested && resendConfigured) return "resend";
  return null;
}

export function getEmailConfigurationStatus(
  env: Readonly<Record<string, string | undefined>> = process.env,
): EmailConfigurationStatus {
  const provider = getConfiguredEmailProvider(env);
  return {
    provider: provider || "none",
    configured: provider !== null,
    fromConfigured: Boolean(
      env.NOTIFICATION_FROM_EMAIL?.trim() || (provider === "smtp" && env.SMTP_USER?.trim()),
    ),
    notificationRecipientConfigured: Boolean(env.PURCHASE_NOTIFICATION_EMAIL?.trim()),
    publicAppUrlConfigured: Boolean(env.PUBLIC_APP_URL?.trim()),
  };
}

function providerErrorReason(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message || "provider_rejected").slice(0, 240);
  }
  return "provider_rejected";
}

/**
 * Deliver an email without throwing into the business transaction that caused it.
 * The structured result keeps "not configured" separate from a provider failure,
 * which makes email behavior testable and observable without exposing credentials.
 */
export async function deliverEmail(
  sender: EmailSender | null,
  message: TransactionalEmail | null,
): Promise<EmailDeliveryResult> {
  if (!sender) return { status: "skipped", reason: "provider_not_configured" };
  if (!message || (Array.isArray(message.to) ? message.to.length === 0 : !message.to.trim())) {
    return { status: "skipped", reason: "recipient_not_configured" };
  }

  try {
    const response = await sender(message);
    if (response.error) return { status: "failed", reason: providerErrorReason(response.error) };
    return { status: "sent", id: response.data?.id };
  } catch (error) {
    return { status: "failed", reason: providerErrorReason(error) };
  }
}
