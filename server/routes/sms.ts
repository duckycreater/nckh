/**
 * SMS Routes - Phase 3: Twilio webhook + outbound
 *
 *   POST /api/sms/inbound   - Twilio inbound webhook (no auth, Twilio sends)
 *   POST /api/sms/send      - Outbound (admin only)
 *   GET  /api/sms/status    - Feature status + Twilio config presence
 */

import { Router } from "express";
import {
  isTwilioConfigured,
  parseInboundWebhook,
  sendSMS,
  formatSMSReply,
  handleUSSD,
} from "../services/smsChannel.js";
import { resolveLocale } from "../services/localeRouter.js";
import { visionPipeline } from "../services/visionPipeline.js";
import { transcribeAudio } from "../services/voiceSTT.js";
import { getGroq, getGemini } from "../services/aiRouter.js";
import { validateToken } from "../auth.js";
import twilio from "twilio";

function requireAdmin(req: any, res: any, next: () => void) {
  const configuredKey = process.env.ADMIN_API_KEY?.trim();
  const suppliedKey =
    typeof req.headers["x-admin-key"] === "string" ? req.headers["x-admin-key"] : "";
  if (configuredKey && suppliedKey === configuredKey) return next();
  const result = validateToken(req.headers.authorization);
  if (!result) return res.status(401).json({ error: "Unauthorized" });
  if (!result.isAdmin) return res.status(403).json({ error: "Admin required" });
  req.userNick = result.nick;
  next();
}

function requireTwilioSignature(req: any, res: any, next: () => void) {
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!authToken) return res.status(503).json({ error: "Twilio webhook is not configured" });
  const signature =
    typeof req.headers["x-twilio-signature"] === "string" ? req.headers["x-twilio-signature"] : "";
  if (!signature) return res.status(403).json({ error: "Invalid Twilio signature" });

  const configuredBase = (process.env.PUBLIC_API_URL || process.env.PUBLIC_APP_URL || "")
    .trim()
    .replace(/\/$/, "");
  const requestUrl = configuredBase
    ? `${configuredBase}${req.originalUrl}`
    : `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  const params = req.body && typeof req.body === "object" ? req.body : {};
  if (!twilio.validateRequest(authToken, signature, requestUrl, params)) {
    return res.status(403).json({ error: "Invalid Twilio signature" });
  }
  next();
}

export function smsRouter(): Router {
  const router = Router();

  router.get("/status", (_req, res) => {
    res.json({ configured: isTwilioConfigured() });
  });

  // POST /api/sms/inbound - Twilio's signed webhook is the trust boundary.
  router.post("/inbound", requireTwilioSignature, async (req, res) => {
    try {
      const inbound = parseInboundWebhook(req.body || {});
      const country = (req.body?.FromCountry as string) || "VN";
      const localeCtx = resolveLocale({ country });

      let reply: string;
      if (inbound.mediaUrls.length > 0) {
        // MMS: download the image, classify, reply with category
        try {
          const r = await fetch(inbound.mediaUrls[0]);
          if (!r.ok) throw new Error(`media download failed: ${r.status}`);
          const buf = Buffer.from(await r.arrayBuffer());

          const ai = getGemini();
          if (!ai) {
            reply = "BMO service is busy. Please try again later.";
          } else {
            const response = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: "Classify this waste image in 1 word: plastic/paper/glass/metal/organic/hazard",
                    },
                    { inlineData: { data: buf.toString("base64"), mimeType: "image/jpeg" } },
                  ],
                },
              ],
            });
            const text = response?.text || "";
            const cat = visionPipeline.parseGeminiResponseToCategory(text);
            const conf = 0.85;
            reply = formatSMSReply(cat, conf, localeCtx.locale);
          }
        } catch (err) {
          reply = "BMO could not process the image. Please send a clearer photo.";
        }
      } else {
        // Plain SMS: route to BMO chat
        const groq = getGroq();
        if (!groq) {
          reply = "BMO is offline. Please try later.";
        } else {
          const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: `You are BMO, a friendly waste-sorting assistant. Reply in the user's language (${localeCtx.locale}). Keep under 320 chars.`,
              },
              { role: "user", content: inbound.body || "(empty message)" },
            ],
            max_tokens: 200,
            temperature: 0.6,
          });
          reply = (completion.choices[0]?.message?.content || "Sorry, I couldn't reply.").slice(
            0,
            320,
          );
        }
      }

      // TwiML XML response
      res.set("Content-Type", "text/xml");
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(reply)}</Message>
</Response>`);
    } catch (e) {
      console.error("[sms/inbound]", (e as Error).message);
      res.status(500).type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response><Message>Internal error. Please try again.</Message></Response>`);
    }
  });

  // POST /api/sms/send - admin-triggered outbound
  router.post("/send", requireAdmin, async (req, res) => {
    try {
      const { to, body, mediaUrl } = req.body || {};
      if (!to || !body) return res.status(400).json({ error: "to, body required" });
      const result = await sendSMS({ to, body, mediaUrl: mediaUrl ? [mediaUrl] : undefined });
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // POST /api/sms/ussd - USSD menu handler (Africa's Talking compatible)
  router.post("/ussd", async (req, res) => {
    try {
      const text = handleUSSD({
        sessionId: String(req.body?.sessionId || ""),
        phoneNumber: String(req.body?.phoneNumber || ""),
        text: String(req.body?.text || ""),
        serviceCode: String(req.body?.serviceCode || ""),
      });
      res.set("Content-Type", "text/plain");
      res.send(text);
    } catch (e) {
      res.status(500).send("END System error");
    }
  });

  return router;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
