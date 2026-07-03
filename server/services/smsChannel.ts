/**
 * smsChannel - Twilio SMS/MMS fallback for users without smartphones
 *
 * Phase 3 deliverable: 1 billion+ users in Africa + South Asia without
 * internet access can still use BMO via SMS.
 *
 * Flow:
 *   1. User sends SMS or MMS with image to Twilio number
 *   2. Twilio webhook hits POST /api/sms/inbound
 *   3. If MMS: download image, run through pipeline, return classification
 *   4. If text-only: route through BMO chat (Groq)
 *   5. Reply via SMS/MMS with category + disposal instructions
 *
 * Endpoints exposed (in server routes):
 *   POST /api/sms/inbound     - Twilio webhook
 *   POST /api/sms/send        - Outbound SMS (admin/test)
 *   GET  /api/sms/status      - Twilio account status
 */

import Groq from "groq-sdk";

// Twilio is dynamically imported so the module is optional at runtime
type TwilioClient = any;

/**
 * smsChannel - Twilio SMS/MMS fallback for users without smartphones
 *
 * Phase 3 deliverable: 1 billion+ users in Africa + South Asia without
 * internet access can still use BMO via SMS.
 *
 * Flow:
 *   1. User sends SMS or MMS with image to Twilio number
 *   2. Twilio webhook hits POST /api/sms/inbound
 *   3. If MMS: download image, run through pipeline, return classification
 *   4. If text-only: route through BMO chat (Groq)
 *   5. Reply via SMS/MMS with category + disposal instructions
 *
 * Endpoints exposed (in server routes):
 *   POST /api/sms/inbound     - Twilio webhook
 *   POST /api/sms/send        - Outbound SMS (admin/test)
 *   GET  /api/sms/status      - Twilio account status
 */

let client: TwilioClient | null = null;
let configured = false;

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  messagingServiceSid?: string;
}

function getConfig(): TwilioConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || !fromNumber) return null;
  return {
    accountSid,
    authToken,
    fromNumber,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
  };
}

export function isTwilioConfigured(): boolean {
  return getConfig() !== null;
}

function ensureClient() {
  if (configured) return client;
  const cfg = getConfig();
  if (!cfg) return null;
  try {
    // Dynamic import keeps twilio optional — module not required if env vars missing
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const twilio = require("twilio");
    client = twilio(cfg.accountSid, cfg.authToken);
    configured = true;
  } catch (e) {
    console.warn("[smsChannel] twilio module not installed; SMS disabled. Run: npm install twilio");
    configured = false;
    return null;
  }
  return client;
}

export interface SMSMessage {
  to: string;
  body: string;
  mediaUrl?: string[];   // MMS attachments
}

export interface SMSSendResult {
  sid: string;
  status: string;
  to: string;
  body: string;
  cost: number; // USD
}

/**
 * Send an outbound SMS or MMS via Twilio.
 */
export async function sendSMS(msg: SMSMessage): Promise<SMSSendResult> {
  const cli = ensureClient();
  const cfg = getConfig();
  if (!cli || !cfg) {
    throw new Error("Twilio not configured (TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER)");
  }

  const result = await cli.messages.create({
    to: msg.to,
    body: msg.body.slice(0, 1600), // Twilio SMS limit
    from: cfg.fromNumber,
    mediaUrl: msg.mediaUrl,
    messagingServiceSid: cfg.messagingServiceSid,
  });

  // Rough cost: $0.0079/SMS (US), $0.02/MMS. International varies.
  const cost = msg.mediaUrl?.length ? 0.02 : 0.0079;

  return {
    sid: result.sid,
    status: result.status,
    to: result.to,
    body: msg.body,
    cost,
  };
}

/**
 * Process an inbound webhook from Twilio.
 * Parses multipart form data and extracts the message + media.
 */
export interface InboundSMS {
  from: string;
  body: string;
  mediaUrls: string[];
  messageSid: string;
  fromCountry?: string;
  fromCity?: string;
}

export function parseInboundWebhook(body: Record<string, any>): InboundSMS {
  return {
    from: String(body.From || ""),
    body: String(body.Body || "").trim(),
    mediaUrls: parseMediaUrls(body),
    messageSid: String(body.MessageSid || ""),
    fromCountry: body.FromCountry,
    fromCity: body.FromCity,
  };
}

function parseMediaUrls(body: Record<string, any>): string[] {
  const urls: string[] = [];
  for (let i = 0; i < 10; i++) {
    const url = body[`MediaUrl${i}`];
    if (typeof url === "string" && url.startsWith("https://")) {
      urls.push(url);
    }
  }
  return urls;
}

/**
 * Format the AI classification result into a ≤1600-char SMS reply.
 * Localized templates for the most common languages.
 */
