/**
 * emailTemplates.ts — Locale-aware HTML + plain-text email renderer.
 *
 * Phase 3 of the i18n plan. All outbound transactional emails (welcome,
 * password reset, achievement, weekly summary) flow through this module
 * so subject + body come out in the recipient's preferred language.
 *
 * Template keys live under `email.<template>.{subject,body}` in
 * server/locales/<locale>.json. Add a new template:
 *   1. Define subject + body in all 10 server locale files.
 *   2. Add a case to `renderEmailTemplate()` below.
 *   3. Call `renderEmailTemplate("weekly_summary", locale, vars)` from the
 *      server route that sends the email.
 *
 * Body strings use `{placeholder}` for i18next-style interpolation. The
 * default English fallback is used for any missing translation.
 */
import { getErrorMessage } from "./errorMessages.ts";

export type EmailTemplateName =
  | "welcome"
  | "password_reset"
  | "achievement"
  | "weekly_summary";

interface EmailPayload {
  subject: string;
  html: string;
  text: string;
}

const FALLBACK_LOCALE = "en";

/**
 * Build a self-contained HTML email document. Minimal styling (no
 * external CSS) so it renders in any client. Layout works in both LTR and
 * RTL — uses `direction: auto` based on the locale.
 */
function buildHtml({
  subject,
  body,
  dir,
  accentColor = "#0f8f68",
}: {
  subject: string;
  body: string;
  dir: "ltr" | "rtl";
  accentColor?: string;
}): string {
  const safeBody = body
    .split(/\n\n+/)
    .map((p) => `<p style="margin:0 0 12px;line-height:1.55;">${escapeHtml(p)}</p>`)
    .join("");
  return `<!doctype html>
<html lang="${dir === "rtl" ? "ar" : "en"}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:24px;font-family:${dir === "rtl" ? "'Noto Sans Arabic',Tahoma,sans-serif" : "Roboto,Arial,sans-serif"};background:#f4f6f8;color:#0f1720;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid rgba(15,23,32,0.08);border-radius:14px;overflow:hidden;">
    <tr>
      <td style="padding:20px 28px;background:${accentColor};color:#ffffff;font-weight:700;font-size:18px;">
        BMO Robot
      </td>
    </tr>
    <tr>
      <td style="padding:24px 28px;">
        <h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;">${escapeHtml(subject)}</h1>
        ${safeBody}
      </td>
    </tr>
    <tr>
      <td style="padding:14px 28px;font-size:12px;color:#64748b;border-top:1px solid rgba(15,23,32,0.08);">
        BMO Robot — Phân loại rác thông minh
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildText(body: string): string {
  return body.replace(/\s+/g, " ").trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const RTL_LOCALES = new Set(["ar", "he", "fa", "ur", "yi"]);

function localeDir(locale: string): "ltr" | "rtl" {
  return RTL_LOCALES.has(locale.toLowerCase().split("-")[0]) ? "rtl" : "ltr";
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k) => {
    if (Object.prototype.hasOwnProperty.call(vars, k)) return String(vars[k]);
    return m;
  });
}

/**
 * Render an email template by name.
 *
 * @param name      Template key (welcome | password_reset | achievement | weekly_summary).
 * @param locale    Locale code from `req.locale?.locale`; falls back to English.
 * @param vars      Substitution values for `{name}`, `{code}`, etc.
 */
export function renderEmailTemplate(
  name: EmailTemplateName,
  locale: string | null | undefined,
  vars: Record<string, string | number> = {},
): EmailPayload {
  const safeLocale = (locale || FALLBACK_LOCALE).toLowerCase().split("-")[0];
  const subject = interpolate(getErrorMessage(`email.${name}.subject`, safeLocale), vars);
  const body = interpolate(getErrorMessage(`email.${name}.body`, safeLocale), vars);

  return {
    subject,
    html: buildHtml({ subject, body, dir: localeDir(safeLocale) }),
    text: buildText(body),
  };
}