const SMS_REPLY: Record<string, (cat: string, conf: number, hint: string) => string> = {
  vi: (cat, conf, hint) =>
    `🌍 BMO: Rác "${cat}" (${Math.round(conf * 100)}%).\n${hint}\nGửi ảnh khác để tiếp tục. Reply STOP để hủy.`,
  en: (cat, conf, hint) =>
    `🌍 BMO: Waste is "${cat}" (${Math.round(conf * 100)}%).\n${hint}\nSend another image to continue. Reply STOP to opt out.`,
  es: (cat, conf, hint) =>
    `🌍 BMO: Residuo "${cat}" (${Math.round(conf * 100)}%).\n${hint}\nEnvía otra imagen. Responde STOP para salir.`,
  fr: (cat, conf, hint) =>
    `🌍 BMO: Déchet "${cat}" (${Math.round(conf * 100)}%).\n${hint}\nEnvoyez une autre image. STOP pour arrêter.`,
  sw: (cat, conf, hint) =>
    `🌍 BMO: Taka ni "${cat}" (${Math.round(conf * 100)}%).\n${hint}\nTuma picha nyingine. Jibu STOP kuacha.`,
  ar: (cat, conf, hint) =>
    `🌍 BMO: النفايات "${cat}" (${Math.round(conf * 100)}%).\n${hint}\nأرسل صورة أخرى. رد STOP للإلغاء.`,
  hi: (cat, conf, hint) =>
    `🌍 BMO: कचरा "${cat}" (${Math.round(conf * 100)}%).\n${hint}\nदूसरी तस्वीर भेजें. STOP लिखकर बंद करें।`,
};

const DISPOSAL_HINTS: Record<string, Record<string, string>> = {
  vi: { plastic: "Rửa sạch, bỏ thùng nhựa tái chế.", paper: "Bỏ thùng giấy khô.", glass: "Bỏ thùng thủy tinh, cẩn thận vỡ.", metal: "Bỏ thùng kim loại.", organic: "Bỏ thùng hữu cơ / ủ compost.", hazard: "Mang đến điểm thu gom rác nguy hại." },
  en: { plastic: "Rinse, place in plastic recycling bin.", paper: "Place in dry paper bin.", glass: "Glass bin; handle carefully.", metal: "Place in metal recycling bin.", organic: "Compost bin or organic waste.", hazard: "Take to hazardous waste collection point." },
  es: { plastic: "Enjuagar, depositar en el contenedor de plástico.", paper: "Contenedor de papel.", glass: "Contenedor de vidrio.", metal: "Contenedor de metal.", organic: "Contenedor orgánico / compost.", hazard: "Llevar al punto de residuos peligrosos." },
  fr: { plastic: "Rincer, mettre dans le bac plastique.", paper: "Bac à papier.", glass: "Bac à verre.", metal: "Bac à métaux.", organic: "Bac à compost.", hazard: "Point de collecte des déchets dangereux." },
  sw: { plastic: "Osha, weka katika boksi la plastiki.", paper: "Boksi la karatasi.", glass: "Boksi la kioo.", metal: "Boksi la metali.", organic: "Boksi la mboji / komposti.", hazard: "Peleka kituo cha taka hatari." },
  ar: { plastic: "اشطفها، ضعها في سلة البلاستيك.", paper: "سلة الورق.", glass: "سلة الزجاج.", metal: "سلة المعادن.", organic: "سلة العضوي / السماد.", hazard: "اذهب إلى نقطة جمع النفايات الخطرة." },
  hi: { plastic: "धोकर प्लास्टिक रीसाइक्लिंग बिन में डालें।", paper: "कागज़ के डिब्बे में।", glass: "काँच के डिब्बे में।", metal: "धातु के डिब्बे में।", organic: "कम्पोस्ट बिन में।", hazard: "खतरनाक कचरा संग्रह केंद्र पर ले जाएँ।" },
};

export function formatSMSReply(
  category: string,
  confidence: number,
  locale: string = "vi"
): string {
  const tmpl = SMS_REPLY[locale] || SMS_REPLY.en;
  const hintMap = DISPOSAL_HINTS[locale] || DISPOSAL_HINTS.en;
  const hint = hintMap[category] || "Please dispose responsibly.";
  return tmpl(category, confidence, hint);
}

/**
 * USSD gateway stub for feature-phone integration.
 * Real implementation requires partnerships with local telcos (e.g., Africa's Talking).
 */
export interface USSDRequest {
  sessionId: string;
  phoneNumber: string;
  text: string;          // current input
  serviceCode: string;
}

export function handleUSSD(req: USSDRequest): string {
  // Simple menu: 1=classify, 2=tip, 3=language
  const input = req.text?.trim() || "";
  if (input === "") {
    return "CON Welcome to BMO\n1. Classify waste\n2. Get a tip\n3. Change language";
  }
  if (input === "1") return "CON Send a clear photo of the waste to this number.";
  if (input === "2") {
    return "END Tip: Rinse plastic before recycling. Reply 1 to classify, 2 for another tip.";
  }
  if (input === "3") {
    return "CON Choose language:\n1. English\n2. Tiếng Việt\n3. Kiswahili";
  }
  return "END Invalid option. Reply 1 to start over.";
}