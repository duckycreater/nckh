import "dotenv/config";
import express from "express";
import type { Server } from "node:http";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import { google } from "googleapis";
import { Resend } from "resend";
import nodemailer from "nodemailer";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { resolveGacha, generateServerCard } from "../server/lib/cards.js";
import { GoogleGenAI } from "@google/genai";
import {
  datasetCurator,
  DatasetCurator as DatasetCuratorClass,
} from "../server/services/datasetCurator";
import { uploadCardImage, uploadToDataset } from "../server/services/cloudinaryDataset";
import { getDb as getResearchDb } from "../server/db";
import { initDb, isDbConnected, getDb, setFirestore } from "../server/db.js";
import {
  listRewards,
  upsertReward,
  deleteRewardById,
  isRewardsDbConfigured,
  type RewardRecord,
} from "../server/rewardsDb.js";
import {
  decideScanReward,
  getScanRewardConfig,
  type ScanRewardDecision,
  type ScanRewardEntry,
} from "../server/services/scanRewards";
import {
  MaterialCardError,
  getMaterialScan,
  listMaterialScans,
  makeCardPreview,
  saveMaterialScan,
} from "../server/services/materialCards";
import {
  MATERIAL_SCAN_PROMPT,
  MATERIAL_SCAN_RESPONSE_SCHEMA,
  parseMaterialScanAnalysis,
} from "../server/services/materialScanAnalysis";
import {
  buildCors,
  buildHelmet,
  buildCsp,
  buildSecureCookies,
  buildAuthRateLimiter,
  buildScanRateLimiter,
  buildDefaultRateLimiter,
} from "../server/middleware/security";
import {
  listQuizQuestions,
  getNextQuestionId,
  createQuizQuestion,
  updateQuizQuestion,
  deleteQuizQuestion,
  reorderQuizQuestions,
  bulkImportQuestions,
  getQuizConfig,
  setQuizConfig,
  bulkSetQuizConfig,
  isQuizDbConfigured,
  type QuizQuestion,
} from "../server/quizDb.js";
import { runSchema } from "../server/schema.js";
import { researchRouter } from "../server/routes/research.js";
import { adminRouter } from "../server/routes/admin.js";
import { eventLogger } from "../server/services/eventLogger.js";
import { personalityEngine } from "../server/services/personalityEngine.js";
import { behavioralProfiler } from "../server/services/behavioralProfiler.js";
import { adaptiveRewardEngine } from "../server/services/adaptiveRewardEngine.js";
import { noveltyDecayDetector } from "../server/services/noveltyDecayDetector.js";
import { weeklyReflectionGenerator } from "../server/services/weeklyReflection.js";
import { eventGenerator } from "../server/services/eventGenerator.js";
import { simulationEngine } from "../server/services/simulationEngine.js";
import { visionPipeline } from "../server/services/visionPipeline.js";
import { experimentEngine } from "../server/services/experimentEngine.js";
import { socialNetworkAnalyzer } from "../server/services/socialNetworkAnalyzer.js";
import { longitudinalAnalytics } from "../server/services/longitudinalAnalytics.js";
import { datasetManager } from "../server/services/datasetManager.js";
import { visionRouter } from "../server/routes/vision.js";
import { datasetRouter } from "../server/routes/dataset.js";
import { familyRouter } from "../server/routes/family.js";
import { experimentsRouter } from "../server/routes/experiments.js";
import { socialRouter } from "../server/routes/social.js";
import { longitudinalRouter } from "../server/routes/longitudinal.js";
import { localeMiddleware } from "../server/services/localeRouter.js";
import { getErrorMessage, err } from "../server/services/errorMessages.js";
import {
  createSessionToken,
  validateToken,
  hashPassword,
  verifyPassword,
  isLikelyHash,
  disableUser,
  enableUser,
  isUserDisabled,
  revokeSessionToken,
  revokeUserSessions,
} from "../server/auth.js";
import { initSessionStore } from "../server/services/sessionStore.js";
import {
  acquireRewardLock,
  commitReward,
  reserveReward,
  rollbackReward,
  type RewardReservation,
} from "../server/services/rewardGuard.js";
import { getVietnamDayKey } from "../src/lib/dayKey.js";
import { getDailyChallengeIds, getDailyChallengeReward } from "../src/lib/dailyChallenges.js";
import { resolveGameplayRewardClaim } from "../src/lib/gameplayRewards.js";
import { parseRedeemInfo, type RedeemInfo } from "../src/lib/redemption.js";
import { normalizeCardOwnership } from "../src/lib/cardOwnership.js";
import {
  applyProfileVerificationDecision,
  canProfileEarnPoints,
  isGradeEightClass,
  normalizeStudentName,
  type ProfileVerificationStatus,
} from "../shared/profileStandardization.js";
import {
  isProfileVerificationStoreConfigured,
  readProfileVerification,
  syncProfileVerification,
  syncResearchProfile,
  syncSchoolClasses,
} from "../server/services/profileStandardization.js";
import { SHARD_CARD_REWARDS, SHARD_ITEM_COSTS, SHARD_XP_REWARDS } from "../src/lib/shardShop.js";
import {
  deliverEmail,
  getConfiguredEmailProvider,
  getEmailConfigurationStatus,
  type EmailSender,
} from "../server/services/emailDelivery.js";
import {
  enqueueEmail,
  getEmailOutboxSummary,
  recordEmailDeliveryEvent,
  startEmailOutboxWorker,
} from "../server/services/emailOutbox.js";
import {
  buildQuizEditionId,
  buildQuizSessionId,
  gradeQuizSession,
  type QuizSessionQuestion,
} from "../server/services/quizSession.js";
import { defaultSchoolClasses, isValidSchoolClass, type SchoolClass } from "../shared/school.js";
import {
  createRedemption,
  listRedemptions,
  updateRedemptionStatus,
  RedemptionError,
  type RedemptionStatus,
} from "../server/services/redemptions.js";
import {
  RobotEventRequestSchema,
  RobotIdentityRequestSchema,
  identityTokenHash,
  robotPayloadHash,
  robotScore,
  verifyRobotRequest,
} from "../server/services/robotProtocol.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    // Limit file size to 10MB to prevent memory exhaustion attacks
    // Individual routes can add more specific validation if needed
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const NICKNAME_PATTERN = /^[a-zA-Z0-9_]{4,100}$/;

function isValidNickname(value: unknown): value is string {
  return typeof value === "string" && NICKNAME_PATTERN.test(value.trim());
}

function runInBackground(label: string, task: () => Promise<void>): void {
  setImmediate(() => {
    void task().catch((error) => console.warn(`[${label}]`, error));
  });
}

function getRouteParam(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? "");
  return typeof value === "string" ? value : "";
}

function parseCardId(value: unknown): number | null {
  const cardId = Number(value);
  return Number.isInteger(cardId) && cardId >= 1 && cardId <= 420 ? cardId : null;
}

// Trust proxy for correct IP detection behind reverse proxies (nginx, load balancers)
// This is critical for rate limiting to work correctly
app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);

// ─── Locale middleware (Phase 5 of i18n plan) ──────────────────────────────
// Resolves the requester's preferred locale from explicit header, then
// Accept-Language, then GeoIP. Attaches `req.locale` for downstream routes
// (error messages, email templates, audit logging).
app.use(localeMiddleware);

// ─── Session token management (shared via ./server/auth.ts) ───────────────────

// ─── Auth Middleware ─────────────────────────────────────────────────────────
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const result = validateToken(req.headers.authorization);
  if (!result)
    return res
      .status(401)
      .json({ error: getErrorMessage("error.unauthorized", (req as any).locale?.locale) });
  (req as any).userNick = result.nick;
  (req as any).isAdmin = result.isAdmin;
  (req as any).userId = result.accountId ?? result.nick;
  next();
}

function canAccessUserScope(req: express.Request, requestedId: string): boolean {
  if ((req as any).isAdmin) return true;
  const normalized = requestedId.trim().toLowerCase();
  const authNick = String((req as any).userNick || "")
    .trim()
    .toLowerCase();
  const authUserId = String((req as any).userId || "")
    .trim()
    .toLowerCase();
  return normalized.length > 0 && (normalized === authNick || normalized === authUserId);
}

async function requireCompleteProfile(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  if ((req as any).isAdmin) return next();
  const nick = String((req as any).userNick || "");
  const user = await getUser(nick);
  if (!user) return res.status(404).json({ error: "Không tìm thấy tài khoản." });
  if (!user.fullName?.trim() || !user.classId) {
    return res.status(428).json({
      error: "Hoàn tất họ tên và lớp trước khi ghi nhận tiến trình mới.",
      code: "profile_incomplete",
    });
  }
  next();
}

// ─── Admin Auth Middleware ───────────────────────────────────────────────────
async function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const apiKey = req.headers["x-admin-key"] as string | undefined;
  const apiKeyHeader = process.env.ADMIN_API_KEY;

  if (apiKeyHeader && apiKey && apiKey === apiKeyHeader) {
    return next();
  }

  const result = validateToken(req.headers.authorization);
  if (!result) return res.status(401).json({ error: "Unauthorized" });
  (req as any).userNick = result.nick;
  (req as any).isAdmin = result.isAdmin;
  (req as any).userId = result.accountId ?? result.nick;
  try {
    const user = await getUser(result.nick);
    if (!user || user.role !== "admin") {
      return err(res, 403, "error.forbidden", req as any);
    }
  } catch (e) {
    console.warn("[Admin] Access denied:", e);
    return err(res, 403, "error.forbidden", req as any);
  }
  next();
}

// ─── Admin Stats Helper ─────────────────────────────────────────────────────
interface AdminStats {
  total: number;
  admins: number;
  activeUsers: number;
  researchActive7d?: number;
  researchActive1d?: number;
  experimentCount?: number;
}

async function getAdminStats(): Promise<AdminStats> {
  const allUsers = await getAllUsers();
  const total = allUsers.length;
  const admins = allUsers.filter((u) => u.role === "admin").length;
  const activeUsers = allUsers.filter((u) => {
    if (!u.progress?.lastUpdateDate) return false;
    const last = new Date(u.progress.lastUpdateDate);
    const diff = Date.now() - last.getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  }).length;
  return {
    total,
    admins,
    activeUsers,
    researchActive7d: undefined,
    researchActive1d: undefined,
    experimentCount: undefined,
  };
}

// Security middleware — installed before any routes so even error handlers
// benefit from the headers. See server/middleware/security.ts for tunables.
app.use(buildHelmet());
app.use(buildCors());
app.use(buildCsp());
app.use(buildSecureCookies());

// Auth-only endpoints get the tightest limit. Wire BEFORE the default
// limiter so the default doesn't claim the request first.
// Auth endpoints are mounted at /api/login and /api/register.  Keep the
// legacy /api/auth and /auth prefixes as aliases for older clients, but do
// not rely on them for brute-force protection.
app.use(
  [
    "/api/login",
    "/api/register",
    "/api/change-password",
    "/api/forgot-password",
    "/api/reset-password",
    "/api/auth",
    "/auth",
  ],
  buildAuthRateLimiter(),
);

// Body parsing — placed AFTER the CORS preflight handlers so OPTIONS
// short-circuits don't try to parse a body.
// A 10 MB image becomes roughly 13.4 MB when base64 encoded.  The bounded
// parser leaves headroom for JSON metadata without allowing an untrusted
// client to allocate tens of megabytes per request.
app.use(
  express.json({
    limit: process.env.JSON_BODY_LIMIT || "16mb",
    verify: (request, _response, buffer) => {
      const path = (request as express.Request).originalUrl || request.url || "";
      if (path.startsWith("/api/webhooks/resend")) {
        (request as express.Request & { rawBody?: string }).rawBody = buffer.toString("utf8");
      }
    },
  }),
);
// Provider webhooks (Twilio/Africa's Talking) post form-encoded payloads.
// Keep their parser limit much smaller than the image JSON limit above.
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

// Write-heavy endpoints get the scan limiter, mounted before their route
// declaration. Each route file is responsible for re-mounting if it needs a
// tighter limit (e.g., /api/federated/submit uses 30/min).
app.use("/api/scan-garbage", buildScanRateLimiter());

// The catalog/gacha combat system is retired. Keeping these paths alive would
// allow old clients to spend points in a collection that the new UI cannot use.
app.use(
  /^\/api\/(?:cards\/(?:gacha-pull|fuse|levelup|levels\/[^/]+)|shards\/purchase|pvp\/(?:match|result|history))$/,
  requireAuth,
  (_req, res) =>
    res.status(410).json({
      error: "Tính năng thẻ cũ đã ngừng hoạt động. Hãy tạo thẻ vật liệu từ lần quét mới.",
      code: "legacy_card_system_retired",
    }),
);

// Rate-limit API traffic only. Applying this middleware at the app root also
// counts every JS chunk, font and icon loaded by the SPA. A fresh dashboard can
// exceed the burst budget before its first data request and receive false 429s.
app.use("/api", buildDefaultRateLimiter());

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const smtpUser = process.env.SMTP_USER?.trim();
// Gmail App Passwords are commonly displayed in four-character groups; remove
// formatting whitespace before handing the credential to Nodemailer.
const smtpPass = process.env.SMTP_PASS?.replace(/\s+/g, "");
const smtpTransport =
  smtpUser && smtpPass
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST?.trim() || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT || 465),
        secure: (process.env.SMTP_SECURE || "true").toLowerCase() !== "false",
        auth: { user: smtpUser, pass: smtpPass },
      })
    : null;
const emailProvider = getConfiguredEmailProvider(process.env);
const notificationEmail = process.env.PURCHASE_NOTIFICATION_EMAIL?.trim();
const notificationFrom =
  process.env.NOTIFICATION_FROM_EMAIL?.trim() ||
  (emailProvider === "smtp" && smtpUser ? smtpUser : "EcoQuest <onboarding@resend.dev>");
const emailSender: EmailSender | null =
  emailProvider === "smtp" && smtpTransport
    ? async (message) => {
        const sent = await smtpTransport.sendMail({
          from: message.from,
          to: message.to,
          subject: message.subject,
          text: message.text,
          html: message.html,
        });
        return { data: { id: sent.messageId }, error: null };
      }
    : emailProvider === "resend" && resend
      ? async (message) => resend.emails.send(message)
      : null;

app.post("/api/webhooks/resend", async (req, res) => {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!resend || !webhookSecret) {
    return res.status(503).json({ error: "Webhook email chưa được cấu hình." });
  }
  const rawBody = (req as express.Request & { rawBody?: string }).rawBody;
  const id = req.header("svix-id") || "";
  const timestamp = req.header("svix-timestamp") || "";
  const signature = req.header("svix-signature") || "";
  if (!rawBody || !id || !timestamp || !signature) {
    return res.status(400).json({ error: "Webhook không hợp lệ." });
  }
  try {
    const event = resend.webhooks.verify({
      payload: rawBody,
      headers: { id, timestamp, signature },
      webhookSecret,
    });
    if (event.type === "email.delivered") {
      await recordEmailDeliveryEvent(event.data.email_id, "delivered");
    } else if (event.type === "email.bounced" || event.type === "email.failed") {
      await recordEmailDeliveryEvent(event.data.email_id, "bounced");
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    console.warn("[resend-webhook] rejected:", (error as Error).message);
    return res.status(400).json({ error: "Chữ ký webhook không hợp lệ." });
  }
});

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function emailSubjectText(value: unknown): string {
  return String(value ?? "")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, 150);
}

interface PasswordResetRecord {
  nick: string;
  nonce: string;
  expiresAt: number;
}

const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
const passwordResetTokens = new Map<string, PasswordResetRecord>();

async function sendPurchaseEmail(user: any, itemId: string) {
  try {
    const itemNameMap: Record<string, string> = {
      av1: "Avatar Mầm Xanh 🌱",
      av2: "Avatar Chiến Binh Nước 💧",
      av3: "Avatar Thủ Lĩnh Rừng 🦁",
      fr1: "Khung Gỗ",
      fr2: "Khung Băng",
      fr3: "Hào Quang Đất",
    };
    const itemName = itemNameMap[String(itemId)] || `Vật phẩm ID ${itemId}`;
    const safeUserName = escapeHtml(user.name);
    const safeAccountId = escapeHtml(user.account_id);
    const safeItemName = escapeHtml(itemName);

    const textBody = `Người chơi: ${user.name} (Tài khoản: ${user.account_id})\nĐã mua: ${itemName}\nSố điểm (Lõi Năng Lượng) hiện tại: ${user.points}`;
    const htmlBody = `
       <div style="font-family: sans-serif;">
           <h2 style="color: #7c3aed;">Yêu cầu mua vật phẩm mới!</h2>
           <p><strong>Người chơi:</strong> ${safeUserName} (Tài khoản: ${safeAccountId})</p>
           <p><strong>Vật phẩm:</strong> <span style="color: #7c3aed; font-weight: bold;">${safeItemName}</span></p>
           <p><strong>Số điểm còn lại:</strong> <span style="color: #10b981;">${user.points} Lõi Năng Lượng</span></p>
       </div>
    `;

    const delivery = await enqueueEmail(
      emailSender,
      "purchase_notification",
      notificationEmail
        ? {
            from: notificationFrom,
            to: notificationEmail,
            subject: emailSubjectText(`EcoQuest: ${user.name} vừa mua ${itemName}!`),
            text: textBody,
            html: htmlBody,
          }
        : null,
    );
    if (delivery.status === "accepted") {
      console.info(
        `[Email] Purchase notification accepted, ID: ${delivery.providerMessageId || "unknown"}`,
      );
    } else if (delivery.status === "queued") {
      console.warn(`[Email] Purchase notification queued for retry: ${delivery.reason}`);
    } else if (delivery.status === "skipped") {
      console.warn(`[Email] Purchase notification skipped: ${delivery.reason}`);
    }
    return delivery;
  } catch (e) {
    console.error("[Email] Failed to send purchase notification:", e);
    return { status: "failed" as const, reason: "template_render_failed" };
  }
}

async function sendCraftEmail(
  user: any,
  craftedItemId: string,
  itemName: string,
  redeemInfo: RedeemInfo,
) {
  try {
    let textBody = `Người chơi: ${user.name} (Tài khoản: ${user.account_id})\nĐã đổi quà tặng: ${itemName} (Mã Quà: ${craftedItemId})\nSố điểm (Lõi Năng Lượng) hiện tại: ${user.points}`;
    const safeUserName = escapeHtml(user.name);
    const safeAccountId = escapeHtml(user.account_id);
    const safeItemName = escapeHtml(itemName);
    const safeItemId = escapeHtml(craftedItemId);
    const safeFullName = escapeHtml(redeemInfo.fullName);
    const safeAddress = escapeHtml(redeemInfo.address);
    let htmlBody = `
        <div style="font-family: sans-serif; p { margin: 5px 0 }">
            <h2 style="color: #059669">Yêu cầu đổi quà mới!</h2>
            <p><strong>Người chơi:</strong> ${safeUserName} (Tài khoản: ${safeAccountId})</p>
            <p><strong>Quà tặng:</strong> <span style="color: #ea580c; font-weight: bold;">${safeItemName}</span> (Mã Quà: ${safeItemId})</p>
            <p><strong>Số điểm còn lại:</strong> <span style="color: #10b981;">${user.points} Lõi Năng Lượng</span></p>
     `;

    textBody += `\n\n--- Thông tin người nhận ---\nHọ và tên: ${redeemInfo.fullName}\nĐịa chỉ nhận quà: ${redeemInfo.address}`;
    htmlBody += `
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0"/>
          <h3 style="color: #4b5563">Thông tin người nhận</h3>
          <p><strong>Họ và tên:</strong> ${safeFullName}</p>
          <p><strong>Địa chỉ nhận quà:</strong> ${safeAddress}</p>
       `;
    htmlBody += "</div>";

    const delivery = await enqueueEmail(
      emailSender,
      "redemption_notification",
      notificationEmail
        ? {
            from: notificationFrom,
            to: notificationEmail,
            subject: emailSubjectText(`EcoQuest: ${user.name} vừa đổi quà ${itemName}!`),
            text: textBody,
            html: htmlBody,
          }
        : null,
    );
    if (delivery.status === "accepted") {
      console.info(
        `[Email] Redemption notification accepted, ID: ${delivery.providerMessageId || "unknown"}`,
      );
    } else if (delivery.status === "queued") {
      console.warn(`[Email] Redemption notification queued for retry: ${delivery.reason}`);
    } else if (delivery.status === "skipped") {
      console.warn(`[Email] Redemption notification skipped: ${delivery.reason}`);
    }
    return delivery;
  } catch (e) {
    console.error("[Email] Failed to send notification:", e);
    return { status: "failed" as const, reason: "template_render_failed" };
  }
}

// In-memory Database (Fallback)
const configuredDataFile = process.env.BMO_DATA_FILE?.trim();
const DB_FILE = configuredDataFile
  ? path.resolve(configuredDataFile)
  : path.join(process.cwd(), "data.json");
let users: User[] = [];

// Initialize Firebase Admin if available
let db: Firestore | null = null;
const secretRaw =
  process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || process.env.FIREBASE_SERVICE_ACCOUNT;

if (secretRaw) {
  try {
    const isBase64 = !secretRaw.trim().startsWith("{");
    const serviceAccountStr = isBase64
      ? Buffer.from(secretRaw, "base64").toString("utf8")
      : secretRaw;
    const serviceAccount = JSON.parse(serviceAccountStr);
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    initializeApp({
      credential: cert(serviceAccount),
    });
    // In node we can get the default db, or pass databaseId if needed.
    // Assuming standard default or pulling from config if necessary.
    const cfgPath = path.join(process.cwd(), "firebase-applet-config.json");
    let dbId = "(default)";
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
      dbId = cfg.firestoreDatabaseId || "(default)";
      if (dbId !== "(default)" && !serviceAccount.project_id) {
        // Fallback if keys don't include project_id
        serviceAccount.project_id = cfg.projectId;
      }
    }

    if (dbId === "(default)") {
      db = getFirestore();
      setFirestore(db);
    } else {
      const customApp = initializeApp(
        {
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id,
        },
        "custom",
      );
      db = getFirestore(customApp, dbId);
      setFirestore(db);
    }
    console.log("Firebase Admin Initialized successfully!");

    // Local data is never a production migration source. Historical builds
    // pushed every test fixture in data.json into Firestore during boot,
    // which polluted accounts and could overwrite credentials on redeploy.
    // Development migrations now require an explicit opt-in.
    const localUserSyncEnabled =
      process.env.NODE_ENV !== "production" && process.env.SYNC_LOCAL_USERS_TO_FIREBASE === "true";
    if (localUserSyncEnabled && fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
      if (data.users && data.users.length > 0) {
        console.log(`Syncing ${data.users.length} users to Firebase...`);
        // Batch sync in chunks of 50 with delays to avoid Firestore quota exhaustion
        (async () => {
          const BATCH = 50;
          const DELAY_MS = 200;
          for (let i = 0; i < data.users.length; i += BATCH) {
            const batch = data.users.slice(i, i + BATCH);
            const promises = batch.map(async (u: { nick: string; name: string; pass: string }) => {
              try {
                const docRef = db!.collection("users").doc(u.nick.toLowerCase());
                const doc = await docRef.get();
                if (doc.exists) {
                  await docRef.update({ name: u.name, pass: u.pass });
                } else {
                  await docRef.set(u);
                }
              } catch (e) {
                console.warn(`[firebase-sync] Failed to sync ${u.nick}:`, (e as Error).message);
              }
            });
            await Promise.all(promises);
            if (i + BATCH < data.users.length) {
              await new Promise((r) => setTimeout(r, DELAY_MS));
            }
          }
          console.log("Sync complete.");
        })();
      }
    }
  } catch (e) {
    console.error("Failed to initialize Firebase Admin", e);
  }
}

interface UserProgress {
  flashcardsRead: number[];
  flashcardCounts: Record<string, number>;
  flashcardNames?: Record<number, string>;
  cardLevels?: Record<string, number>;
  gachaPullCount?: number;
  checkins: number[];
  traded: (string | number)[];
  crafted: (string | number)[];
  purchased: (string | number)[];
  challengesCompleted: number[];
  guildDonated: boolean;
  streakDays?: number;
  lastUpdateDate: string;
  shards?: number;
}

interface User {
  name: string;
  nick: string;
  pass: string;
  email?: string;
  fullName?: string;
  classGrade?: string;
  classId?: string;
  profileVerificationStatus?: ProfileVerificationStatus;
  profileUpdatedAt?: number;
  profileVerifiedAt?: number;
  profileVerifiedBy?: string;
  profileRejectionReason?: string;
  points: number;
  /** Lifetime progression currency. Spending points must never reduce this. */
  totalExpEarned?: number;
  /** Monotonic guard against stale profile/progress writes overwriting points. */
  pointsVersion?: number;
  hasPlayed: boolean;
  account_id: string;
  role?: string;
  roleBeforeSuspension?: "user" | "admin";
  disabled?: boolean;
  progress?: UserProgress;
  selectedAvatar?: string;
  selectedFrame?: string;
  customAvatarUrl?: string;
  shards?: number;
  locale?: string;
  preferences?: Record<string, unknown>;
  lastWheelClaimDate?: string;
  claimedStreakGifts?: number[];
  gameplayRewardDates?: Record<string, string>;
  scanRewardHistory?: ScanRewardEntry[];
  redemptionRequests?: RedemptionRequest[];
  passwordResetNonce?: string;
  robotPinHash?: string;
  robotPinUpdatedAt?: number;
}

function normalizeProgressCards(progress: UserProgress): boolean {
  const ownership = normalizeCardOwnership(progress.flashcardsRead, progress.flashcardCounts);
  progress.flashcardsRead = ownership.ids;
  progress.flashcardCounts = ownership.counts;
  progress.checkins = Array.isArray(progress.checkins) ? progress.checkins : [];
  progress.traded = Array.isArray(progress.traded) ? progress.traded : [];
  progress.crafted = Array.isArray(progress.crafted) ? progress.crafted : [];
  progress.purchased = Array.isArray(progress.purchased) ? progress.purchased : [];
  progress.challengesCompleted = Array.isArray(progress.challengesCompleted)
    ? progress.challengesCompleted
    : [];
  progress.guildDonated = progress.guildDonated === true;
  progress.lastUpdateDate =
    typeof progress.lastUpdateDate === "string" && progress.lastUpdateDate.trim()
      ? progress.lastUpdateDate
      : getVietnamDayKey();
  progress.shards = Math.max(0, Math.trunc(Number(progress.shards) || 0));
  progress.gachaPullCount = Math.max(0, Math.trunc(Number(progress.gachaPullCount) || 0));
  if (progress.cardLevels && typeof progress.cardLevels === "object") {
    progress.cardLevels = Object.fromEntries(
      Object.entries(progress.cardLevels)
        .map(([id, level]) => [String(Math.trunc(Number(id))), Math.trunc(Number(level))] as const)
        .filter(([id, level]) => Number(id) >= 1 && Number(id) <= 420 && level >= 1 && level <= 20),
    );
  } else {
    progress.cardLevels = {};
  }
  if (ownership.debugUnlockRemoved) progress.cardLevels = {};
  return ownership.debugUnlockRemoved;
}

function normalizeUserEconomy(user: User): User {
  const points = Math.max(0, Math.trunc(Number(user.points) || 0));
  const storedLifetime = Math.max(0, Math.trunc(Number(user.totalExpEarned) || 0));
  user.points = points;
  // Existing accounts predate this field. Their current balance is the safest
  // non-destructive migration floor; future spends no longer lower progression.
  user.totalExpEarned = Math.max(points, storedLifetime);
  if (user.progress) normalizeProgressCards(user.progress);
  return user;
}

function applyPointDelta(user: User, rawDelta: number): void {
  normalizeUserEconomy(user);
  const delta = Math.trunc(Number(rawDelta) || 0);
  user.points = Math.max(0, user.points + delta);
  if (delta > 0) user.totalExpEarned = (user.totalExpEarned || 0) + delta;
}

function pointEligibility(user: User): {
  canEarnPoints: boolean;
  reason: "profile_verification_required" | null;
} {
  const canEarnPoints = canProfileEarnPoints(user);
  return {
    canEarnPoints,
    reason: canEarnPoints ? null : "profile_verification_required",
  };
}

function applyEarnedPoints(user: User, rawDelta: number): number {
  const delta = Math.max(0, Math.trunc(Number(rawDelta) || 0));
  if (delta === 0 || !pointEligibility(user).canEarnPoints) return 0;
  applyPointDelta(user, delta);
  return delta;
}

function publicProfileStatus(user: User) {
  const eligibility = pointEligibility(user);
  return {
    profile_verification_status: user.profileVerificationStatus || "unverified",
    profileVerificationStatus: user.profileVerificationStatus || "unverified",
    can_earn_points: eligibility.canEarnPoints,
    canEarnPoints: eligibility.canEarnPoints,
    point_eligibility_reason: eligibility.reason,
    pointEligibilityReason: eligibility.reason,
  };
}

async function syncUserResearchProfile(user: User): Promise<void> {
  await syncResearchProfile({
    accountId: user.account_id,
    nickname: user.nick,
    displayName: user.name,
    fullName: user.fullName,
    classId: user.classId,
    classGrade: user.classGrade,
    role: user.role,
    points: user.points,
    totalExpEarned: user.totalExpEarned,
    profileVerificationStatus: user.profileVerificationStatus,
    profileUpdatedAt: user.profileUpdatedAt,
    profileVerifiedAt: user.profileVerifiedAt,
  });
}

async function commitPointMutation(input: {
  nickname: string;
  delta?: number;
  targetBalance?: number;
  source: string;
  reason: string;
  idempotencyKey: string;
}): Promise<{
  oldPoints: number;
  newPoints: number;
  appliedDelta: number;
  totalExpEarned: number;
}> {
  const nickname = input.nickname.trim().toLowerCase();
  const safeKey = input.idempotencyKey.trim().slice(0, 160);
  const transactionId = crypto
    .createHash("sha256")
    .update(nickname + ":" + safeKey)
    .digest("hex")
    .slice(0, 40);
  if (db) {
    const userRef = db.collection("users").doc(nickname);
    const transactionRef = db.collection("point_transactions").doc(transactionId);
    return db.runTransaction(async (transaction) => {
      const [existing, userSnapshot] = await Promise.all([
        transaction.get(transactionRef),
        transaction.get(userRef),
      ]);
      if (!userSnapshot.exists) throw new Error("USER_NOT_FOUND");
      if (existing.exists) {
        const record = existing.data() as {
          balanceBefore: number;
          balanceAfter: number;
          amount: number;
          totalExpEarned: number;
        };
        return {
          oldPoints: record.balanceBefore,
          newPoints: record.balanceAfter,
          appliedDelta: record.amount,
          totalExpEarned: record.totalExpEarned,
        };
      }
      const user = normalizeUserEconomy(userSnapshot.data() as User);
      const oldPoints = user.points;
      const requestedDelta =
        input.targetBalance === undefined
          ? Math.trunc(Number(input.delta) || 0)
          : Math.max(0, Math.trunc(Number(input.targetBalance) || 0)) - oldPoints;
      const newPoints = Math.max(0, oldPoints + requestedDelta);
      const appliedDelta = newPoints - oldPoints;
      const totalExpEarned = (user.totalExpEarned || 0) + (appliedDelta > 0 ? appliedDelta : 0);
      const pointsVersion = Math.max(0, Math.trunc(Number(user.pointsVersion) || 0)) + 1;
      transaction.update(userRef, { points: newPoints, totalExpEarned, pointsVersion });
      transaction.create(transactionRef, {
        id: transactionId,
        accountId: user.account_id,
        nickname,
        type: appliedDelta >= 0 ? "earn" : "spend",
        source: input.source,
        reason: input.reason,
        amount: appliedDelta,
        balanceBefore: oldPoints,
        balanceAfter: newPoints,
        totalExpEarned,
        idempotencyKey: safeKey,
        createdAt: Date.now(),
      });
      return { oldPoints, newPoints, appliedDelta, totalExpEarned };
    });
  }

  const release = await acquireRewardLock(nickname);
  try {
    const user = await getUser(nickname);
    if (!user) throw new Error("USER_NOT_FOUND");
    const oldPoints = user.points;
    const requestedDelta =
      input.targetBalance === undefined
        ? Math.trunc(Number(input.delta) || 0)
        : Math.max(0, Math.trunc(Number(input.targetBalance) || 0)) - oldPoints;
    applyPointDelta(user, requestedDelta);
    await saveUser(user);
    await logRewardTransaction(user.account_id, "adjustment", user.points - oldPoints, {
      reason: input.reason,
      source: input.source,
      pointsBalance: user.points,
    });
    return {
      oldPoints,
      newPoints: user.points,
      appliedDelta: user.points - oldPoints,
      totalExpEarned: user.totalExpEarned || 0,
    };
  } finally {
    release();
  }
}

interface RedemptionRequest {
  id: string;
  itemId: string;
  itemName: string;
  cost: number;
  recipient: RedeemInfo;
  status: "pending";
  createdAt: string;
}

interface GameProgress {
  flashcardsRead: number[];
  flashcardCounts: Record<string, number>;
  flashcardNames?: Record<number, string>;
  cardLevels?: Record<string, number>;
  gachaPullCount?: number;
  checkins: number[];
  traded: (string | number)[];
  crafted: (string | number)[];
  purchased: (string | number)[];
  challengesCompleted: number[];
  guildDonated: boolean;
  streakDays?: number;
  lastUpdateDate: string;
  shards?: number;
}

async function getGameProgress(nick: string): Promise<GameProgress | null> {
  const normalizedNick = nick.toLowerCase();
  if (!db) {
    const localUser = users.find((user) => user.nick.toLowerCase() === normalizedNick);
    if (!localUser?.progress) return null;
    normalizeProgressCards(localUser.progress);
    return localUser.progress;
  }
  const docRef = db.collection("user_progress").doc(normalizedNick);
  const doc = await docRef.get();
  let progress: GameProgress;
  let migratedFromEmbeddedProgress = false;

  if (doc.exists) {
    progress = doc.data() as GameProgress;
  } else {
    // Older accounts stored gameplay state inside users/{nick}. Migrate it on
    // first read so opening gacha cannot accidentally start a blank collection.
    const userRef = db.collection("users").doc(normalizedNick);
    const userDoc = await userRef.get();
    const legacyProgress = userDoc.exists ? (userDoc.data() as User).progress : undefined;
    if (!legacyProgress) return null;
    progress = legacyProgress;
    migratedFromEmbeddedProgress = true;
  }

  const removedDebugUnlock = normalizeProgressCards(progress);
  if (migratedFromEmbeddedProgress || removedDebugUnlock) {
    const batch = db.batch();
    batch.set(docRef, progress, { merge: true });
    if (migratedFromEmbeddedProgress && removedDebugUnlock) {
      batch.set(db.collection("users").doc(normalizedNick), { progress }, { merge: true });
    }
    await batch.commit();
  }
  if (migratedFromEmbeddedProgress) {
    console.info(`[card-progress] Migrated embedded progress for ${nick}`);
  }
  if (removedDebugUnlock) {
    console.warn(`[card-progress] Removed development full-unlock state for ${nick}`);
  }
  return progress;
}

interface Question {
  id: number;
  content: string;
  options: { key: string; text: string }[];
  correctKey: string;
  points: number;
}

const defaultQuestions: Question[] = [
  {
    id: 1,
    content: "Đâu là loại rác hữu cơ?",
    options: [
      { key: "A", text: "Vỏ chuối" },
      { key: "B", text: "Túi nilon" },
      { key: "C", text: "Pin" },
      { key: "D", text: "Chai nhựa" },
    ],
    correctKey: "A",
    points: 10,
  },
  {
    id: 2,
    content: "Pin đã qua sử dụng nên vứt ở đâu?",
    options: [
      { key: "A", text: "Thùng rác hữu cơ" },
      { key: "B", text: "Thùng rác vô cơ" },
      { key: "C", text: "Thùng thu gom pin riêng biệt" },
      { key: "D", text: "Sông ngòi" },
    ],
    correctKey: "C",
    points: 10,
  },
  {
    id: 3,
    content: "Tại sao nên hạn chế sử dụng túi nilon?",
    options: [
      { key: "A", text: "Vì nó đẹp" },
      { key: "B", text: "Vì khó phân hủy, gây ô nhiễm" },
      { key: "C", text: "Vì nó đắt" },
      { key: "D", text: "Vì nó nhẹ" },
    ],
    correctKey: "B",
    points: 10,
  },
  {
    id: 4,
    content: "Hành động nào sau đây giúp bảo vệ môi trường?",
    options: [
      { key: "A", text: "Xả rác bừa bãi" },
      { key: "B", text: "Bật điện 24/24" },
      { key: "C", text: "Tái chế rác thải" },
      { key: "D", text: "Chặt cây phá rừng" },
    ],
    correctKey: "C",
    points: 10,
  },
  {
    id: 5,
    content: "Đâu là năng lượng tái tạo?",
    options: [
      { key: "A", text: "Than đá" },
      { key: "B", text: "Dầu mỏ" },
      { key: "C", text: "Khí tự nhiên" },
      { key: "D", text: "Năng lượng mặt trời" },
    ],
    correctKey: "D",
    points: 10,
  },
];

let dynamicQuestions: Question[] = [...defaultQuestions];
let dynamicConfig: any = {
  ThoiGianBatDau: null,
  ThoiGianKetThuc: null,
};

interface StoredQuizSession {
  id: string;
  editionId: string;
  accountId: string;
  nickname: string;
  questions: QuizSessionQuestion[];
  createdAt: number;
  expiresAt: number;
  submittedAt: number | null;
  result: ReturnType<typeof gradeQuizSession> | null;
  resultingBalance: number | null;
  pointsAwarded?: number;
}

const localQuizSessions = new Map<string, StoredQuizSession>();

async function listSchoolClasses(includeInactive = false): Promise<SchoolClass[]> {
  let classes: SchoolClass[] = defaultSchoolClasses();
  if (db) {
    const snapshot = await db.collection("school_classes").get();
    const storedClasses = snapshot.docs
      .map((document) => document.data() as SchoolClass)
      .filter(isValidSchoolClass);
    const merged = new Map(classes.map((schoolClass) => [schoolClass.id, schoolClass]));
    for (const schoolClass of storedClasses) merged.set(schoolClass.id, schoolClass);
    classes = [...merged.values()];
  }
  return classes
    .filter((schoolClass) => includeInactive || schoolClass.active)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "vi"));
}

async function findActiveSchoolClass(classId: string): Promise<SchoolClass | null> {
  const classes = await listSchoolClasses(false);
  return classes.find((schoolClass) => schoolClass.id === classId) ?? null;
}

// Load data fallback
if (fs.existsSync(DB_FILE)) {
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    const storedUsers = Array.isArray(data.users) ? data.users : [];
    users = storedUsers.filter((user: unknown) => {
      if (!user || typeof user !== "object") return false;
      return isValidNickname((user as { nick?: unknown }).nick);
    });
    const rejected = storedUsers.length - users.length;
    if (rejected > 0) {
      console.warn(`[local-db] Ignored ${rejected} malformed user records from ${DB_FILE}`);
    }
  } catch (e) {
    console.error("Failed to load db", e);
  }
}

function saveData() {
  if (!db) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users }, null, 2));
  }
}

// ─── Reward Transaction Logging (to Supabase/PostgreSQL research DB) ───────────
async function logRewardTransaction(
  userId: string,
  transactionType: "earn" | "spend" | "adjustment",
  amount: number,
  options?: { reason?: string; source?: string; multiplier?: number; pointsBalance?: number },
) {
  const db = getDb();
  if (!db) return;
  try {
    await db.query(
      `INSERT INTO reward_transactions (user_id, transaction_type, amount, reason, source, multiplier, points_balance)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        transactionType,
        amount,
        options?.reason ?? null,
        options?.source ?? null,
        options?.multiplier ?? 1.0,
        options?.pointsBalance ?? null,
      ],
    );
  } catch (e) {
    console.warn("[RewardTx] Failed to log:", (e as Error).message);
  }
}

async function getUser(nick: string): Promise<User | undefined> {
  const normNick = (nick || "").trim().toLowerCase();
  const isAccountId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    normNick,
  );
  if (!isValidNickname(normNick) && !isAccountId) return undefined;
  if (db) {
    if (isValidNickname(normNick)) {
      const doc = await db.collection("users").doc(normNick).get();
      if (doc.exists) {
        const user = doc.data() as User;
        const verification = isGradeEightClass(user.classGrade)
          ? await readProfileVerification(user.account_id).catch(() => null)
          : null;
        if (verification) user.profileVerificationStatus = verification.status;
        return normalizeUserEconomy(user);
      }
    }
    if (isAccountId) {
      const result = await db
        .collection("users")
        .where("account_id", "==", normNick)
        .limit(1)
        .get();
      if (!result.empty) {
        const user = result.docs[0].data() as User;
        const verification = isGradeEightClass(user.classGrade)
          ? await readProfileVerification(user.account_id).catch(() => null)
          : null;
        if (verification) user.profileVerificationStatus = verification.status;
        return normalizeUserEconomy(user);
      }
    }
  }
  const user = users.find(
    (candidate) =>
      candidate.nick.toLowerCase() === normNick || candidate.account_id?.toLowerCase() === normNick,
  );
  if (!user) return undefined;
  const verification = isGradeEightClass(user.classGrade)
    ? await readProfileVerification(user.account_id).catch(() => null)
    : null;
  if (verification) user.profileVerificationStatus = verification.status;
  return normalizeUserEconomy(user);
}

async function getUserFromToken(token: string): Promise<User | undefined> {
  const result = validateToken(`Bearer ${token}`);
  if (!result) return undefined;
  return getUser(result.nick);
}

function formatTimeRemaining(endDate: Date): string {
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();
  if (diff <= 0) return "Đã kết thúc";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}ngày ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins} phút`;
}

interface PvPMatch {
  id: string;
  challengerId: string;
  opponentId: string;
  challengerName: string;
  opponentName: string;
  challengerWager: number;
  opponentWager: number;
  winnerId?: string;
  challengerResult?: "win" | "lose" | "pending";
  opponentResult?: "win" | "lose" | "pending";
  stake: number;
  status: "matched" | "battle" | "completed";
  createdAt: number;
  updatedAt: number;
  rounds: any[];
}

interface TournamentParticipant {
  userId: string;
  name: string;
  points: number;
  weeklyScore: number;
  joinedAt: number;
}
interface TournamentMatch {
  id: string;
  player1Id: string;
  player1Name: string;
  player2Id: string | null;
  player2Name: string | null;
  winnerId?: string;
  status: "pending" | "live" | "completed";
  player1Score?: number;
  player2Score?: number;
}

function generateBracket(participants: TournamentParticipant[]): {
  rounds: { round: number; name: string; matches: TournamentMatch[] }[];
} {
  // Single-elimination bracket: round of 8 → quarter → semi → final
  const byes = 8 - participants.length;
  const bracket: { rounds: { round: number; name: string; matches: TournamentMatch[] }[] } = {
    rounds: [],
  };

  // Round 1 (Quarter-finals or pre-qualifier if < 8)
  const qfMatches: TournamentMatch[] = [];
  const sorted = [...participants].sort((a, b) => b.weeklyScore - a.weeklyScore);
  for (let i = 0; i < 8; i += 2) {
    const p1 = sorted[i];
    const p2 = i + 1 < sorted.length ? sorted[i + 1] : null;
    if (p1) {
      qfMatches.push({
        id: `qf_${i}`,
        player1Id: p1.userId,
        player1Name: p1.name,
        player2Id: p2?.userId || null,
        player2Name: p2?.name || "BYE",
        status: p2 ? "pending" : "completed",
        winnerId: p2 ? undefined : p1.userId,
        player1Score: p2 ? undefined : 1,
        player2Score: 0,
      });
    }
  }
  bracket.rounds.push({ round: 1, name: "Tứ kết", matches: qfMatches });

  // Semi-finals
  const sfMatches: TournamentMatch[] = [];
  for (let i = 0; i < 4; i += 2) {
    sfMatches.push({
      id: `sf_${i}`,
      player1Id: "",
      player1Name: "???",
      player2Id: null,
      player2Name: "???",
      status: "pending",
    });
  }
  bracket.rounds.push({ round: 2, name: "Bán kết", matches: sfMatches });

  // Finals
  bracket.rounds.push({
    round: 3,
    name: "Chung kết",
    matches: [
      {
        id: "final",
        player1Id: "",
        player1Name: "???",
        player2Id: null,
        player2Name: "???",
        status: "pending",
      },
    ],
  });

  return bracket;
}

async function saveUser(user: User, isNew: boolean = false): Promise<void> {
  normalizeUserEconomy(user);
  const normNick = user.nick.toLowerCase();
  if (db) {
    try {
      const ref = db.collection("users").doc(normNick);
      await db.runTransaction(async (transaction) => {
        const currentSnapshot = await transaction.get(ref);
        if (!currentSnapshot.exists) {
          user.pointsVersion = Math.max(0, Math.trunc(Number(user.pointsVersion) || 0));
          transaction.set(ref, user, { merge: true });
          return;
        }
        const current = normalizeUserEconomy(currentSnapshot.data() as User);
        const storedVersion = Math.max(0, Math.trunc(Number(current.pointsVersion) || 0));
        const incomingVersion = Math.max(0, Math.trunc(Number(user.pointsVersion) || 0));
        if (incomingVersion !== storedVersion) {
          // Another transaction changed the balance after this object was read.
          // Persist profile fields but carry the authoritative economy forward.
          user.points = current.points;
          user.totalExpEarned = current.totalExpEarned;
          user.pointsVersion = storedVersion;
        } else {
          const economyChanged =
            user.points !== current.points || user.totalExpEarned !== current.totalExpEarned;
          user.pointsVersion = storedVersion + (economyChanged ? 1 : 0);
        }
        transaction.set(ref, user, { merge: true });
      });
    } catch (e) {
      console.error(`[saveUser] Failed to save ${normNick} to Firestore:`, e?.message || e);
      throw e;
    }
  } else {
    if (isNew) {
      const exists = users.some((candidate) => candidate.nick.toLowerCase() === normNick);
      if (!exists) users.push(user);
    }
    saveData();
  }
  runInBackground("user-profile-sync", async () => {
    await syncUserResearchProfile(user);
  });
}

async function saveUserAndProgress(
  nickname: string,
  user: User,
  progress: GameProgress,
): Promise<void> {
  normalizeUserEconomy(user);
  normalizeProgressCards(progress);
  const normalizedNickname = nickname.toLowerCase();
  if (db) {
    try {
      const userRef = db.collection("users").doc(normalizedNickname);
      const progressRef = db.collection("user_progress").doc(normalizedNickname);
      await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(userRef);
        if (!snapshot.exists)
          throw new Error(`Cannot save progress: user ${nickname} was not found`);
        const current = normalizeUserEconomy(snapshot.data() as User);
        const storedVersion = Math.max(0, Math.trunc(Number(current.pointsVersion) || 0));
        const incomingVersion = Math.max(0, Math.trunc(Number(user.pointsVersion) || 0));
        if (incomingVersion !== storedVersion) {
          user.points = current.points;
          user.totalExpEarned = current.totalExpEarned;
          user.pointsVersion = storedVersion;
        } else {
          const economyChanged =
            user.points !== current.points || user.totalExpEarned !== current.totalExpEarned;
          user.pointsVersion = storedVersion + (economyChanged ? 1 : 0);
        }
        transaction.set(userRef, user, { merge: true });
        transaction.set(progressRef, progress, { merge: true });
      });
      runInBackground("user-progress-profile-sync", async () => {
        await syncUserResearchProfile(user);
      });
      return;
    } catch (error) {
      console.error(`[saveUserAndProgress] Atomic write failed for ${normalizedNickname}:`, error);
      throw error;
    }
  }

  const localUser = users.find((candidate) => candidate.nick.toLowerCase() === normalizedNickname);
  if (!localUser) throw new Error(`Cannot save progress: user ${nickname} was not found`);
  Object.assign(localUser, user, { progress });
  saveData();
}

interface CreditedScanReward extends ScanRewardDecision {
  points: number | null;
  accountId: string | null;
}

async function creditScanReward(
  nickname: string,
  imageHash: string,
  materialProfile?: string,
): Promise<CreditedScanReward> {
  const releaseRewardLock = await acquireRewardLock(nickname);
  try {
    if (db) {
      let result: CreditedScanReward = {
        ...decideScanReward(undefined, undefined, imageHash),
        points: null,
        accountId: null,
      };
      const userRef = db.collection("users").doc(nickname.toLowerCase());
      await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(userRef);
        if (!snapshot.exists) return;
        const user = normalizeUserEconomy(snapshot.data() as User);
        const decision = decideScanReward(
          nickname,
          user.scanRewardHistory,
          imageHash,
          Date.now(),
          materialProfile,
        );
        const reward: ScanRewardDecision = pointEligibility(user).canEarnPoints
          ? decision
          : { ...decision, awarded: 0, reason: "profile_verification_required" };
        user.scanRewardHistory = reward.history;
        if (reward.awarded > 0) applyPointDelta(user, reward.awarded);
        transaction.set(
          userRef,
          {
            points: user.points,
            totalExpEarned: user.totalExpEarned,
            scanRewardHistory: user.scanRewardHistory,
          },
          { merge: true },
        );
        if (reward.awarded > 0) {
          const ledgerId = crypto
            .createHash("sha256")
            .update(`${user.account_id}:${imageHash}`)
            .digest("hex")
            .slice(0, 40);
          transaction.set(db!.collection("point_transactions").doc(`scan_${ledgerId}`), {
            id: `scan_${ledgerId}`,
            accountId: user.account_id,
            nickname: user.nick,
            type: "earn",
            source: "scan",
            reason: "Phân tích vật thể hợp lệ",
            amount: reward.awarded,
            balanceAfter: user.points,
            idempotencyKey: imageHash,
            createdAt: Date.now(),
          });
        }
        result = { ...reward, points: user.points, accountId: user.account_id };
      });
      return result;
    }

    const user = await getUser(nickname);
    if (!user) {
      return {
        ...decideScanReward(undefined, undefined, imageHash),
        points: null,
        accountId: null,
      };
    }
    const decision = decideScanReward(
      nickname,
      user.scanRewardHistory,
      imageHash,
      Date.now(),
      materialProfile,
    );
    const reward: ScanRewardDecision = pointEligibility(user).canEarnPoints
      ? decision
      : { ...decision, awarded: 0, reason: "profile_verification_required" };
    user.scanRewardHistory = reward.history;
    if (reward.awarded > 0) applyPointDelta(user, reward.awarded);
    await saveUser(user);
    return { ...reward, points: user.points, accountId: user.account_id };
  } finally {
    releaseRewardLock();
  }
}

async function getAllUsers(): Promise<User[]> {
  if (db) {
    const snap = await db.collection("users").get();
    return snap.docs
      .map((document) => document.data() as User)
      .filter((user) => isValidNickname(user.nick))
      .map(normalizeUserEconomy);
  }
  return users.map(normalizeUserEconomy);
}

async function findUserByIdentifier(identifier: string): Promise<User | undefined> {
  const normalized = identifier.trim().toLowerCase();
  if (!normalized) return undefined;
  const byNickname = await getUser(normalized);
  if (byNickname) return byNickname;
  if (!normalized.includes("@")) return undefined;
  return findUserByEmail(normalized);
}

async function findUserByEmail(email: string): Promise<User | undefined> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return undefined;
  if (db) {
    const snapshot = await db.collection("users").where("email", "==", normalized).limit(1).get();
    if (!snapshot.empty) return normalizeUserEconomy(snapshot.docs[0].data() as User);
  }
  const user = users.find((user) => user.email?.trim().toLowerCase() === normalized);
  return user ? normalizeUserEconomy(user) : undefined;
}

function passwordResetBaseUrl(): string | null {
  const configured = process.env.PUBLIC_APP_URL?.trim();
  if (!configured) {
    return process.env.NODE_ENV === "production" ? null : `http://localhost:${PORT}`;
  }
  try {
    const url = new URL(configured);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") return null;
    return url.origin + url.pathname.replace(/\/$/, "");
  } catch {
    return null;
  }
}

async function storePasswordResetRecord(
  tokenHash: string,
  record: PasswordResetRecord,
): Promise<void> {
  passwordResetTokens.set(tokenHash, record);
  if (db) {
    await db.collection("password_reset_tokens").doc(tokenHash).set(record);
  }
}

async function loadPasswordResetRecord(tokenHash: string): Promise<PasswordResetRecord | null> {
  const cached = passwordResetTokens.get(tokenHash);
  if (cached) return cached;
  if (!db) return null;
  const snapshot = await db.collection("password_reset_tokens").doc(tokenHash).get();
  return snapshot.exists ? (snapshot.data() as PasswordResetRecord) : null;
}

async function deletePasswordResetRecord(tokenHash: string): Promise<void> {
  passwordResetTokens.delete(tokenHash);
  if (db) {
    await db.collection("password_reset_tokens").doc(tokenHash).delete();
  }
}

import Groq from "groq-sdk";

let groqClient: Groq | null = null;
function getGroqClient() {
  if (!groqClient && process.env.GROQ_API_KEY) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

// ─── Robot v2: session-bound identity + exactly-once verified disposal ──────
const robotNonceCache = new Map<string, number>();

async function requireRobotV2(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const secret = process.env.BMO_ROBOT_SHARED_SECRET?.trim();
  if (!secret || secret.length < 24) {
    return res
      .status(503)
      .json({ error: "Robot v2 chưa được cấu hình.", code: "robot_unconfigured" });
  }
  const checked = verifyRobotRequest({
    secret,
    method: req.method,
    path: req.path,
    timestamp: String(req.headers["x-bmo-timestamp"] || ""),
    nonce: String(req.headers["x-bmo-nonce"] || ""),
    signature: String(req.headers["x-bmo-signature"] || ""),
    body: req.body ?? {},
  });
  if (!checked.ok) {
    return res.status(401).json({ error: "Chữ ký robot không hợp lệ.", code: checked.reason });
  }
  const nonceId = crypto
    .createHash("sha256")
    .update(`${String(req.body?.device_id || "unknown")}:${checked.nonce}`)
    .digest("hex");
  try {
    if (db) {
      await db
        .collection("robot_nonces")
        .doc(nonceId)
        .create({
          nonce: checked.nonce,
          timestampMs: checked.timestampMs,
          expiresAt: checked.timestampMs + 10 * 60_000,
          createdAt: Date.now(),
        });
    } else {
      const now = Date.now();
      for (const [key, expiry] of robotNonceCache) if (expiry < now) robotNonceCache.delete(key);
      if (robotNonceCache.has(nonceId)) throw new Error("NONCE_REPLAY");
      robotNonceCache.set(nonceId, checked.timestampMs + 10 * 60_000);
    }
  } catch (error) {
    const code = (error as { code?: number | string }).code;
    if (code === 6 || code === "6" || (error as Error).message === "NONCE_REPLAY") {
      return res.status(409).json({ error: "Yêu cầu robot đã được dùng.", code: "nonce_replay" });
    }
    throw error;
  }
  (req as any).robotSecret = secret;
  next();
}

async function findBadgeUsers(studentName: string, className: string): Promise<User[]> {
  const normalizedName = normalizeStudentName(studentName);
  const normalizedClass = className.replace(/\s+/g, "").toUpperCase();
  if (db) {
    const [byGrade, byClassId] = await Promise.all([
      db.collection("users").where("classGrade", "==", normalizedClass).get(),
      db.collection("users").where("classId", "==", normalizedClass).get(),
    ]);
    const unique = new Map(
      [...byGrade.docs, ...byClassId.docs].map((document) => [document.id, document]),
    );
    return [...unique.values()]
      .map((document) => normalizeUserEconomy(document.data() as User))
      .filter((user) => normalizeStudentName(user.fullName || user.name) === normalizedName);
  }
  return users.filter(
    (user) =>
      (user.classGrade || "").replace(/\s+/g, "").toUpperCase() === normalizedClass &&
      normalizeStudentName(user.fullName || user.name) === normalizedName,
  );
}

async function pinAttemptState(
  accountId: string,
  deviceId: string,
): Promise<{
  locked: boolean;
  retryAfterSeconds: number;
}> {
  if (!db) return { locked: false, retryAfterSeconds: 0 };
  const id = crypto.createHash("sha256").update(`${accountId}:${deviceId}`).digest("hex");
  const snapshot = await db.collection("robot_pin_attempts").doc(id).get();
  const value = snapshot.data() as { count?: number; windowStartedAt?: number } | undefined;
  const elapsed = Date.now() - Number(value?.windowStartedAt || 0);
  if (!value || elapsed >= 15 * 60_000 || Number(value.count || 0) < 5) {
    return { locked: false, retryAfterSeconds: 0 };
  }
  return { locked: true, retryAfterSeconds: Math.ceil((15 * 60_000 - elapsed) / 1000) };
}

async function recordPinAttempt(accountId: string, deviceId: string, successful: boolean) {
  if (!db) return;
  const id = crypto.createHash("sha256").update(`${accountId}:${deviceId}`).digest("hex");
  const ref = db.collection("robot_pin_attempts").doc(id);
  if (successful) {
    await ref.delete().catch(() => undefined);
    return;
  }
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const now = Date.now();
    const previous = snapshot.data() as { count?: number; windowStartedAt?: number } | undefined;
    const reset = !previous || now - Number(previous.windowStartedAt || 0) >= 15 * 60_000;
    transaction.set(ref, {
      accountId,
      deviceId,
      count: reset ? 1 : Number(previous?.count || 0) + 1,
      windowStartedAt: reset ? now : previous?.windowStartedAt,
      updatedAt: now,
    });
  });
}

app.put("/api/me/robot-pin", requireAuth, async (req, res) => {
  const pin = String(req.body?.pin || "");
  if (!/^\d{6}$/.test(pin) || /^(\d)\1{5}$/.test(pin)) {
    return res.status(400).json({
      error: "PIN phải gồm 6 số và không được lặp cùng một chữ số.",
      code: "invalid_robot_pin",
    });
  }
  const user = await getUser(String((req as any).userNick || ""));
  if (!user) return res.status(404).json({ error: "Không tìm thấy tài khoản." });
  user.robotPinHash = await hashPassword(pin);
  user.robotPinUpdatedAt = Date.now();
  await saveUser(user);
  res.json({ success: true, robot_pin_configured: true, updated_at: user.robotPinUpdatedAt });
});

app.post("/api/robot/v2/identity", requireRobotV2, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Danh tính robot cần Firestore." });
  const parsed = RobotIdentityRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Dữ liệu danh tính không hợp lệ.", details: parsed.error.issues });
  }
  const body = parsed.data;
  let user: User | undefined;
  if (body.method === "badge") {
    const badge = body.badge!;
    const age = Date.now() - badge.observed_at_ms;
    if (age < -2_000 || age > 15_000 || badge.confidence < 0.6) {
      return res
        .status(409)
        .json({ error: "Kết quả phù hiệu đã cũ hoặc chưa đủ chắc chắn.", code: "stale_badge" });
    }
    const candidates = await findBadgeUsers(badge.student_name, badge.class_name);
    if (candidates.length !== 1) {
      return res.status(409).json({
        error: candidates.length
          ? "Phù hiệu trùng tên — hãy nhập ID/PIN."
          : "Không khớp tài khoản — hãy nhập ID/PIN.",
        code: candidates.length ? "ambiguous_badge" : "badge_not_found",
      });
    }
    user = candidates[0];
  } else {
    user = await getUser(body.account_id!);
    if (!user || !user.robotPinHash) {
      await recordPinAttempt(body.account_id!, body.device_id, false);
      return res
        .status(401)
        .json({ error: "ID hoặc PIN robot không đúng.", code: "invalid_robot_pin" });
    }
    const state = await pinAttemptState(user.account_id, body.device_id);
    if (state.locked) {
      res.setHeader("Retry-After", String(state.retryAfterSeconds));
      return res
        .status(429)
        .json({ error: "Đã nhập sai quá nhiều lần.", code: "robot_pin_locked" });
    }
    const valid = await verifyPassword(body.pin!, user.robotPinHash);
    await recordPinAttempt(user.account_id, body.device_id, valid);
    if (!valid) {
      return res
        .status(401)
        .json({ error: "ID hoặc PIN robot không đúng.", code: "invalid_robot_pin" });
    }
  }
  if (!user || user.disabled || isUserDisabled(user.nick)) {
    return res.status(403).json({ error: "Tài khoản không hoạt động.", code: "account_disabled" });
  }
  const payloadHash = robotPayloadHash(body);
  const secret = String((req as any).robotSecret);
  const identityToken = crypto
    .createHmac("sha256", secret)
    .update(`identity:${body.session_id}:${payloadHash}`)
    .digest("hex");
  const ref = db.collection("robot_identity_sessions").doc(body.session_id);
  const now = Date.now();
  const expiresAt = now + 3 * 60_000;
  const record = await db
    .runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      if (existing.exists) {
        const current = existing.data()!;
        if (current.payloadHash !== payloadHash || current.deviceId !== body.device_id) {
          throw new Error("IDENTITY_SESSION_CONFLICT");
        }
        return current;
      }
      const value = {
        sessionId: body.session_id,
        deviceId: body.device_id,
        accountId: user!.account_id,
        nickname: user!.nick.toLowerCase(),
        fullName: user!.fullName || user!.name,
        className: user!.classGrade || user!.classId || "",
        method: body.method,
        payloadHash,
        identityTokenHash: identityTokenHash(identityToken),
        canEarnPoints: pointEligibility(user!).canEarnPoints,
        createdAt: now,
        expiresAt,
      };
      transaction.create(ref, value);
      return value;
    })
    .catch((error) => {
      if ((error as Error).message === "IDENTITY_SESSION_CONFLICT") return null;
      throw error;
    });
  if (!record)
    return res
      .status(409)
      .json({ error: "Phiên đã gắn với danh tính khác.", code: "identity_session_conflict" });
  res.json({
    success: true,
    session_id: body.session_id,
    identity_token: identityToken,
    account_id: record.accountId,
    nickname: record.nickname,
    full_name: record.fullName,
    class_name: record.className,
    can_earn_points: record.canEarnPoints,
    point_eligibility_reason: record.canEarnPoints ? null : "profile_verification_required",
    expires_at: record.expiresAt,
  });
});

app.post("/api/robot/v2/events", requireRobotV2, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Ghi điểm robot cần Firestore." });
  const parsed = RobotEventRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Sự kiện robot không hợp lệ.", details: parsed.error.issues });
  }
  const event = parsed.data;
  const { identity_token: _identityToken, ...storedEvent } = event;
  const bodyHash = robotPayloadHash(event);
  const eventRef = db.collection("robot_events").doc(event.event_id);
  const sessionRef = db.collection("robot_identity_sessions").doc(event.session_id);
  try {
    const receipt = await db.runTransaction(async (transaction) => {
      const [existing, sessionSnapshot] = await Promise.all([
        transaction.get(eventRef),
        transaction.get(sessionRef),
      ]);
      if (existing.exists) {
        const current = existing.data()!;
        if (current.bodyHash !== bodyHash) throw new Error("EVENT_ID_CONFLICT");
        return current.receipt;
      }
      if (!sessionSnapshot.exists) throw new Error("IDENTITY_SESSION_NOT_FOUND");
      const session = sessionSnapshot.data()!;
      if (session.deviceId !== event.device_id) throw new Error("DEVICE_MISMATCH");
      if (session.completedEventId && session.completedEventId !== event.event_id) {
        throw new Error("SESSION_ALREADY_COMPLETED");
      }
      if (identityTokenHash(event.identity_token) !== session.identityTokenHash) {
        throw new Error("IDENTITY_TOKEN_INVALID");
      }
      if (
        event.completed_at_ms < event.observed_at_ms ||
        event.completed_at_ms - event.observed_at_ms > 60_000
      ) {
        throw new Error("INVALID_EVENT_TIMELINE");
      }
      // Delivery may happen much later after an offline period. Validate when
      // the physical event happened, not when its durable outbox finally sent.
      if (
        event.observed_at_ms < Number(session.createdAt || 0) - 5_000 ||
        event.completed_at_ms > Number(session.expiresAt || 0) + 45_000
      ) {
        throw new Error("IDENTITY_SESSION_EXPIRED");
      }
      const userRef = db!.collection("users").doc(String(session.nickname));
      const userSnapshot = await transaction.get(userRef);
      if (!userSnapshot.exists) throw new Error("USER_NOT_FOUND");
      const user = normalizeUserEconomy(userSnapshot.data() as User);
      const eligible = pointEligibility(user).canEarnPoints && !user.disabled;
      const pointsApplied = robotScore(event, eligible);
      const balanceBefore = user.points;
      const balanceAfter = balanceBefore + pointsApplied;
      const totalExpEarned = (user.totalExpEarned || 0) + pointsApplied;
      const correct = event.decision === "confirmed" && event.actual_bin === event.waste_category;
      const receiptId = `robot_${event.event_id}`;
      const receipt = {
        receipt_id: receiptId,
        event_id: event.event_id,
        session_id: event.session_id,
        account_id: user.account_id,
        nickname: user.nick,
        decision: event.decision,
        correct,
        points_applied: pointsApplied,
        balance_after: balanceAfter,
        can_earn_points: eligible,
        point_eligibility_reason: eligible ? null : "profile_verification_required",
        committed_at: Date.now(),
      };
      if (pointsApplied > 0) {
        const pointsVersion = Math.max(0, Math.trunc(Number(user.pointsVersion) || 0)) + 1;
        transaction.update(userRef, { points: balanceAfter, totalExpEarned, pointsVersion });
        transaction.create(db!.collection("point_transactions").doc(receiptId), {
          id: receiptId,
          accountId: user.account_id,
          nickname: user.nick.toLowerCase(),
          type: "earn",
          source: "bmo_robot_verified_disposal",
          reason: `Bỏ đúng ${event.waste_name} vào thùng ${event.actual_bin}`,
          amount: pointsApplied,
          balanceBefore,
          balanceAfter,
          totalExpEarned,
          idempotencyKey: event.event_id,
          createdAt: receipt.committed_at,
        });
      }
      const notificationId = `robot_event_${event.event_id}`;
      transaction.create(db!.collection("notifications").doc(notificationId), {
        id: notificationId,
        userId: user.account_id,
        kind: pointsApplied > 0 ? "robot_reward" : "robot_disposal",
        type: pointsApplied > 0 ? "robot_reward" : "robot_disposal",
        title: pointsApplied > 0 ? "BMO đã cộng 10 điểm" : "BMO đã ghi nhận lượt bỏ rác",
        body:
          pointsApplied > 0
            ? `${event.waste_name}: đúng thùng ${event.actual_bin}.`
            : correct
              ? `${event.waste_name}: hồ sơ chưa đủ điều kiện nhận điểm.`
              : `${event.waste_name}: chưa xác nhận đúng thùng, không cộng điểm.`,
        message:
          pointsApplied > 0
            ? `${event.waste_name}: đúng thùng ${event.actual_bin}.`
            : correct
              ? `${event.waste_name}: hồ sơ chưa đủ điều kiện nhận điểm.`
              : `${event.waste_name}: chưa xác nhận đúng thùng, không cộng điểm.`,
        createdAt: receipt.committed_at,
        readAt: null,
        eventId: event.event_id,
      });
      transaction.create(eventRef, {
        ...storedEvent,
        accountId: user.account_id,
        nickname: user.nick.toLowerCase(),
        bodyHash,
        receipt,
        createdAt: receipt.committed_at,
      });
      transaction.set(db!.collection("supabase_outbox").doc(receiptId), {
        id: receiptId,
        kind: "robot_event",
        payload: { ...storedEvent, account_id: user.account_id, points_applied: pointsApplied },
        state: "pending",
        attempts: 0,
        createdAt: receipt.committed_at,
      });
      transaction.update(sessionRef, {
        completedEventId: event.event_id,
        completedAt: receipt.committed_at,
      });
      return receipt;
    });
    res.json({ success: true, receipt });
  } catch (error) {
    const code = (error as Error).message;
    const status = ["EVENT_ID_CONFLICT", "SESSION_ALREADY_COMPLETED"].includes(code)
      ? 409
      : ["IDENTITY_SESSION_NOT_FOUND", "USER_NOT_FOUND"].includes(code)
        ? 404
        : 401;
    res
      .status(status)
      .json({ error: "Không thể ghi nhận sự kiện robot.", code: code.toLowerCase() });
  }
});

app.get("/api/robot/v2/events/:eventId", requireRobotV2, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Dịch vụ robot chưa sẵn sàng." });
  const eventId = getRouteParam(req.params.eventId);
  const snapshot = await db.collection("robot_events").doc(eventId).get();
  if (!snapshot.exists)
    return res.status(404).json({ error: "Chưa có biên nhận.", code: "event_not_found" });
  const value = snapshot.data()!;
  res.json({ success: true, receipt: value.receipt });
});

// The old endpoint trusted only a nickname and could award points without
// disposal evidence. Keep a deliberate tombstone so stale firmware fails safe.
app.post("/api/robot", (_req, res) =>
  res.status(410).json({
    result: "error",
    code: "legacy_robot_endpoint_retired",
    message: "Hãy cập nhật robot sang giao thức v2.",
  }),
);

// 2. Auth and school profile APIs
app.get("/api/classes", async (_req, res) => {
  try {
    res.json({ classes: await listSchoolClasses(false) });
  } catch (error) {
    console.error("[classes] list failed:", error);
    res.status(503).json({ error: "Không thể tải danh mục lớp lúc này." });
  }
});

app.get("/api/admin/classes", requireAdmin, async (_req, res) => {
  try {
    res.json({ classes: await listSchoolClasses(true) });
  } catch (error) {
    res.status(503).json({ error: (error as Error).message });
  }
});

app.put("/api/admin/classes/:id", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Firestore chưa sẵn sàng." });
  const candidate: SchoolClass = {
    id: getRouteParam(req.params.id).trim().toLowerCase(),
    name: String(req.body?.name ?? "").trim(),
    grade: Number(req.body?.grade),
    schoolYear: String(req.body?.schoolYear ?? "").trim(),
    active: req.body?.active !== false,
    sortOrder: Number.isFinite(Number(req.body?.sortOrder)) ? Number(req.body.sortOrder) : 0,
  };
  if (!isValidSchoolClass(candidate)) {
    return res.status(400).json({ error: "Thông tin lớp không hợp lệ." });
  }
  await db.collection("school_classes").doc(candidate.id).set(candidate, { merge: false });
  runInBackground("sync-school-class", async () => {
    await syncSchoolClasses([candidate]);
  });
  res.json({ schoolClass: candidate });
});

app.get("/api/admin/class-progress", requireAdmin, async (req, res) => {
  try {
    const requestedClassId =
      typeof req.query.classId === "string" ? req.query.classId.trim().toLowerCase() : "";
    const [classes, users] = await Promise.all([listSchoolClasses(true), getAllUsers()]);
    const allowedClassIds = new Set(classes.map((schoolClass) => schoolClass.id));
    if (requestedClassId && !allowedClassIds.has(requestedClassId)) {
      return res.status(400).json({ error: "Lớp không hợp lệ." });
    }
    const students = users
      .filter((candidate) => candidate.role !== "admin")
      .filter((candidate) => !requestedClassId || candidate.classId === requestedClassId)
      .map((candidate) => ({
        accountId: candidate.account_id,
        nick: candidate.nick,
        fullName: candidate.fullName || null,
        displayName: candidate.name,
        classId: candidate.classId || null,
        profileComplete: Boolean(candidate.fullName?.trim() && candidate.classId),
        profileVerificationStatus: candidate.profileVerificationStatus || "unverified",
        canEarnPoints: pointEligibility(candidate).canEarnPoints,
        spendablePoints: Math.max(0, Math.trunc(Number(candidate.points) || 0)),
        lifetimeExperience: Math.max(0, Math.trunc(Number(candidate.totalExpEarned) || 0)),
        verifiedScans: Array.isArray(candidate.scanRewardHistory)
          ? candidate.scanRewardHistory.length
          : 0,
        disabled: Boolean(candidate.disabled || candidate.role === "suspended"),
      }))
      .sort((left, right) =>
        String(left.fullName || left.displayName).localeCompare(
          String(right.fullName || right.displayName),
          "vi",
        ),
      );
    res.json({ classes, students });
  } catch (error) {
    console.error("[class-progress]", error);
    res.status(503).json({ error: "Không thể tải tiến bộ theo lớp lúc này." });
  }
});

app.patch("/api/admin/users/:accountId/profile-verification", requireAdmin, async (req, res) => {
  const accountId = getRouteParam(req.params.accountId).trim().toLowerCase();
  const status = req.body?.status;
  const rejectionReason = normalizeStudentName(req.body?.reason).slice(0, 300);
  if (status !== "verified" && status !== "rejected") {
    return res.status(400).json({ error: "Trạng thái xác minh không hợp lệ." });
  }
  try {
    const user = await getUser(accountId);
    if (!user) return res.status(404).json({ error: "Không tìm thấy học sinh." });
    if (!user.fullName?.trim() || !user.classId) {
      return res.status(409).json({ error: "Hồ sơ chưa có đủ họ tên và lớp để xác minh." });
    }
    const adminNick = String((req as typeof req & { userNick?: string }).userNick || "admin");
    const updatedAt = Date.now();
    applyProfileVerificationDecision(user, status, {
      updatedAt,
      verifiedBy: adminNick,
      rejectionReason,
    });
    const supabaseVerificationEnabled = isProfileVerificationStoreConfigured();
    if (supabaseVerificationEnabled) {
      const verificationSaved = await syncProfileVerification({
        accountId: user.account_id,
        fullName: user.fullName,
        classId: user.classId,
        classGrade: user.classGrade,
        status,
        rejectionReason: user.profileRejectionReason,
        submittedAt: user.profileUpdatedAt,
        verifiedAt: user.profileVerifiedAt,
        verifiedBy: user.profileVerifiedBy,
      });
      if (!verificationSaved) {
        return res.status(503).json({ error: "Kho xác minh Supabase chưa sẵn sàng." });
      }
    }
    let firestoreMirrorSaved = true;
    try {
      await saveUser(user);
    } catch (mirrorError) {
      if (!supabaseVerificationEnabled) throw mirrorError;
      firestoreMirrorSaved = false;
      console.warn(
        "[profile-verification] Firestore mirror deferred; Supabase remains authoritative:",
        (mirrorError as Error).message,
      );
    }
    if (firestoreMirrorSaved) {
      runInBackground("admin-profile-research-sync", async () => {
        await syncUserResearchProfile(user);
      });
    }
    return res.json({
      success: true,
      accountId: user.account_id,
      status,
      source: supabaseVerificationEnabled ? "supabase" : "local",
      firestoreMirrorSaved,
      ...publicProfileStatus(user),
    });
  } catch (error) {
    console.error("[profile-verification] update failed:", error);
    return res.status(500).json({ error: "Không thể cập nhật xác minh lúc này." });
  }
});

app.post("/api/login", async (req, res) => {
  const login_nickname =
    typeof req.body?.login_nickname === "string" ? req.body.login_nickname.trim() : "";
  const login_password =
    typeof req.body?.login_password === "string" ? req.body.login_password : "";

  if (!isValidNickname(login_nickname) || !login_password || login_password.length > 256) {
    return res.status(400).json({ success: false, message: "Thông tin đăng nhập không hợp lệ." });
  }

  let user;
  try {
    user = await getUser(login_nickname);
  } catch (e) {
    console.error("[login] getUser failed:", e?.message || e);
    return res.status(500).json({ success: false, message: "Lỗi server, vui lòng thử lại." });
  }

  if (user) {
    if (user.disabled || user.role === "suspended" || isUserDisabled(user.nick)) {
      return res.status(403).json({
        success: false,
        message: "Tài khoản đã bị tạm khóa. Vui lòng liên hệ quản trị viên.",
      });
    }
    // Layer 2.1 — verify password with bcrypt; auto-migrate legacy plaintext
    // to a bcrypt hash on first successful login so legacy data.json users
    // keep working without leaving cleartext in the DB.
    const ok = await verifyPassword(login_password, user.pass);
    if (ok) {
      // Privileges are persisted by an administrator; a nickname must never
      // be able to escalate itself to admin.
      const role = user.role === "admin" ? "admin" : "user";

      // Migrate plaintext password to bcrypt hash in-place (best-effort;
      // if the DB write fails the user can still log in — we just retry
      // the migration next time).
      if (!isLikelyHash(user.pass)) {
        try {
          user.pass = await hashPassword(login_password);
          await saveUser(user);
          console.info(`[login] migrated plaintext → bcrypt for ${user.nick}`);
        } catch (e) {
          console.warn(`[login] bcrypt migration failed for ${user.nick}:`, e?.message || e);
        }
      }

      const token = createSessionToken(user.nick, role === "admin", user.account_id);

      const accountId = user.account_id;
      // Research enrichment must never delay the authentication response.
      runInBackground("login-research", async () => {
        await syncUserResearchProfile(user);
        if (isDbConnected()) {
          const researchDb = getDb();
          if (researchDb) {
            const existingProfile = await personalityEngine.getPersonality(accountId);
            if (existingProfile === "friendly") {
              await personalityEngine.assignPersonality(accountId, 1);
            }
            const currentProfile = await behavioralProfiler.getProfile(accountId);
            if (!currentProfile) {
              await behavioralProfiler.profileUser(accountId);
            }
          }
        }
        await eventLogger.logLogin(accountId);
        if (isDbConnected()) {
          const shouldIntervene = await noveltyDecayDetector.shouldTriggerIntervention(accountId);
          if (shouldIntervene) {
            const interventions = await noveltyDecayDetector.getRecommendedInterventions(accountId);
            if (interventions.length > 0) {
              await noveltyDecayDetector.triggerIntervention(accountId, interventions[0]);
            }
          }
        }
      });

      res.json({
        success: true,
        token,
        nickname: user.name,
        points: user.points,
        totalExpEarned: user.totalExpEarned,
        account_id: user.nick,
        user_id: user.account_id,
        role: role,
        selectedAvatar: user.selectedAvatar,
        selectedFrame: user.selectedFrame,
        full_name: user.fullName || null,
        class_grade: user.classGrade || null,
        class_id: user.classId || null,
        profile_complete: Boolean(user.fullName?.trim() && user.classId),
        email: user.email || null,
        lastWheelClaimDate: user.lastWheelClaimDate || null,
        claimedStreakGifts: user.claimedStreakGifts || [],
        ...publicProfileStatus(user),
        message: "Đăng nhập thành công!",
      });
    } else {
      res.json({ success: false, message: "Sai mật khẩu!" });
    }
  } else {
    res.json({ success: false, message: "Tài khoản không tồn tại!" });
  }
});

app.post("/api/register", async (req, res) => {
  const {
    reg_name,
    reg_nickname,
    reg_password,
    reg_email,
    reg_class_id,
    reg_class_grade,
    reg_full_name,
    reg_profile_skipped,
  } = req.body ?? {};
  const cleanField = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const name = cleanField(reg_name);
  const nick = cleanField(reg_nickname);
  const pass = typeof reg_password === "string" ? reg_password : "";
  const email = cleanField(reg_email).toLowerCase();
  const classId = cleanField(reg_class_id || reg_class_grade).toLowerCase();
  const fullName = cleanField(reg_full_name);
  const profileSkipped = reg_profile_skipped === true;

  if (name.length < 2 || name.length > 50) {
    return res.status(400).json({
      success: false,
      message: "Tên hiển thị phải dài từ 2 đến 50 ký tự!",
    });
  }
  if (nick.length < 4) {
    return res.status(400).json({
      success: false,
      message: "Tài khoản phải có ít nhất 4 ký tự!",
    });
  }
  if (pass.length < 8 || pass.length > 128) {
    return res.status(400).json({
      success: false,
      message: "Mật khẩu phải dài từ 8 đến 128 ký tự!",
    });
  }
  if (!isValidNickname(nick)) {
    return res.status(400).json({
      success: false,
      message: "Nickname không được chứa dấu cách/ký tự lạ!",
    });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: "Email không hợp lệ!" });
  }
  if (!profileSkipped && (fullName.length < 2 || fullName.length > 100)) {
    return res.status(400).json({
      success: false,
      message: "Họ tên phải dài từ 2 đến 100 ký tự!",
    });
  }
  const schoolClass = profileSkipped
    ? null
    : await findActiveSchoolClass(classId).catch(() => null);
  if (!profileSkipped && !schoolClass) {
    return res
      .status(400)
      .json({ success: false, message: "Vui lòng chọn một lớp đang hoạt động." });
  }

  let existing;
  try {
    existing = await getUser(nick);
  } catch (e) {
    console.error("[register] getUser failed:", e?.message || e);
    return res.status(500).json({ success: false, message: "Lỗi server, vui lòng thử lại." });
  }
  if (existing) {
    return res.status(409).json({ success: false, message: "Tài khoản này đã tồn tại!" });
  }
  if (email) {
    try {
      const emailInUse = Boolean(await findUserByEmail(email));
      if (emailInUse) {
        return res
          .status(409)
          .json({ success: false, message: "Email này đã được dùng cho tài khoản khác!" });
      }
    } catch (error) {
      console.error("[register] email uniqueness check failed:", error);
      return res.status(500).json({ success: false, message: "Lỗi server, vui lòng thử lại." });
    }
  }

  // New accounts are regular users.  Admin access is granted out-of-band by
  // an operator after verifying the person and the deployment environment.
  const role = "user";
  const accountId = crypto.randomUUID();
  let passwordHash: string;
  try {
    passwordHash = await hashPassword(pass);
  } catch (e) {
    console.error("[register] password hashing failed:", e?.message || e);
    return res.status(500).json({ success: false, message: "Không thể tạo tài khoản lúc này." });
  }
  const profileVerificationStatus: ProfileVerificationStatus = profileSkipped
    ? "skipped"
    : isGradeEightClass(schoolClass?.name)
      ? "pending"
      : "unverified";
  const profileUpdatedAt = Date.now();
  const newUser: User = {
    name,
    nick,
    pass: passwordHash,
    email,
    classGrade: schoolClass?.name,
    classId: schoolClass?.id,
    fullName: profileSkipped ? undefined : fullName,
    profileVerificationStatus,
    profileUpdatedAt,
    points: 0,
    totalExpEarned: 0,
    hasPlayed: false,
    account_id: accountId,
    role,
  };
  try {
    await saveUser(newUser, true);
  } catch (e) {
    console.error("[register] saveUser failed:", e?.message || e);
    return res.status(500).json({ success: false, message: "Không thể tạo tài khoản lúc này." });
  }

  // Research enrichment is best-effort and runs after the account is durable.
  runInBackground("register-research", async () => {
    await syncUserResearchProfile(newUser);
    await syncProfileVerification({
      accountId,
      fullName: newUser.fullName,
      classId: newUser.classId,
      classGrade: newUser.classGrade,
      status: profileVerificationStatus,
      submittedAt: profileSkipped ? null : profileUpdatedAt,
    });
    if (isDbConnected()) {
      const researchDb = getDb();
      if (researchDb) {
        await personalityEngine.assignPersonality(accountId, 1);
        await eventLogger.log(accountId, "register", {
          timestamp: new Date().toISOString(),
          class_grade: newUser.classGrade || null,
          profile_verification_status: profileVerificationStatus,
        });
      }
    }
  });

  res.json({
    success: true,
    message: "Đăng ký thành công! Hãy đăng nhập.",
    account_id: accountId,
    ...publicProfileStatus(newUser),
  });
});

app.post("/api/forgot-password", async (req, res) => {
  // Always return the same public response so this endpoint cannot be used to
  // discover which email addresses or nicknames are registered.
  const publicResponse = {
    success: true,
    message: "Nếu tài khoản tồn tại và có email, liên kết khôi phục sẽ được gửi.",
  };
  const identifier = typeof req.body?.identifier === "string" ? req.body.identifier.trim() : "";
  if (!identifier || identifier.length > 254) return res.json(publicResponse);

  try {
    const user = await findUserByIdentifier(identifier);
    const baseUrl = passwordResetBaseUrl();
    if (!user?.email || !emailSender || !baseUrl) {
      if (user && (!emailSender || !baseUrl)) {
        console.warn(
          "[forgot-password] Email delivery unavailable; configure a Resend or SMTP provider plus PUBLIC_APP_URL.",
        );
      }
      return res.json(publicResponse);
    }

    const token = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const nonce = crypto.randomBytes(16).toString("hex");
    const record: PasswordResetRecord = {
      nick: user.nick,
      nonce,
      expiresAt: Date.now() + PASSWORD_RESET_TTL_MS,
    };

    // A new request invalidates older links for this account through the
    // per-user nonce, while only a hash of the actual token is persisted.
    user.passwordResetNonce = nonce;
    await saveUser(user);
    await storePasswordResetRecord(tokenHash, record);

    const resetUrl = new URL(baseUrl);
    resetUrl.searchParams.set("reset_token", token);
    const delivery = await deliverEmail(emailSender, {
      from: notificationFrom,
      to: user.email,
      subject: "EcoQuest — Khôi phục mật khẩu",
      text: [
        `Xin chào ${user.name || user.nick},`,
        "",
        "Mở liên kết dưới đây để đặt mật khẩu mới. Liên kết có hiệu lực trong 30 phút:",
        resetUrl.toString(),
        "",
        "Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email.",
      ].join("\n"),
    });
    if (delivery.status !== "accepted") {
      await deletePasswordResetRecord(tokenHash);
      delete user.passwordResetNonce;
      await saveUser(user);
      console.error(`[forgot-password] Delivery ${delivery.status}: ${delivery.reason}`);
    } else {
      console.info(`[forgot-password] Reset email sent, ID: ${delivery.id || "unknown"}`);
    }
  } catch (error) {
    console.error("[forgot-password] request failed:", error);
  }

  return res.json(publicResponse);
});

app.post("/api/reset-password", async (req, res) => {
  const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) {
    return res.status(400).json({ success: false, message: "Liên kết khôi phục không hợp lệ." });
  }
  if (newPassword.length < 8 || newPassword.length > 128) {
    return res
      .status(400)
      .json({ success: false, message: "Mật khẩu mới phải dài từ 8 đến 128 ký tự." });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  try {
    const record = await loadPasswordResetRecord(tokenHash);
    if (!record || record.expiresAt <= Date.now()) {
      if (record) await deletePasswordResetRecord(tokenHash);
      return res
        .status(400)
        .json({ success: false, message: "Liên kết khôi phục đã hết hạn hoặc đã được dùng." });
    }

    const user = await getUser(record.nick);
    if (!user || user.passwordResetNonce !== record.nonce) {
      await deletePasswordResetRecord(tokenHash);
      return res
        .status(400)
        .json({ success: false, message: "Liên kết khôi phục đã hết hạn hoặc đã được dùng." });
    }
    if (await verifyPassword(newPassword, user.pass)) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu mới phải khác mật khẩu hiện tại.",
      });
    }

    user.pass = await hashPassword(newPassword);
    user.passwordResetNonce = crypto.randomBytes(16).toString("hex");
    await saveUser(user);
    revokeUserSessions(user.nick);
    await deletePasswordResetRecord(tokenHash);
    return res.json({ success: true, message: "Đặt lại mật khẩu thành công. Hãy đăng nhập." });
  } catch (error) {
    console.error("[reset-password] reset failed:", error);
    return err(res, 500, "error.internal", req as any);
  }
});

app.post("/api/logout", requireAuth, (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  if (token) revokeSessionToken(token);
  res.json({ ok: true });
});

app.post("/api/change-password", requireAuth, async (req, res) => {
  // Layer 2.3 — you can only change your own password.
  const cp_nickname = (req as any).userNick as string;
  const { cp_old_pass, cp_new_pass } = req.body ?? {};

  if (typeof cp_new_pass !== "string" || cp_new_pass.length < 8 || cp_new_pass.length > 128) {
    return res
      .status(400)
      .json({ success: false, message: "Mật khẩu mới phải dài từ 8 đến 128 ký tự." });
  }

  let user;
  try {
    user = await getUser(cp_nickname);
  } catch (e) {
    console.error("[change-password] getUser failed:", e?.message || e);
    return res.status(500).json({ success: false, message: "Lỗi server, vui lòng thử lại." });
  }
  if (user) {
    // Layer 2.1 — verify with bcrypt; auto-migrate plaintext → bcrypt.
    const ok = await verifyPassword(cp_old_pass, user.pass);
    if (ok) {
      user.pass = await hashPassword(cp_new_pass);
      try {
        await saveUser(user);
      } catch (e) {
        console.error("[change-password] saveUser failed:", e?.message || e);
        return res.status(500).json({ success: false, message: "Lỗi server, vui lòng thử lại." });
      }
      res.json({ success: true, message: "Đổi mật khẩu thành công!" });
    } else {
      res.json({ success: false, message: "Mật khẩu cũ không đúng!" });
    }
  } else {
    res.json({ success: false, message: "Tài khoản không tìm thấy!" });
  }
});

const DAILY_WHEEL_REWARDS = [10, 25, 20, 500, 15, 30, 1, 50] as const;
const DAILY_WHEEL_WEIGHTS = [15, 15, 15, 1, 15, 15, 14, 10] as const;
const DAILY_WHEEL_TOTAL_WEIGHT = DAILY_WHEEL_WEIGHTS.reduce((sum, weight) => sum + weight, 0);
const STREAK_GIFT_REWARDS: Record<number, number> = {
  7: 30,
  14: 75,
  30: 200,
  60: 500,
  100: 1000,
};

function selectDailyWheelIndex(): number {
  let ticket = crypto.randomInt(DAILY_WHEEL_TOTAL_WEIGHT);
  for (let index = 0; index < DAILY_WHEEL_WEIGHTS.length; index++) {
    ticket -= DAILY_WHEEL_WEIGHTS[index];
    if (ticket < 0) return index;
  }
  return 0;
}

app.post("/api/daily-wheel", requireAuth, async (req, res) => {
  const nickname = (req as any).userNick as string;
  const releaseLock = await acquireRewardLock(nickname);
  try {
    const user = await getUser(nickname);
    if (!user) return err(res, 404, "error.notFound", req as any);
    if (!pointEligibility(user).canEarnPoints) {
      return res.status(403).json({
        success: false,
        code: "profile_verification_required",
        message: "Hồ sơ cần được xác minh trước khi nhận điểm.",
      });
    }

    const today = getVietnamDayKey();
    if (user.lastWheelClaimDate === today) {
      return res.status(409).json({ success: false, message: "Bạn đã quay thưởng hôm nay." });
    }

    const segmentIndex = selectDailyWheelIndex();
    const earnedPoints = DAILY_WHEEL_REWARDS[segmentIndex];
    applyEarnedPoints(user, earnedPoints);
    user.lastWheelClaimDate = today;
    await saveUser(user);

    await Promise.allSettled([
      eventLogger.logReward(user.account_id, earnedPoints, 0, "daily_wheel"),
      logRewardTransaction(user.account_id, "earn", earnedPoints, {
        reason: "daily_wheel",
        source: "daily_wheel",
        pointsBalance: user.points,
      }),
    ]);

    return res.json({
      success: true,
      segmentIndex,
      earnedPoints,
      points: user.points,
      totalExpEarned: user.totalExpEarned,
      claimDate: today,
    });
  } catch (error) {
    console.error("[daily-wheel] claim failed:", error);
    return err(res, 500, "error.internal", req as any);
  } finally {
    releaseLock();
  }
});

app.post("/api/streak-gift", requireAuth, async (req, res) => {
  const nickname = (req as any).userNick as string;
  const releaseLock = await acquireRewardLock(nickname);
  try {
    const milestone = Number(req.body?.milestone);
    const earnedPoints = STREAK_GIFT_REWARDS[milestone];
    if (!Number.isSafeInteger(milestone) || earnedPoints === undefined) {
      return res.status(400).json({ success: false, message: "Mốc streak không hợp lệ." });
    }

    const user = await getUser(nickname);
    if (!user) return err(res, 404, "error.notFound", req as any);
    if (!pointEligibility(user).canEarnPoints) {
      return res.status(403).json({
        success: false,
        code: "profile_verification_required",
        message: "Hồ sơ cần được xác minh trước khi nhận điểm.",
      });
    }
    const progress = (await getGameProgress(nickname)) ?? user.progress;
    if ((progress?.streakDays || 0) < milestone) {
      return res.status(403).json({ success: false, message: "Bạn chưa đạt mốc streak này." });
    }

    const claimed = user.claimedStreakGifts ?? [];
    if (claimed.includes(milestone)) {
      return res.json({
        success: true,
        duplicate: true,
        earnedPoints: 0,
        points: user.points,
        totalExpEarned: user.totalExpEarned,
      });
    }

    applyEarnedPoints(user, earnedPoints);
    user.claimedStreakGifts = [...claimed, milestone].sort((a, b) => a - b);
    await saveUser(user);

    await Promise.allSettled([
      eventLogger.logReward(user.account_id, earnedPoints, 0, `streak_gift_${milestone}`),
      logRewardTransaction(user.account_id, "earn", earnedPoints, {
        reason: `streak_gift_${milestone}`,
        source: "streak_gift",
        pointsBalance: user.points,
      }),
    ]);

    return res.json({
      success: true,
      earnedPoints,
      points: user.points,
      totalExpEarned: user.totalExpEarned,
    });
  } catch (error) {
    console.error("[streak-gift] claim failed:", error);
    return err(res, 500, "error.internal", req as any);
  } finally {
    releaseLock();
  }
});

app.post("/api/reward", requireAuth, async (req, res) => {
  let reservation: RewardReservation | null = null;
  const rewardNickname = (req as any).userNick as string;
  const releaseRewardLock = await acquireRewardLock(rewardNickname);
  try {
    // Layer 2.3 — the recipient is the authenticated user. We reject any
    // client-supplied nickname; an admin-issued reward should use the
    // dedicated /api/admin endpoints.
    const nickname = rewardNickname;
    const claim = resolveGameplayRewardClaim(req.body);
    if (!claim) {
      return res.status(400).json({
        success: false,
        message: "Yêu cầu thưởng không hợp lệ. Điểm thưởng do máy chủ quyết định.",
      });
    }
    const user = await getUser(nickname);
    if (user) {
      if (claim.points > 0 && !pointEligibility(user).canEarnPoints) {
        return res.status(403).json({
          success: false,
          code: "profile_verification_required",
          message: "Hồ sơ cần được xác minh trước khi nhận điểm.",
        });
      }
      const today = getVietnamDayKey();
      if (user.gameplayRewardDates?.[claim.dailyScope] === today) {
        return res.json({ success: true, duplicate: true, points: user.points, earnedPoints: 0 });
      }

      // The client reports an activity; its point value is resolved from the
      // shared server policy above and cannot be selected by the request.
      const decision = reserveReward({
        nick: nickname,
        points: claim.points,
        action: claim.action,
        reason: claim.reason,
        idempotencyKey: `${nickname.toLowerCase()}:${claim.dailyScope}:${today}`,
      });
      if (decision.duplicate) {
        return res.json({ success: true, duplicate: true, points: user.points, earnedPoints: 0 });
      }
      reservation = decision;

      // Calculate streak multiplier for positive rewards
      let effectivePoints = claim.points;
      let effectiveMultiplier = 1;
      let adaptiveMessage = "";
      if (claim.points > 0) {
        const progress = (await getGameProgress(nickname)) ?? user.progress;
        const streakDays = progress?.streakDays || 1;
        effectiveMultiplier = Math.min(1 + (streakDays - 1) * 0.1, 2); // max 2x
        effectivePoints = Math.round(claim.points * effectiveMultiplier);

        // Research: Adaptive reward based on behavioral profile
        if (isDbConnected()) {
          try {
            const adaptiveResult = await adaptiveRewardEngine.computeReward(
              user.account_id,
              claim.points,
              claim.reason,
            );
            if (adaptiveResult.bonusPoints > 0) {
              effectivePoints += adaptiveResult.bonusPoints;
              effectiveMultiplier = adaptiveResult.multiplier;
              adaptiveMessage = adaptiveResult.message;
            }
          } catch (e) {
            console.warn("[AdaptiveReward] computeReward failed:", e);
          }
        }
      }
      if (effectivePoints < 0 && (user.points || 0) + effectivePoints < 0) {
        rollbackReward(reservation);
        reservation = null;
        return res.status(409).json({ success: false, message: "Không đủ điểm." });
      }
      if (effectivePoints > 0) applyEarnedPoints(user, effectivePoints);
      else applyPointDelta(user, effectivePoints);
      user.gameplayRewardDates = {
        ...(user.gameplayRewardDates ?? {}),
        [claim.dailyScope]: today,
      };
      await saveUser(user);
      commitReward(reservation);
      reservation = null;

      if (db) {
        try {
          await db
            .collection("users")
            .doc(nickname.toLowerCase())
            .collection("reward_history")
            .add({
              timestamp: new Date().toISOString(),
              reason: claim.reason,
              pointsAdded: effectivePoints,
              originalPoints: claim.points,
              streakMultiplier: effectiveMultiplier,
            });
        } catch (e) {
          console.warn("[reward] reward history write failed:", (e as Error).message);
        }
      }

      // Research telemetry is best-effort. The balance has already been
      // persisted and must not be reported as a failed reward if telemetry is
      // temporarily unavailable.
      await Promise.allSettled([
        eventLogger.logReward(user.account_id, effectivePoints, 0, claim.reason),
        logRewardTransaction(
          user.account_id,
          effectivePoints > 0 ? "earn" : "spend",
          effectivePoints,
          {
            reason: claim.reason,
            source: claim.action,
            multiplier: effectiveMultiplier,
            pointsBalance: user.points,
          },
        ),
      ]);

      writeGoogleSheetsLog(
        "1xqrjBMynOYuqGbvmBbuEHXFWZT0ZpwQE6Uy2N7tkr-Q",
        nickname,
        claim.reason,
        effectivePoints,
      );
      res.json({
        success: true,
        points: user.points,
        totalExpEarned: user.totalExpEarned,
        earnedPoints: effectivePoints,
        multiplier: effectiveMultiplier,
        adaptiveMessage: adaptiveMessage || undefined,
      });
    } else {
      err(res, 404, "error.notFound", req as any);
    }
  } catch (error) {
    if (reservation) rollbackReward(reservation);
    const message = error instanceof Error ? error.message : "reward rejected";
    if (/budget|cap|points|integer|authenticated|action/i.test(message)) {
      return res.status(400).json({ success: false, message });
    }
    err(res, 500, "error.internal", req as any);
  } finally {
    releaseRewardLock();
  }
});

app.post("/api/change-name", requireAuth, async (req, res) => {
  // Layer 2.3 — you can only change your own display name.
  const cn_nickname = (req as any).userNick as string;
  const { cn_newname, cn_password } = req.body ?? {};
  const newName = (cn_newname || "").trim();

  if (!newName) {
    res.json({ success: false, message: "Tên hiển thị không được để trống!" });
    return;
  }

  const user = await getUser(cn_nickname);
  if (user) {
    // Layer 2.1 — verify with bcrypt; auto-migrate plaintext → bcrypt.
    const ok = await verifyPassword(cn_password, user.pass);
    if (ok) {
      user.name = newName;
      // Best-effort migration of the password hash if it was plaintext.
      if (!isLikelyHash(user.pass)) {
        try {
          user.pass = await hashPassword(cn_password);
        } catch (e) {
          console.warn("[change-name] bcrypt migration failed:", e?.message || e);
        }
      }
      await saveUser(user);
      res.json({
        success: true,
        message: "Đổi tên hiển thị thành công!",
        newName,
      });
    } else {
      res.json({ success: false, message: "Mật khẩu xác nhận không đúng!" });
    }
  } else {
    res.json({ success: false, message: "Không tìm thấy tài khoản!" });
  }
});

// Update profile metadata (full name + class grade) for existing users.
// Used by the in-app profile-completion popup so legacy users can fill in
// the new profile fields without re-registering.
app.post("/api/profile/meta", requireAuth, async (req, res) => {
  // Layer 2.3 — only allow updating YOUR OWN profile metadata. The
  // client-supplied `nickname` is ignored in favour of the token's nick.
  const nickname = (req as any).userNick as string;
  const { full_name, class_id } = req.body ?? {};
  const nick = nickname.trim();

  if (!nick) {
    return res.status(400).json({ success: false, message: "Thiếu tên tài khoản." });
  }
  const cleanedFullName = normalizeStudentName(full_name);
  const cleanedClassId = String(class_id || "")
    .trim()
    .toLowerCase();
  if (cleanedFullName.length < 2 || cleanedFullName.length > 100) {
    return res.status(400).json({ success: false, message: "Họ tên phải dài từ 2 đến 100 ký tự." });
  }
  const schoolClass = await findActiveSchoolClass(cleanedClassId).catch(() => null);
  if (!schoolClass) {
    return res
      .status(400)
      .json({ success: false, message: "Vui lòng chọn một lớp đang hoạt động." });
  }

  try {
    const user = await getUser(nick);
    if (!user) {
      return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản." });
    }
    user.fullName = cleanedFullName;
    user.classId = schoolClass.id;
    user.classGrade = schoolClass.name;
    user.profileVerificationStatus = isGradeEightClass(schoolClass.name) ? "pending" : "unverified";
    user.profileUpdatedAt = Date.now();
    delete user.profileVerifiedAt;
    delete user.profileVerifiedBy;
    delete user.profileRejectionReason;
    if (isProfileVerificationStoreConfigured()) {
      const verificationSaved = await syncProfileVerification({
        accountId: user.account_id,
        fullName: user.fullName,
        classId: user.classId,
        classGrade: user.classGrade,
        status: user.profileVerificationStatus || "unverified",
        submittedAt: user.profileUpdatedAt,
      });
      if (!verificationSaved) {
        return res
          .status(503)
          .json({ success: false, message: "Không thể lưu hồ sơ xác minh lúc này." });
      }
    }
    await saveUser(user);

    runInBackground("profile-meta-research", async () => {
      await syncUserResearchProfile(user);
    });

    return res.json({
      success: true,
      message: "Đã cập nhật hồ sơ.",
      full_name: user.fullName || null,
      class_grade: user.classGrade || null,
      class_id: user.classId || null,
      profile_complete: true,
      ...publicProfileStatus(user),
    });
  } catch (e) {
    console.error("[profile/meta] error:", (e as Error).message);
    return res.status(500).json({ success: false, message: "Lỗi server." });
  }
});

app.post("/api/profile/meta/skip", requireAuth, async (req, res) => {
  const nickname = (req as typeof req & { userNick?: string }).userNick || "";
  try {
    const user = await getUser(nickname);
    if (!user)
      return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản." });
    user.profileVerificationStatus = "skipped";
    user.profileUpdatedAt = Date.now();
    delete user.profileVerifiedAt;
    delete user.profileVerifiedBy;
    delete user.profileRejectionReason;
    if (isProfileVerificationStoreConfigured()) {
      const verificationSaved = await syncProfileVerification({
        accountId: user.account_id,
        fullName: user.fullName,
        classId: user.classId,
        classGrade: user.classGrade,
        status: "skipped",
        submittedAt: user.profileUpdatedAt,
      });
      if (!verificationSaved) {
        return res
          .status(503)
          .json({ success: false, message: "Không thể lưu lựa chọn lúc này." });
      }
    }
    await saveUser(user);
    runInBackground("profile-skip-research", async () => {
      await syncUserResearchProfile(user);
    });
    return res.json({
      success: true,
      message: "Đã bỏ qua. Bạn có thể hoàn thiện hồ sơ sau.",
      ...publicProfileStatus(user),
    });
  } catch (error) {
    console.error("[profile/meta/skip] error:", error);
    return res.status(500).json({ success: false, message: "Không thể lưu lựa chọn lúc này." });
  }
});

// Update avatar/frame preference
app.post("/api/update-preference", requireAuth, async (req, res) => {
  // Layer 2.3 — only your own preferences.
  const nickname = (req as any).userNick as string;
  const { selectedAvatar, selectedFrame } = req.body ?? {};
  try {
    const user = await getUser(nickname);
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }
    if (selectedAvatar !== undefined) user.selectedAvatar = selectedAvatar || undefined;
    if (selectedFrame !== undefined) user.selectedFrame = selectedFrame || undefined;
    await saveUser(user);
    res.json({ success: true });
  } catch (e) {
    console.error("[update-preference] Error:", e?.message || e);
    res.status(500).json({ success: false });
  }
});

// Preferences used by the language switcher.  This route intentionally
// accepts only a small allow-list and derives the account from the token.
app.patch("/api/users/me/preferences", requireAuth, async (req, res) => {
  const nickname = (req as any).userNick as string;
  const locale = typeof req.body?.locale === "string" ? req.body.locale.trim().toLowerCase() : "";
  const allowedLocales = new Set(["vi", "en", "zh", "es", "fr", "ja", "ko", "id", "ar", "pt"]);
  if (!allowedLocales.has(locale))
    return res.status(400).json({ success: false, error: "Unsupported locale" });
  try {
    const user = await getUser(nickname);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    user.locale = locale;
    user.preferences = { ...(user.preferences || {}), locale };
    await saveUser(user);
    return res.json({ success: true, locale });
  } catch (e) {
    console.error("[preferences] update failed:", e);
    return res.status(500).json({ success: false, error: "Unable to save preferences" });
  }
});

// Update profile (name + avatar + frame) — Layer 2.3 requireAuth + bcrypt-confirmed
app.put("/api/profile", requireAuth, async (req, res) => {
  const {
    nickname: requestedNickname,
    name,
    selectedAvatar,
    selectedFrame,
    customAvatarUrl,
    pass,
  } = req.body ?? {};
  try {
    const authNick = (req as any).userNick as string;
    const authUser = await getUser(authNick);
    if (!authUser)
      return res.status(401).json({ success: false, message: "Phiên đăng nhập không hợp lệ" });
    const nickname =
      typeof requestedNickname === "string" && requestedNickname.trim()
        ? requestedNickname.trim()
        : authNick;

    const targetUser = await getUser(nickname);
    if (!targetUser) {
      return res.json({ success: false, message: "Không tìm thấy tài khoản" });
    }

    if (authNick.toLowerCase() !== nickname.toLowerCase() && authUser.role !== "admin") {
      return res.status(403).json({ success: false, message: "Không có quyền chỉnh sửa" });
    }
    if (typeof pass !== "string" || !(await verifyPassword(pass, authUser.pass))) {
      return res.status(401).json({ success: false, message: "Mật khẩu xác nhận không đúng" });
    }

    if (authNick && authNick !== nickname) {
      const targetAuthUser = await getUser(authNick);
      if (!targetAuthUser || targetAuthUser.role !== "admin") {
        return res.status(403).json({ success: false, message: "Không có quyền chỉnh sửa" });
      }
    }

    if (name !== undefined) {
      const trimmed = (name || "").trim();
      if (!trimmed) return res.json({ success: false, message: "Tên không được để trống" });
      if (trimmed.length > 100)
        return res.status(400).json({ success: false, message: "Tên quá dài" });
      targetUser.name = trimmed;
    }
    if (selectedAvatar !== undefined) {
      if (selectedAvatar && !["av1", "av2", "av3"].includes(String(selectedAvatar))) {
        return res.status(400).json({ success: false, message: "Avatar khong hop le" });
      }
      targetUser.selectedAvatar = selectedAvatar || undefined;
    }
    if (selectedFrame !== undefined) {
      if (selectedFrame && !["fr1", "fr2", "fr3"].includes(String(selectedFrame))) {
        return res.status(400).json({ success: false, message: "Khung khong hop le" });
      }
      targetUser.selectedFrame = selectedFrame || undefined;
    }
    if (customAvatarUrl !== undefined) {
      if (
        customAvatarUrl &&
        (typeof customAvatarUrl !== "string" ||
          !/^https:\/\//i.test(customAvatarUrl) ||
          customAvatarUrl.length > 2048)
      ) {
        return res.status(400).json({ success: false, message: "Avatar URL không hợp lệ" });
      }
      targetUser.customAvatarUrl = customAvatarUrl || undefined;
    }
    await saveUser(targetUser);
    res.json({
      success: true,
      user: {
        name: targetUser.name,
        selectedAvatar: targetUser.selectedAvatar,
        selectedFrame: targetUser.selectedFrame,
        customAvatarUrl: targetUser.customAvatarUrl,
        points: targetUser.points,
      },
    });
  } catch (e) {
    console.error("[profile] Error:", e?.message || e);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// Upload custom avatar from device — works with password-confirmed profile flow
app.post("/api/avatar/upload", requireAuth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(req.file.mimetype)) {
      return res
        .status(400)
        .json({ success: false, message: "Chỉ chấp nhận ảnh JPG, PNG, GIF, WEBP" });
    }

    const fileBytes = req.file.buffer;
    const avatarMagicOk =
      (fileBytes[0] === 0xff && fileBytes[1] === 0xd8) ||
      (fileBytes[0] === 0x89 &&
        fileBytes[1] === 0x50 &&
        fileBytes[2] === 0x4e &&
        fileBytes[3] === 0x47) ||
      fileBytes.subarray(0, 3).toString("ascii") === "GIF" ||
      (fileBytes.subarray(0, 4).toString("ascii") === "RIFF" &&
        fileBytes.subarray(8, 12).toString("ascii") === "WEBP");
    if (!avatarMagicOk)
      return res.status(400).json({ success: false, message: "Nội dung ảnh không hợp lệ" });

    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: "Ảnh tối đa 5MB" });
    }

    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      resource_type: "auto",
      transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
    });

    res.json({ success: true, url: result.secure_url });
  } catch (error) {
    console.error("[avatar/upload] Error:", error);
    res.status(500).json({ success: false, message: "Upload thất bại" });
  }
});

// 3. Leaderboard
app.get("/api/leaderboard", async (req, res) => {
  const allUsers = await getAllUsers();
  const sortedUsers = [...allUsers].sort(
    (a, b) => (b.totalExpEarned ?? b.points) - (a.totalExpEarned ?? a.points),
  );
  const top10 = sortedUsers.slice(0, 10).map((u) => ({
    name: u.name,
    points: u.totalExpEarned ?? u.points,
    spendablePoints: u.points,
    nick: u.nick,
  }));
  res.json(top10);
});

const defaultRewards = [
  {
    id: "1",
    name: "Voucher Fahasa 50.000đ",
    desc: "Đổi điểm kinh nghiệm lấy Voucher giảm giá 50.000đ khi mua sách tại hệ thống Fahasa.",
    cost: 1500,
    ingredients: ["Quà tặng thực tế", "E-Voucher"],
    imageUrl:
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=200&q=80",
    color: "from-blue-500 to-blue-700",
    bgClass: "bg-blue-50",
    borderClass: "border-blue-200 hover:border-blue-400",
  },
  {
    id: "2",
    name: "Bình nước Eco-friendly 500ml",
    desc: "Bình nước bằng tre, gỗ giữ nhiệt, an toàn sức khỏe, giảm rác nhựa.",
    cost: 1000,
    ingredients: ["Giảm rác nhựa", "Giao tận nhà"],
    imageUrl:
      "https://images.unsplash.com/photo-1605651202774-7d573fd3f12d?auto=format&fit=crop&w=200&q=80",
    color: "from-emerald-400 to-green-600",
    bgClass: "bg-emerald-50",
    borderClass: "border-emerald-300 hover:border-emerald-500",
  },
];

async function loadRewardCatalog(): Promise<RewardRecord[]> {
  if (isRewardsDbConfigured()) return listRewards();
  if (process.env.NODE_ENV === "production") {
    throw new Error("Kho quà chưa được cấu hình.");
  }
  return defaultRewards.map((reward) => ({ ...reward, id: String(reward.id) }));
}

function parseAdminReward(
  value: unknown,
): { success: true; reward: RewardRecord } | { success: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { success: false, error: "Reward payload must be an object" };
  }
  const input = value as Record<string, unknown>;
  const id = input.id == null ? crypto.randomUUID() : String(input.id).trim();
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const desc = typeof input.desc === "string" ? input.desc.trim() : "";
  const cost = Number(input.cost);
  const imageUrl = typeof input.imageUrl === "string" ? input.imageUrl.trim() : "";
  const ingredients = Array.isArray(input.ingredients)
    ? input.ingredients.map((item) => String(item).trim()).filter(Boolean)
    : [];

  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) {
    return { success: false, error: "Reward id is invalid" };
  }
  if (name.length < 2 || name.length > 120) {
    return { success: false, error: "Reward name must contain 2-120 characters" };
  }
  if (desc.length > 1_000) {
    return { success: false, error: "Reward description is too long" };
  }
  if (!Number.isInteger(cost) || cost < 1 || cost > 1_000_000) {
    return { success: false, error: "Reward cost must be an integer between 1 and 1000000" };
  }
  if (ingredients.length > 12 || ingredients.some((item) => item.length > 80)) {
    return { success: false, error: "Reward ingredients are invalid" };
  }
  if (imageUrl && (!/^https:\/\//i.test(imageUrl) || imageUrl.length > 2_048)) {
    return { success: false, error: "Reward image must be a valid HTTPS URL" };
  }

  const shortStyle = (key: string) =>
    typeof input[key] === "string" ? String(input[key]).trim().slice(0, 160) : "";
  return {
    success: true,
    reward: {
      id,
      name,
      desc,
      cost,
      ingredients,
      imageUrl,
      color: shortStyle("color"),
      bgClass: shortStyle("bgClass"),
      borderClass: shortStyle("borderClass"),
    },
  };
}

app.get("/api/rewards", async (req, res) => {
  try {
    if (isRewardsDbConfigured()) {
      try {
        const rewards = await loadRewardCatalog();
        if (rewards.length === 0) {
          for (const rw of defaultRewards) {
            await upsertReward({
              id: rw.id.toString(),
              name: rw.name,
              desc: rw.desc,
              cost: rw.cost,
              ingredients: rw.ingredients || [],
              imageUrl: rw.imageUrl,
              color: rw.color,
              bgClass: rw.bgClass,
              borderClass: rw.borderClass,
            });
          }
          return res.json(defaultRewards);
        }

        return res.json(rewards);
      } catch (dbError) {
        console.error("[rewards:get] Supabase error:", dbError);
        return res.status(503).json({ error: "Kho quà tạm thời không khả dụng." });
      }
    }
    if (process.env.NODE_ENV === "production") {
      return res.status(503).json({ error: "Kho quà chưa được cấu hình." });
    }
    res.setHeader("X-BMO-Data-Source", "development-defaults");
    res.json(defaultRewards);
  } catch (e) {
    console.error("[rewards:get] Error:", e);
    res.status(503).json({ error: "Kho quà tạm thời không khả dụng." });
  }
});

function redemptionErrorStatus(error: unknown): number {
  if (!(error instanceof RedemptionError)) return 500;
  if (error.code === "user_not_found" || error.code === "redemption_not_found") return 404;
  if (error.code === "insufficient_points" || error.code === "invalid_transition") return 409;
  return 503;
}

app.post("/api/redemptions", requireAuth, requireCompleteProfile, async (req, res) => {
  const nickname = (req as any).userNick as string;
  const rewardId = String(req.body?.rewardId ?? "").trim();
  const idempotencyKey = String(
    req.headers["idempotency-key"] ?? req.body?.idempotencyKey ?? "",
  ).trim();
  if (!/^[A-Za-z0-9:_-]{8,160}$/.test(idempotencyKey)) {
    return res.status(400).json({ error: "Thiếu mã giao dịch hợp lệ." });
  }
  const parsedRecipient = parseRedeemInfo(req.body?.recipient);
  if (!parsedRecipient.success) {
    return res.status(400).json({ error: parsedRecipient.message });
  }
  try {
    const [user, rewards] = await Promise.all([getUser(nickname), loadRewardCatalog()]);
    if (!user) return res.status(404).json({ error: "Không tìm thấy tài khoản." });
    const reward = rewards.find((candidate) => String(candidate.id) === rewardId);
    if (!reward || !Number.isInteger(reward.cost) || reward.cost <= 0) {
      return res.status(400).json({ error: "Phần thưởng không hợp lệ." });
    }
    const outcome = await createRedemption({
      ownerId: user.account_id,
      ownerNick: user.nick,
      reward,
      recipient: parsedRecipient.data,
      idempotencyKey,
    });
    if (outcome.created) {
      runInBackground("redemption-email", async () => {
        await sendCraftEmail(user, reward.id, reward.name, parsedRecipient.data);
      });
    }
    return res.status(outcome.created ? 201 : 200).json({
      success: true,
      created: outcome.created,
      redemption: outcome.redemption,
      points: outcome.balance,
    });
  } catch (error) {
    console.error("[redemptions:create]", error);
    return res.status(redemptionErrorStatus(error)).json({
      error: error instanceof Error ? error.message : "Không thể đổi quà lúc này.",
    });
  }
});

app.get("/api/redemptions", requireAuth, async (req, res) => {
  try {
    const user = await getUser((req as any).userNick as string);
    if (!user) return res.status(404).json({ error: "Không tìm thấy tài khoản." });
    res.json({ redemptions: await listRedemptions(user.account_id) });
  } catch (error) {
    res.status(redemptionErrorStatus(error)).json({
      error: error instanceof Error ? error.message : "Không thể tải lịch sử đổi quà.",
    });
  }
});

app.get("/api/admin/redemptions", requireAdmin, async (_req, res) => {
  try {
    res.json({ redemptions: await listRedemptions() });
  } catch (error) {
    res.status(redemptionErrorStatus(error)).json({ error: (error as Error).message });
  }
});

app.patch("/api/admin/redemptions/:id/status", requireAdmin, async (req, res) => {
  const status = String(req.body?.status ?? "") as RedemptionStatus;
  if (!["approved", "fulfilled", "cancelled"].includes(status)) {
    return res.status(400).json({ error: "Trạng thái đơn không hợp lệ." });
  }
  try {
    res.json({ redemption: await updateRedemptionStatus(getRouteParam(req.params.id), status) });
  } catch (error) {
    res.status(redemptionErrorStatus(error)).json({ error: (error as Error).message });
  }
});

app.get("/api/notifications", requireAuth, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Dịch vụ thông báo chưa sẵn sàng." });
  const userId = String((req as any).userId || "");
  const snapshot = await db
    .collection("notifications")
    .where("userId", "==", userId)
    .limit(100)
    .get();
  const notifications = snapshot.docs
    .map((document) => document.data())
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  res.json({ notifications });
});

app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Dịch vụ thông báo chưa sẵn sàng." });
  const ref = db.collection("notifications").doc(getRouteParam(req.params.id));
  await db
    .runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists || snapshot.data()?.userId !== (req as any).userId) {
        throw new Error("NOTIFICATION_NOT_FOUND");
      }
      transaction.update(ref, { readAt: Date.now() });
    })
    .catch((error) => {
      if ((error as Error).message !== "NOTIFICATION_NOT_FOUND") throw error;
    });
  const snapshot = await ref.get();
  if (!snapshot.exists || snapshot.data()?.userId !== (req as any).userId) {
    return res.status(404).json({ error: "Không tìm thấy thông báo." });
  }
  res.json({ notification: snapshot.data() });
});

app.post("/api/rewards", requireAdmin, async (req, res) => {
  try {
    if (!isRewardsDbConfigured()) {
      return res.status(503).json({ success: false, error: "Rewards database unavailable" });
    }

    const parsed = parseAdminReward(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error });
    }
    const savedReward = await upsertReward(parsed.reward);

    res.json({ success: true, reward: savedReward });
  } catch (e) {
    console.error("[rewards:post] Error:", e);
    res.status(500).json({ success: false, error: "Failed to save reward" });
  }
});

// ─── Card Fusion: combine 3 copies → upgraded version ────────────────────────
app.post("/api/cards/fuse", requireAuth, async (req, res) => {
  const nickname = (req as any).userNick as string;
  const releaseLock = await acquireRewardLock(nickname);
  try {
    // Layer 2.3 — you can only fuse cards you own.
    const cardId = parseCardId(req.body?.cardId);
    if (cardId === null) {
      return res.status(400).json({ success: false, error: "Invalid card ID" });
    }

    const progress = await getGameProgress(nickname);
    const user = await getUser(nickname);
    if (!user || !progress) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    if (!pointEligibility(user).canEarnPoints) {
      return res.status(403).json({
        success: false,
        code: "profile_verification_required",
        error: "Hồ sơ cần được xác minh trước khi nhận điểm.",
      });
    }

    const count = progress.flashcardCounts?.[String(cardId)] || 0;
    if (count < 3) {
      return res
        .status(400)
        .json({ success: false, error: `Cần 3 thẻ để hợp nhất. Bạn hiện có ${count}.` });
    }

    // Consume 3 copies
    progress.flashcardCounts[String(cardId)] = count - 3;
    if (progress.flashcardCounts[String(cardId)] <= 0) {
      delete progress.flashcardCounts[String(cardId)];
      progress.flashcardsRead = progress.flashcardsRead.filter((id) => id !== cardId);
    }

    // Award bonus XP equivalent
    const serverCard = generateServerCard(cardId);
    const xpReward = Math.floor((serverCard.atk + serverCard.hp) * 2);
    applyEarnedPoints(user, xpReward);

    await saveUserAndProgress(nickname, user, progress);

    res.json({
      success: true,
      xpGained: xpReward,
      cardId,
      remainingCount: progress.flashcardCounts?.[String(cardId)] || 0,
      message: `Hợp nhất thành công! Nhận +${xpReward} EXP.`,
    });
  } catch (e) {
    console.error("[cards:fuse] Error:", e);
    res.status(500).json({ success: false, error: "Fusion failed" });
  } finally {
    releaseLock();
  }
});

// ─── Card Level Up: spend XP to level up owned cards ─────────────────────────
app.post("/api/cards/levelup", requireAuth, async (req, res) => {
  const nickname = (req as any).userNick as string;
  const releaseLock = await acquireRewardLock(nickname);
  try {
    // Layer 2.3 — you can only level up cards you own.
    const cardId = parseCardId(req.body?.cardId);
    if (cardId === null) {
      return res.status(400).json({ success: false, error: "Invalid card ID" });
    }

    const progress = await getGameProgress(nickname);
    const user = await getUser(nickname);
    if (!user || !progress) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const count = progress.flashcardCounts?.[String(cardId)] || 0;
    if (count < 1) {
      return res.status(400).json({ success: false, error: "Bạn không sở hữu thẻ này." });
    }

    // Get or init card levels
    const cardLevels: Record<string, number> = progress.cardLevels || {};
    const currentLevel = cardLevels[String(cardId)] || 1;
    if (currentLevel >= 20) {
      return res.status(409).json({ success: false, error: "Thẻ đã đạt cấp tối đa." });
    }
    const nextLevel = currentLevel + 1;
    const xpCost = nextLevel * nextLevel * 30; // 120, 270, 480, 750...

    if ((user.points || 0) < xpCost) {
      return res.status(400).json({
        success: false,
        error: `Cần ${xpCost} EXP để lên cấp ${nextLevel}. Bạn chỉ có ${user.points}.`,
      });
    }

    user.points -= xpCost;
    cardLevels[String(cardId)] = nextLevel;
    progress.cardLevels = cardLevels;

    await saveUserAndProgress(nickname, user, progress);

    const serverCard = generateServerCard(cardId);
    const newAtk = Math.floor(serverCard.atk * (1 + (nextLevel - 1) * 0.15));
    const newHp = Math.floor(serverCard.hp * (1 + (nextLevel - 1) * 0.15));

    res.json({
      success: true,
      cardId,
      newLevel: nextLevel,
      xpCost,
      newAtk,
      newHp,
      remainingPoints: user.points,
    });
  } catch (e) {
    console.error("[cards:levelup] Error:", e);
    res.status(500).json({ success: false, error: "Level up failed" });
  } finally {
    releaseLock();
  }
});

// ─── Shard purchase ───────────────────────────────────────────────────────────
app.post("/api/shards/purchase", requireAuth, async (req, res) => {
  const nickname = (req as any).userNick as string;
  const releaseLock = await acquireRewardLock(nickname);
  try {
    // Layer 2.3 — purchases are debited to the authenticated user.
    const { itemId } = req.body ?? {};
    if (!itemId) {
      return res.status(400).json({ success: false, error: "Missing fields" });
    }

    const progress = await getGameProgress(nickname);
    const user = await getUser(nickname);
    if (!user || !progress) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const cost = SHARD_ITEM_COSTS[itemId];
    if (!cost) {
      return res.status(400).json({ success: false, error: "Item not found" });
    }

    const currentShards = progress.shards || 0;
    if (currentShards < cost) {
      return res
        .status(400)
        .json({ success: false, error: `Need ${cost} shards. You have ${currentShards}.` });
    }

    if (itemId.startsWith("xp_") && !pointEligibility(user).canEarnPoints) {
      return res.status(403).json({
        success: false,
        code: "profile_verification_required",
        error: "Hồ sơ cần được xác minh trước khi nhận điểm.",
      });
    }
    progress.shards = currentShards - cost;

    // Handle XP boost — add directly to user points
    if (itemId.startsWith("xp_")) {
      const def = SHARD_XP_REWARDS[itemId as keyof typeof SHARD_XP_REWARDS];
      const xpBonus = def?.xpBonus || 0;
      applyEarnedPoints(user, xpBonus);
      await saveUserAndProgress(nickname, user, progress);
      return res.json({
        success: true,
        shardsRemaining: progress.shards,
        xpAwarded: xpBonus,
        remainingPoints: user.points,
      });
    }

    // Handle card purchase
    const cardDef = SHARD_CARD_REWARDS[itemId as keyof typeof SHARD_CARD_REWARDS];
    if (cardDef) {
      const cardId = cardDef.cardId;
      const serverCard = generateServerCard(cardId);
      const isNew = !progress.flashcardsRead.includes(cardId);
      progress.flashcardCounts = progress.flashcardCounts || {};
      progress.flashcardCounts[String(cardId)] =
        (progress.flashcardCounts[String(cardId)] || 0) + 1;
      if (isNew) {
        progress.flashcardsRead.push(cardId);
      }
      await saveUserAndProgress(nickname, user, progress);
      return res.json({
        success: true,
        shardsRemaining: progress.shards,
        card: serverCard,
        isNew,
      });
    }

    res.status(400).json({ success: false, error: "Unhandled item type" });
  } catch (e) {
    console.error("[shards:purchase] Error:", e);
    res.status(500).json({ success: false, error: "Purchase failed" });
  } finally {
    releaseLock();
  }
});

// ─── Get card levels ─────────────────────────────────────────────────────────
app.get("/api/cards/levels/:nickname", requireAuth, async (req, res) => {
  try {
    const progress = await getGameProgress((req as any).userNick as string);
    const levels: Record<string, number> = progress?.cardLevels || {};
    res.json({ levels });
  } catch (e) {
    console.error("[cards:levels] Error:", e);
    res.status(500).json({ levels: {} });
  }
});

// ─── Multi-card gacha pull ───────────────────────────────────────────────────
// POST /api/cards/gacha-pull { nickname, count }
// Returns an array of resolved cards (max 10) with isNew + shardsAwarded flags.
app.post("/api/cards/gacha-pull", requireAuth, async (req, res) => {
  const nickname = (req as any).userNick as string;
  const releaseLock = await acquireRewardLock(nickname);
  try {
    const { count: rawCount } = req.body ?? {};
    const count = Math.max(1, Math.min(10, Number.parseInt(String(rawCount ?? 1), 10) || 1));
    const pullCost = count * 5;

    const user = await getUser(nickname);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    if ((user.points || 0) < pullCost) {
      return res.status(409).json({ success: false, error: "Không đủ EXP để mở gói thẻ." });
    }

    const progress: GameProgress = (await getGameProgress(nickname)) ?? {
      flashcardsRead: [],
      flashcardCounts: {},
      flashcardNames: {},
      checkins: [],
      traded: [],
      crafted: [],
      purchased: [],
      challengesCompleted: [],
      guildDonated: false,
      lastUpdateDate: getVietnamDayKey(),
      shards: 0,
    };
    progress.flashcardCounts = progress.flashcardCounts || {};
    progress.flashcardNames = progress.flashcardNames || {};
    if (!Array.isArray(progress.flashcardsRead)) progress.flashcardsRead = [];

    const currentPullCount = progress.gachaPullCount ?? 0;
    const cards: Array<{
      id: number;
      name: string;
      elementId: string;
      elementName: string;
      elementIcon: string;
      rarityId: string;
      rarityName: string;
      hp: number;
      atk: number;
      isNew: boolean;
      shardsAwarded: number;
    }> = [];
    let totalShardsAwarded = 0;

    for (let i = 0; i < count; i++) {
      const pullIdx = currentPullCount + i + 1;
      const pulledCardId = resolveGacha(progress.flashcardsRead, pullIdx);
      const pulledCard = generateServerCard(pulledCardId);
      const isNew = !progress.flashcardsRead.includes(pulledCardId);

      progress.flashcardCounts[String(pulledCardId)] =
        (progress.flashcardCounts[String(pulledCardId)] || 0) + 1;
      if (isNew) progress.flashcardsRead.push(pulledCardId);

      let shardsAwarded = 0;
      if (!isNew) {
        progress.shards = (progress.shards || 0) + 3;
        shardsAwarded = 3;
        totalShardsAwarded += 3;
      }

      cards.push({ ...pulledCard, isNew, shardsAwarded });
    }

    progress.gachaPullCount = currentPullCount + count;
    user.points = Math.max(0, Math.trunc(user.points || 0) - pullCost);
    await saveUserAndProgress(nickname, user, progress);
    await logRewardTransaction(user.account_id, "spend", -pullCost, {
      reason: `Mở gói ${count} thẻ bài`,
      source: "gacha",
      pointsBalance: user.points,
    }).catch((error) => console.warn("[gacha-pull] transaction log failed:", error));

    const cardLevels: Record<string, number> = progress.cardLevels || {};
    const enrichedCards = cards.map((c) => ({ ...c, cardLevel: cardLevels[String(c.id)] || 1 }));

    res.json({
      success: true,
      cards: enrichedCards,
      totalShardsAwarded,
      progress,
      pullCost,
      remainingPoints: user.points,
    });
  } catch (error: any) {
    console.error("[gacha-pull] Error:", error?.message || error);
    res.status(500).json({ success: false, error: "Gacha pull failed" });
  } finally {
    releaseLock();
  }
});

app.delete("/api/rewards/:id", requireAdmin, async (req, res) => {
  try {
    if (!isRewardsDbConfigured()) {
      return res.status(503).json({ success: false, error: "Rewards database unavailable" });
    }

    await deleteRewardById(getRouteParam(req.params.id));
    res.json({ success: true });
  } catch (e) {
    console.error("[rewards:delete] Error:", e);
    res.status(500).json({ success: false, error: "Failed to delete" });
  }
});

app.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const allUsers = await getAllUsers();
    res.json(
      allUsers.map((u) => ({
        name: u.name,
        nick: u.nick,
        points: u.points,
        role: u.role || "user",
        account_id: u.account_id,
      })),
    );
  } catch (e) {
    err(res, 500, "error.internal", req as any);
  }
});

app.post("/api/upload", requireAdmin, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return err(res, 400, "error.scan.noText", req as any);
    }
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    let dataURI = "data:" + req.file.mimetype + ";base64," + b64;

    const result = await cloudinary.uploader.upload(dataURI, {
      resource_type: "auto",
    });

    res.json({ url: result.secure_url });
  } catch (error) {
    console.error("Upload error", error);
    err(res, 500, "error.internal", req as any);
  }
});

// Map Data endpoint
app.get("/api/map-data", async (req, res) => {
  try {
    let usersList: any[] = [];
    let stationsList: any[] = [];
    let barterList: any[] = [];

    if (db) {
      // active users
      try {
        const allUsers = await getAllUsers(); // Ideally based on last active, but let's just grab some users
        usersList = allUsers.slice(0, 5).map((u) => ({
          id: u.account_id,
          name: u.name,
          points: u.points,
          badge: u.points > 100 ? "🌿" : "🌱",
        }));
      } catch (err) {
        console.warn("[map-data] users unavailable:", (err as Error).message);
      }

      // stations
      try {
        const stationsSnap = await db.collection("stations").get();
        stationsList = stationsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      } catch (err) {
        console.warn("[map-data] stations unavailable:", (err as Error).message);
      }

      // barter items
      try {
        const barterSnap = await db.collection("barter").get();
        barterList = barterSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      } catch (err) {
        console.warn("[map-data] barter items unavailable:", (err as Error).message);
      }
    } else {
      const allUsers = await getAllUsers();
      usersList = allUsers
        .slice(0, 5)
        .map((u) => ({ id: u.account_id, name: u.name, points: u.points, badge: "🌱" }));
    }

    res.json({ users: usersList, stations: stationsList, barterItems: barterList });
  } catch (e) {
    res.json({ users: [], stations: [], barterItems: [] });
  }
});

app.get("/api/user/:nick", requireAuth, async (req, res) => {
  const requestedNick = getRouteParam(req.params.nick);
  if (!canAccessUserScope(req, requestedNick)) {
    return res.status(403).json({ message: "Bạn không có quyền xem hồ sơ này." });
  }
  const user = await getUser(requestedNick);
  const progress = await getGameProgress(requestedNick);
  if (user) {
    res.json({
      name: user.name,
      points: user.points,
      totalExpEarned: user.totalExpEarned,
      hasPlayed: user.hasPlayed,
      email: user.email || null,
      fullName: user.fullName || null,
      full_name: user.fullName || null,
      classGrade: user.classGrade || null,
      class_grade: user.classGrade || null,
      classId: user.classId || null,
      class_id: user.classId || null,
      profileComplete: Boolean(user.fullName?.trim() && user.classId),
      progress: progress || user.progress || null,
      selectedAvatar: user.selectedAvatar,
      selectedFrame: user.selectedFrame,
      shards: progress?.shards ?? user.progress?.shards ?? user.shards ?? 0,
      lastWheelClaimDate: user.lastWheelClaimDate || null,
      claimedStreakGifts: user.claimedStreakGifts || [],
      ...publicProfileStatus(user),
    });
  } else {
    res.status(404).json({ message: "Not found" });
  }
});

// User Progress & Guild Progress APIs
app.get("/api/user-progress", requireAuth, async (req, res) => {
  try {
    const nickname = (req as any).userNick as string;
    const user = await getUser(nickname);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    const progress = (await getGameProgress(nickname)) || user.progress || null;
    return res.json({ success: true, progress });
  } catch (error) {
    console.error("[user-progress:get] Error:", error);
    return res.status(500).json({ success: false, error: "Failed to load progress" });
  }
});

app.post("/api/user-progress", requireAuth, requireCompleteProfile, async (req, res) => {
  const nickname = (req as any).userNick as string;
  const releaseLock = await acquireRewardLock(nickname);
  try {
    // Layer 2.3 — progress mutations target the authenticated user.
    const { type, data, redeemInfo, idempotencyKey } = req.body ?? {};
    console.log(`[user-progress] type=${type} data=${data} nickname=${nickname}`);

    // Read progress from dedicated user_progress collection (not users/{nick})
    let progress = await getGameProgress(nickname);
    const user = await getUser(nickname);
    if (!user) {
      console.log(`[user-progress] User not found: ${nickname}`);
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Fallback to old user.progress if they haven't been migrated yet
    if (!progress && user.progress) {
      progress = user.progress;
    }

    const todayStr = getVietnamDayKey();
    let progressReward = 0;
    let lastProgressDay: string | null = null;
    if (progress?.lastUpdateDate) {
      try {
        lastProgressDay = getVietnamDayKey(progress.lastUpdateDate);
      } catch {
        lastProgressDay = null;
      }
    }

    // Initialize or reset daily progress if it's a new day
    if (!progress || lastProgressDay !== todayStr) {
      let newStreak = 1;
      if (progress && lastProgressDay) {
        const diffDays =
          (Date.parse(`${todayStr}T00:00:00.000Z`) -
            Date.parse(`${lastProgressDay}T00:00:00.000Z`)) /
          (24 * 60 * 60 * 1000);
        if (diffDays === 1) {
          newStreak = (progress.streakDays || 1) + 1;
        }
      }
      progress = {
        flashcardsRead: progress?.flashcardsRead || [],
        flashcardCounts: progress?.flashcardCounts || {},
        flashcardNames: progress?.flashcardNames || {},
        checkins: [],
        traded: progress?.traded || [],
        crafted: progress?.crafted || [],
        purchased: progress?.purchased || [],
        challengesCompleted: [],
        // Guild contribution is a lifetime achievement flag; do not erase it
        // when rolling over the daily challenge progress.
        guildDonated: progress?.guildDonated === true,
        streakDays: newStreak,
        lastUpdateDate: todayStr,
        shards: progress?.shards ?? 0,
        cardLevels: progress?.cardLevels || {},
        gachaPullCount: progress?.gachaPullCount ?? 0,
      };
    }

    if (type === "flashcard") {
      return res.status(400).json({
        success: false,
        message: "Use /api/cards/gacha-pull to draw cards.",
      });
    } else if (type === "checkin") {
      if (!progress.checkins.includes(data)) {
        progress.checkins.push(data);
      }
    } else if (type === "trade") {
      if (!progress.traded.includes(data)) {
        progress.traded.push(data);
      }
    } else if (type === "challenge") {
      const challengeId = Number(data);
      const challengeReward = getDailyChallengeReward(challengeId);
      const dailyIds = getDailyChallengeIds(todayStr);
      if (
        !Number.isInteger(challengeId) ||
        challengeReward === null ||
        !dailyIds.includes(challengeId)
      ) {
        return res.status(400).json({ success: false, message: "Thử thách không hợp lệ." });
      }
      const isVerifiedScanChallenge = challengeId === 3;
      const hasVerifiedEvent =
        isVerifiedScanChallenge &&
        (user.scanRewardHistory ?? []).some((entry) => getVietnamDayKey(entry.at) === todayStr);
      if (!hasVerifiedEvent) {
        if (db) {
          await db
            .collection("users")
            .doc(nickname.toLowerCase())
            .collection("self_reported_activities")
            .doc(`${todayStr}_${challengeId}`)
            .set(
              {
                challengeId,
                day: todayStr,
                status: "pending_verification",
                createdAt: Date.now(),
              },
              { merge: true },
            );
        }
        return res.json({
          success: true,
          verificationRequired: true,
          earnedPoints: 0,
          message: isVerifiedScanChallenge
            ? "Hãy hoàn thành một lần quét hợp lệ trước khi nhận thưởng."
            : "Hoạt động đã được ghi nhận và đang chờ xác nhận.",
          progress,
          points: user.points,
          totalExpEarned: user.totalExpEarned,
        });
      }
      if (!progress.challengesCompleted.includes(challengeId)) {
        if (!pointEligibility(user).canEarnPoints) {
          return res.status(403).json({
            success: false,
            code: "profile_verification_required",
            message: "Hồ sơ cần được xác minh trước khi nhận điểm.",
          });
        }
        progress.challengesCompleted.push(challengeId);
        progressReward = challengeReward;
        if (progress.challengesCompleted.length === 3) progressReward += 25;
        applyEarnedPoints(user, progressReward);
      }
    } else if (type === "craft") {
      progress.crafted = progress.crafted || [];
      const parsedRedeemInfo = parseRedeemInfo(redeemInfo);
      if (!parsedRedeemInfo.success) {
        return res.status(400).json({ success: false, message: parsedRedeemInfo.message });
      }
      const normalizedRedeemInfo = parsedRedeemInfo.data;
      const rewardId = String(data ?? "").trim();
      if (db) {
        const requestKey = String(idempotencyKey ?? "").trim();
        if (!/^[A-Za-z0-9:_-]{8,160}$/.test(requestKey)) {
          return res.status(400).json({
            success: false,
            message: "Ứng dụng cũ thiếu mã giao dịch. Vui lòng tải lại trang rồi thử lại.",
          });
        }
        const rewards = await loadRewardCatalog();
        const reward = rewards.find((item) => String(item.id) === rewardId);
        if (!reward) {
          return res.status(400).json({ success: false, message: "Vật phẩm không hợp lệ." });
        }
        const outcome = await createRedemption({
          ownerId: user.account_id,
          ownerNick: user.nick,
          reward,
          recipient: normalizedRedeemInfo,
          idempotencyKey: requestKey,
        });
        if (outcome.created) {
          runInBackground("legacy-redemption-email", async () => {
            await sendCraftEmail(user, reward.id, reward.name, normalizedRedeemInfo);
          });
        }
        const currentProgress = (await getGameProgress(nickname)) ?? progress;
        return res.json({
          success: true,
          progress: currentProgress,
          points: outcome.balance,
          totalExpEarned: user.totalExpEarned,
          redemptionId: outcome.redemption.id,
          status: outcome.redemption.status,
          created: outcome.created,
        });
      }
      if (progress.crafted.some((item) => String(item) === rewardId)) {
        return res.status(409).json({ success: false, message: "Vật phẩm đã được đổi." });
      }
      const configuredRewards = isRewardsDbConfigured() ? await listRewards().catch(() => []) : [];
      const reward = [...configuredRewards, ...defaultRewards].find(
        (item) => String(item.id) === rewardId,
      );
      if (!reward || !Number.isFinite(Number(reward.cost)) || Number(reward.cost) <= 0) {
        return res.status(400).json({ success: false, message: "Vật phẩm không hợp lệ." });
      }
      const craftCost = Math.trunc(Number(reward.cost));
      if ((user.points || 0) < craftCost) {
        return res.status(409).json({ success: false, message: "Không đủ điểm." });
      }
      user.points -= craftCost;
      progress.crafted.push(rewardId);
      const redemptionRequest: RedemptionRequest = {
        id: crypto.randomUUID(),
        itemId: rewardId,
        itemName: String(reward.name || `Quà ID ${rewardId}`).slice(0, 255),
        cost: craftCost,
        recipient: normalizedRedeemInfo,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      user.redemptionRequests = [...(user.redemptionRequests ?? []), redemptionRequest];
      await saveUserAndProgress(nickname, user, progress);
      const craftHistoryWrite = Promise.resolve();
      await Promise.allSettled([
        craftHistoryWrite,
        logRewardTransaction(user.account_id, "spend", -craftCost, {
          reason: `Đổi quà: ${rewardId}`,
          source: "craft",
          pointsBalance: user.points,
        }),
        sendCraftEmail(user, rewardId, redemptionRequest.itemName, normalizedRedeemInfo),
      ]);
      return res.json({
        success: true,
        progress,
        points: user.points,
        totalExpEarned: user.totalExpEarned,
        redemptionId: redemptionRequest.id,
        status: redemptionRequest.status,
      });
    } else if (type === "purchase") {
      progress.purchased = progress.purchased || [];
      const purchaseId = String(data ?? "").trim();
      if (progress.purchased.some((item) => String(item) === purchaseId)) {
        return res.status(409).json({ success: false, message: "Vật phẩm đã được sở hữu." });
      }
      const purchaseCostMap: Record<string, number> = {
        av1: 50,
        av2: 150,
        av3: 300,
        fr1: 100,
        fr2: 200,
        fr3: 500,
      };
      const purchaseCost = purchaseCostMap[purchaseId] || 0;
      if (purchaseCost <= 0) {
        return res.status(400).json({ success: false, message: "Vật phẩm không hợp lệ." });
      }
      if ((user.points || 0) < purchaseCost) {
        return res.status(409).json({ success: false, message: "Không đủ điểm." });
      }
      user.points -= purchaseCost;
      progress.purchased.push(purchaseId);
      await saveUserAndProgress(nickname, user, progress);
      const purchaseHistoryWrite = db
        ? db
            .collection("users")
            .doc(nickname.toLowerCase())
            .collection("purchase_history")
            .add({ timestamp: new Date().toISOString(), purchasedItemId: purchaseId })
        : Promise.resolve();
      await Promise.allSettled([
        purchaseHistoryWrite,
        logRewardTransaction(user.account_id, "spend", -purchaseCost, {
          reason: `Mua vật phẩm: ${purchaseId}`,
          source: "purchase",
          pointsBalance: user.points,
        }),
        sendPurchaseEmail(user, purchaseId),
      ]);
      return res.json({
        success: true,
        progress,
        points: user.points,
        totalExpEarned: user.totalExpEarned,
      });
    } else if (type === "guild_donated") {
      progress.guildDonated = true;
      try {
        if (db) {
          const globalRef = db.collection("global").doc("guild_campaign");
          const globalDoc = await globalRef.get();
          if (globalDoc.exists) {
            await globalRef.update({ progress: FieldValue.increment(10) });
          } else {
            await globalRef.set({ progress: 10 });
          }
        }
      } catch (e) {
        console.error("Guild update local fallback needed", e);
        globalGuildProgress += 10;
      }
    } else {
      return res.status(400).json({ success: false, message: "Unsupported progress type" });
    }

    // Save to dedicated user_progress collection (not users/{nick})
    await saveUserAndProgress(nickname, user, progress);
    console.log(
      `[user-progress] Saved to user_progress/${nickname.toLowerCase()}, flashcardCounts:`,
      JSON.stringify(progress.flashcardCounts || {}),
    );
    res.json({
      success: true,
      progress,
      points: user.points,
      totalExpEarned: user.totalExpEarned,
      earnedPoints: progressReward,
    });
  } catch (error) {
    console.error(`[user-progress] Error:`, error);
    res.status(500).json({ success: false, error: "Failed to update progress" });
  } finally {
    releaseLock();
  }
});

let globalGuildProgress = 380; // memory fallback
app.get("/api/guild-progress", async (req, res) => {
  try {
    let progress = globalGuildProgress;
    if (db) {
      const doc = await db.collection("global").doc("guild_campaign").get();
      if (doc.exists) {
        progress = doc.data()?.progress || 0;
      } else {
        await db.collection("global").doc("guild_campaign").set({ progress });
      }
    }
    res.json({ progress });
  } catch (e) {
    res.json({ progress: globalGuildProgress });
  }
});

// 4. Minigame APIs
app.get("/api/exam/:nick", requireAuth, async (req, res) => {
  const user = await getUser((req as any).userNick as string);

  if (!user) {
    res.json({ status: "ERROR", message: "User not found" });
    return;
  }

  // Date format: DD/MM/YYYY HH:mm:ss
  const parseDateStr = (dateStr: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split(" ");
    if (parts.length !== 2) return null;
    const [datePart, timePart] = parts;
    const [d, m, y] = datePart.split("/");
    const [hr, min, sec] = timePart.split(":");
    return new Date(
      parseInt(y),
      parseInt(m) - 1,
      parseInt(d),
      parseInt(hr),
      parseInt(min),
      parseInt(sec),
    );
  };

  // Try to load latest config and questions from Supabase (with cache)
  if (isQuizDbConfigured()) {
    try {
      const [cfg, qs] = await Promise.all([getQuizConfig(), listQuizQuestions()]);
      if (cfg && Object.keys(cfg).length > 0) {
        Object.assign(dynamicConfig, cfg);
      }
      if (qs && qs.length > 0) {
        dynamicQuestions = qs
          .filter((q) => q.enabled !== false)
          .map((q) => ({
            id: q.question_id,
            content: q.content,
            options: q.options,
            correctKey: q.correct_key,
            points: q.points,
          }));
      }
    } catch (e) {
      console.warn("[exam] Failed to load from Supabase, using in-memory:", (e as Error).message);
    }
  }

  const startDt = parseDateStr(dynamicConfig.ThoiGianBatDau);
  const endDt = parseDateStr(dynamicConfig.ThoiGianKetThuc);
  const now = new Date();

  if (startDt && now < startDt) {
    res.json({
      status: "NOT_YET",
      message: `⏳ Minigame chưa bắt đầu. Thời gian mở: ${dynamicConfig.ThoiGianBatDau}`,
    });
    return;
  }

  if (endDt && now > endDt) {
    res.json({
      status: "CLOSED",
      message: `❌ Minigame đã kết thúc vào: ${dynamicConfig.ThoiGianKetThuc}`,
    });
    return;
  }

  const questionSnapshot: QuizSessionQuestion[] = dynamicQuestions.map((q) => ({
    id: q.id,
    content: q.content,
    options: q.options,
    correctKey: q.correctKey,
    points: q.points,
  }));
  const editionId = buildQuizEditionId(
    questionSnapshot,
    startDt?.getTime() ?? null,
    endDt?.getTime() ?? null,
  );
  const sessionId = buildQuizSessionId(user.account_id, editionId);
  const expiresAt = Math.min(
    endDt?.getTime() ?? Number.POSITIVE_INFINITY,
    Date.now() + 15 * 60 * 1000,
  );
  const quizSession: StoredQuizSession = {
    id: sessionId,
    editionId,
    accountId: user.account_id,
    nickname: user.nick.toLowerCase(),
    questions: questionSnapshot,
    createdAt: Date.now(),
    expiresAt,
    submittedAt: null,
    result: null,
    resultingBalance: null,
  };
  let persistedSession = quizSession;
  if (db) {
    const sessionRef = db.collection("quiz_sessions").doc(sessionId);
    persistedSession = await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(sessionRef);
      if (existing.exists) return existing.data() as StoredQuizSession;
      transaction.create(sessionRef, quizSession);
      return quizSession;
    });
  } else if (!localQuizSessions.has(sessionId)) {
    localQuizSessions.set(sessionId, quizSession);
  } else {
    persistedSession = localQuizSessions.get(sessionId) ?? quizSession;
  }
  if (persistedSession.submittedAt) {
    return res.json({
      status: "PLAYED",
      message: "✅ Bạn đã hoàn thành bài kiểm tra này.",
      result: persistedSession.result,
    });
  }
  res.json({
    status: "OPEN",
    message: "🔥 Minigame bắt đầu!",
    sessionId,
    expiresAt,
    questions: questionSnapshot.map(
      ({ correctKey: _correctKey, points: _points, ...question }) => question,
    ),
    config: dynamicConfig,
  });
});

async function writeGoogleSheetsLog(
  spreadsheetId: string,
  userId: string,
  action: string,
  points: number,
) {
  try {
    const secretRaw =
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!secretRaw) {
      console.warn(`[AutoSync] Cannot write logs to Sheets. Service account is missing.`);
      return;
    }
    const isBase64 = !secretRaw.trim().startsWith("{");
    const serviceAccountStr = isBase64
      ? Buffer.from(secretRaw, "base64").toString("utf8")
      : secretRaw;
    const serviceAccount = JSON.parse(serviceAccountStr);
    const privateKey = serviceAccount.private_key.replace(/\\n/g, "\n");

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: serviceAccount.client_email,
        private_key: privateKey,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth });

    // Formatting Datetime: DD/MM/YYYY HH:mm:ss
    const now = new Date();
    const d = String(now.getDate()).padStart(2, "0");
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const y = now.getFullYear();
    const hr = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const sec = String(now.getSeconds()).padStart(2, "0");
    const timeStr = `${d}/${m}/${y} ${hr}:${min}:${sec}`;

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Logs!A:D",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[timeStr, userId, action, points]],
      },
    });
    console.log(`[Log] Appended to Google Sheets Logs: ${userId} - ${action}`);
  } catch (e: any) {
    console.error("[Log] Error appending to Google Sheets:", e.message);
  }
}

app.post("/api/exam/submit", requireAuth, requireCompleteProfile, async (req, res) => {
  const nickname = (req as any).userNick as string;
  const sessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId.trim() : "";
  const userAnswers = req.body?.userAnswers;
  if (!/^[a-f0-9]{40}$/.test(sessionId)) {
    return res.status(400).json({
      success: false,
      message: "Phiên bài kiểm tra không hợp lệ. Vui lòng tải lại bài.",
    });
  }

  let result: ReturnType<typeof gradeQuizSession>;
  let newTotal = 0;
  let accountId = "";
  let newlySubmitted = false;
  let pointsAwarded = 0;

  try {
    if (db) {
      const sessionRef = db.collection("quiz_sessions").doc(sessionId);
      const userRef = db.collection("users").doc(nickname.toLowerCase());
      const outcome = await db.runTransaction(async (transaction) => {
        const [sessionSnapshot, userSnapshot] = await Promise.all([
          transaction.get(sessionRef),
          transaction.get(userRef),
        ]);
        if (!sessionSnapshot.exists) throw new Error("QUIZ_SESSION_NOT_FOUND");
        if (!userSnapshot.exists) throw new Error("USER_NOT_FOUND");
        const session = sessionSnapshot.data() as StoredQuizSession;
        const storedUser = normalizeUserEconomy(userSnapshot.data() as User);
        if (
          session.nickname !== nickname.toLowerCase() ||
          session.accountId !== storedUser.account_id
        ) {
          throw new Error("QUIZ_SESSION_FORBIDDEN");
        }
        if (session.submittedAt && session.result && session.resultingBalance !== null) {
          return {
            result: session.result,
            newTotal: session.resultingBalance,
            accountId: storedUser.account_id,
            newlySubmitted: false,
            pointsAwarded: Math.max(0, Math.trunc(Number(session.pointsAwarded) || 0)),
          };
        }
        if (session.expiresAt < Date.now()) throw new Error("QUIZ_SESSION_EXPIRED");
        const graded = gradeQuizSession(session.questions, userAnswers);
        const awarded = pointEligibility(storedUser).canEarnPoints ? graded.totalScore : 0;
        const points = storedUser.points + awarded;
        const totalExpEarned = (storedUser.totalExpEarned ?? storedUser.points) + awarded;
        const submittedAt = Date.now();
        transaction.set(userRef, { points, totalExpEarned, hasPlayed: true }, { merge: true });
        transaction.set(
          sessionRef,
          {
            submittedAt,
            result: graded,
            resultingBalance: points,
            pointsAwarded: awarded,
          },
          { merge: true },
        );
        if (awarded > 0) {
          transaction.create(db!.collection("point_transactions").doc(`quiz_${sessionId}`), {
            id: `quiz_${sessionId}`,
            accountId: storedUser.account_id,
            nickname: storedUser.nick,
            type: "earn",
            source: "quiz",
            amount: awarded,
            balanceAfter: points,
            createdAt: submittedAt,
            idempotencyKey: sessionId,
          });
        }
        transaction.create(userRef.collection("exam_history").doc(sessionId), {
          sessionId,
          editionId: session.editionId,
          timestamp: new Date(submittedAt).toISOString(),
          answers: graded.results.map(({ id, choice }) => ({ id, choice })),
          totalScore: graded.totalScore,
          maxScore: graded.maxScore,
          correctCount: graded.correctCount,
        });
        return {
          result: graded,
          newTotal: points,
          accountId: storedUser.account_id,
          newlySubmitted: true,
          pointsAwarded: awarded,
        };
      });
      ({ result, newTotal, accountId, newlySubmitted, pointsAwarded } = outcome);
    } else {
      const releaseLock = await acquireRewardLock(nickname);
      try {
        const session = localQuizSessions.get(sessionId);
        const user = await getUser(nickname);
        if (!session) throw new Error("QUIZ_SESSION_NOT_FOUND");
        if (!user) throw new Error("USER_NOT_FOUND");
        if (session.nickname !== nickname.toLowerCase() || session.accountId !== user.account_id) {
          throw new Error("QUIZ_SESSION_FORBIDDEN");
        }
        if (session.submittedAt && session.result && session.resultingBalance !== null) {
          result = session.result;
          newTotal = session.resultingBalance;
          accountId = user.account_id;
          pointsAwarded = Math.max(0, Math.trunc(Number(session.pointsAwarded) || 0));
        } else {
          if (session.expiresAt < Date.now()) throw new Error("QUIZ_SESSION_EXPIRED");
          result = gradeQuizSession(session.questions, userAnswers);
          pointsAwarded = applyEarnedPoints(user, result.totalScore);
          user.hasPlayed = true;
          await saveUser(user);
          session.submittedAt = Date.now();
          session.result = result;
          session.resultingBalance = user.points;
          session.pointsAwarded = pointsAwarded;
          localQuizSessions.set(sessionId, session);
          newTotal = user.points;
          accountId = user.account_id;
          newlySubmitted = true;
        }
      } finally {
        releaseLock();
      }
    }
  } catch (error) {
    const code = error instanceof Error ? error.message : "QUIZ_SUBMIT_FAILED";
    const messages: Record<string, string> = {
      QUIZ_SESSION_NOT_FOUND: "Không tìm thấy phiên bài kiểm tra. Vui lòng tải lại.",
      QUIZ_SESSION_EXPIRED: "Phiên bài kiểm tra đã hết hạn. Vui lòng bắt đầu lại.",
      QUIZ_SESSION_FORBIDDEN: "Phiên bài kiểm tra không thuộc tài khoản này.",
      USER_NOT_FOUND: "Không tìm thấy tài khoản.",
    };
    return res.status(code === "QUIZ_SESSION_FORBIDDEN" ? 403 : 409).json({
      success: false,
      message: messages[code] ?? "Không thể nộp bài lúc này.",
    });
  }

  if (newlySubmitted) {
    runInBackground("quiz-research-log", async () => {
      await eventLogger.logQuiz(
        accountId,
        true,
        pointsAwarded,
        result.correctCount,
        result.results.length,
      );
      if (pointsAwarded > 0)
        await logRewardTransaction(accountId, "earn", pointsAwarded, {
          reason: "Hoàn thành bài kiểm tra",
          source: "quiz",
          pointsBalance: newTotal,
        });
      await writeGoogleSheetsLog(
        "1xqrjBMynOYuqGbvmBbuEHXFWZT0ZpwQE6Uy2N7tkr-Q",
        nickname,
        "Hoàn thành bài kiểm tra",
        pointsAwarded,
      );
    });
  }

  return res.json({
    success: true,
    alreadySubmitted: !newlySubmitted,
    message:
      pointsAwarded > 0
        ? `Đúng ${result.correctCount}/${result.results.length} câu. Cộng ${pointsAwarded} điểm.`
        : `Đúng ${result.correctCount}/${result.results.length} câu. Hồ sơ cần được xác minh để nhận điểm.`,
    score: result.totalScore,
    earnedPoints: pointsAwarded,
    maxScore: result.maxScore,
    correctCount: result.correctCount,
    results: result.results,
    newTotal,
  });
});

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

// 5. Chat API
app.post("/api/chat", requireAuth, async (req, res) => {
  try {
    const nickname = (req as any).userNick as string;
    const rawMessages = req.body?.messages;
    if (!Array.isArray(rawMessages) || rawMessages.length === 0 || rawMessages.length > 30) {
      return res.status(400).json({ error: "messages must contain 1–30 items" });
    }
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
    for (const item of rawMessages) {
      if (
        !item ||
        (item.role !== "user" && item.role !== "assistant") ||
        typeof item.content !== "string" ||
        item.content.trim().length === 0 ||
        item.content.length > 4000
      ) {
        return res.status(400).json({ error: "Invalid chat message" });
      }
      messages.push({ role: item.role, content: item.content.trim() });
    }

    if (!ai) {
      return res.status(503).json({
        error: "Dịch vụ trò chuyện chưa được cấu hình.",
        code: "chat_provider_unavailable",
      });
    }

    // Research: Get personality mode for personalized system prompt.
    // Layer 2.7 — `personalityEngine.getPersonality(nickname)` runs
    // asynchronously, but `generateContent` was kicked off below on the
    // SAME tick. The AI then used an un-overridden system prompt for
    // fast in-cache personalities. We now `await` so the personality
    // ALWAYS overrides before the request leaves the server.
    let systemInstruction = `Bạn là Robot Siêu Cấp Xanh, một chuyên gia về bảo vệ môi trường, phân loại rác thải. Tính cách của bạn vui vẻ, nhiệt tình, luôn động viên mọi người bảo vệ trái đất. Bạn chỉ tập trung trả lời các câu hỏi liên quan đến phân loại rác, bảo vệ môi trường, sống xanh. Nếu được hỏi ngoài lề, hãy khéo léo lái câu chuyện về bảo vệ môi trường.`;

    if (isDbConnected()) {
      try {
        const mode = await personalityEngine.getPersonality(nickname);
        systemInstruction = personalityEngine.getPrompt(mode);
      } catch (pe) {
        console.warn("[chat] personality lookup failed, using default:", pe?.message);
      }
    }

    const formattedMessages = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    let response: any;
    try {
      response = await Promise.race([
        ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: formattedMessages,
          config: { systemInstruction },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("AI_TIMEOUT")), 30_000),
        ),
      ]);
    } catch (aiErr: any) {
      const isTimeout = aiErr?.message?.includes("AI_TIMEOUT") || aiErr?.name === "AbortError";
      console.error(isTimeout ? "Chat AI timeout:" : "Chat AI error:", aiErr?.message);
      if (!res.headersSent) {
        res.status(isTimeout ? 504 : 500).json({
          error: isTimeout
            ? "AI đang bận. Vui lòng thử lại."
            : "Lỗi AI: " + (aiErr?.message || "Unknown"),
        });
      }
      return;
    }

    if (!res.headersSent) {
      res.json({ message: response?.text || "" });
    }

    // DB writes — fire-and-forget
    if (db) {
      db.collection("users")
        .doc(nickname.toLowerCase())
        .collection("chat_history")
        .add({
          timestamp: new Date().toISOString(),
          userMessage: messages[messages.length - 1].content,
          botResponse: response?.text || "",
        })
        .catch(() => {});
    }
    eventLogger
      .log(nickname, "chat_message", {
        message_length: messages[messages.length - 1].content.length,
      })
      .catch(() => {});
  } catch (error: any) {
    console.error("Unexpected chat error:", error);
    if (!res.headersSent) {
      err(res, 500, "error.internal", req as any);
    }
  }
});

app.get("/api/material-scans", requireAuth, async (req, res) => {
  const ownerId = String((req as any).userId || "");
  const limit = Number(req.query.limit ?? 30);
  const scans = await listMaterialScans(ownerId, Number.isFinite(limit) ? limit : 30);
  res.json({
    scans: scans.map((scan) => ({
      id: scan.id,
      imageUrl: scan.imageUrl,
      analysis: scan.analysis,
      cardPreview: scan.preview,
      cardId: scan.cardId,
      createdAt: scan.createdAt,
      expiresAt: scan.expiresAt,
    })),
  });
});

app.post("/api/material-scans/:scanId/report", requireAuth, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Dịch vụ góp ý chưa sẵn sàng." });
  const scanId = getRouteParam(req.params.scanId);
  const scan = await getMaterialScan(scanId);
  if (!scan) return res.status(404).json({ error: "Không tìm thấy lần quét." });
  if (scan.ownerId !== (req as any).userId) {
    return res.status(403).json({ error: "Lần quét không thuộc tài khoản này." });
  }
  const reason = String(req.body?.reason ?? "").trim();
  const note = String(req.body?.note ?? "").trim();
  if (!reason || reason.length > 80 || note.length > 1000) {
    return res.status(400).json({ error: "Nội dung góp ý không hợp lệ." });
  }
  const id = crypto
    .createHash("sha256")
    .update(`${scan.ownerId}:${scanId}`)
    .digest("hex")
    .slice(0, 40);
  await db.collection("scan_reports").doc(id).set(
    {
      id,
      scanId,
      ownerId: scan.ownerId,
      reason,
      note,
      status: "pending",
      updatedAt: Date.now(),
      createdAt: Date.now(),
    },
    { merge: true },
  );
  res.status(202).json({ success: true, reportId: id });
});

app.post("/api/scan-garbage", requireAuth, requireCompleteProfile, async (req, res) => {
  try {
    const {
      imageBase64: bodyImageBase64,
      image,
      consentToRelease,
      locale,
      geoLat,
      geoLng,
      requestId,
    } = req.body ?? {};
    const nickname = (req as any).userNick as string;
    const accountId = (req as any).userId as string;
    const stableRequestId = typeof requestId === "string" ? requestId.trim() : "";
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        stableRequestId,
      )
    ) {
      return res.status(400).json({
        error: "Thiếu mã lần quét hợp lệ. Vui lòng tải lại trang và thử lại.",
        code: "invalid_scan_request_id",
      });
    }
    const imageBase64 = bodyImageBase64 ?? image;
    if (typeof imageBase64 !== "string" || imageBase64.length === 0) {
      return err(res, 400, "error.scan.noText", req as any);
    }
    const existingScan = await getMaterialScan(stableRequestId);
    if (existingScan) {
      if (existingScan.ownerId !== accountId) {
        return res.status(403).json({ error: "Lần quét không thuộc tài khoản này." });
      }
      const currentUser = await getUser(nickname);
      return res.json({
        analysis: existingScan.analysis.description,
        scan: existingScan.analysis,
        cardPreview: existingScan.preview,
        rewarded: false,
        points: currentUser?.points ?? null,
        pointsEarned: 0,
        rewardAmount: 0,
        rewardReason: "request_replayed",
        rewardCap: getScanRewardConfig(),
        replayed: true,
      });
    }
    const deterministicTestResponse =
      process.env.NODE_ENV === "test" ? process.env.BMO_TEST_SCAN_RESPONSE : undefined;
    if (!ai && !deterministicTestResponse) {
      return res.status(503).json({
        error: "Dịch vụ nhận diện chưa được cấu hình.",
        code: "scan_provider_unavailable",
      });
    }

    const startTime = Date.now();

    // Validate the data URI and decoded bytes before hashing or forwarding the
    // image to a third-party model.  Multer's limit does not apply to JSON.
    const dataUri = imageBase64.match(
      /^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,([A-Za-z0-9+/=\r\n]+)$/i,
    );
    const mimeType = (dataUri?.[1] || "image/jpeg").toLowerCase().replace("jpg", "jpeg");
    const base64Data = dataUri?.[2] || imageBase64;
    if (!/^[A-Za-z0-9+/=\r\n]+$/.test(base64Data) || base64Data.length > 14_000_000) {
      return res.status(400).json({ error: "Ảnh không hợp lệ hoặc vượt quá 10 MB." });
    }
    const imageBytes = Buffer.from(base64Data, "base64");
    if (imageBytes.length === 0 || imageBytes.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: "Ảnh không hợp lệ hoặc vượt quá 10 MB." });
    }
    const isJpeg = imageBytes[0] === 0xff && imageBytes[1] === 0xd8;
    const isPng =
      imageBytes[0] === 0x89 &&
      imageBytes[1] === 0x50 &&
      imageBytes[2] === 0x4e &&
      imageBytes[3] === 0x47;
    const isGif = imageBytes.subarray(0, 3).toString("ascii") === "GIF";
    const isWebp =
      imageBytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      imageBytes.subarray(8, 12).toString("ascii") === "WEBP";
    if (!(isJpeg || isPng || isGif || isWebp)) {
      return res.status(400).json({ error: "Định dạng ảnh không được hỗ trợ." });
    }

    // Compute image hash for dedup + provenance
    const imageHash = DatasetCuratorClass.hashImage(base64Data);

    const scanId = stableRequestId;

    const response = deterministicTestResponse
      ? { text: deterministicTestResponse }
      : await Promise.race([
          ai!.models.generateContent({
            model: "gemini-2.5-flash",
            config: {
              responseMimeType: "application/json",
              responseJsonSchema: MATERIAL_SCAN_RESPONSE_SCHEMA,
            },
            contents: [
              {
                role: "user",
                parts: [
                  { text: MATERIAL_SCAN_PROMPT },
                  { inlineData: { data: base64Data, mimeType } },
                ],
              },
            ],
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    "AI_TIMEOUT: Gemini request timed out after 30s (possibly blocked in Vietnam)",
                  ),
                ),
              30_000,
            ),
          ),
        ]).catch((err: any) => {
          // Ensure we always respond — don't let AI errors cascade
          const isTimeout = err?.message?.includes("AI_TIMEOUT") || err?.name === "AbortError";
          console.error(
            isTimeout ? "Gemini timeout (network blocked?)" : "Gemini error:",
            err?.message,
          );
          res.status(isTimeout ? 504 : 500).json({
            error: isTimeout
              ? "AI đang bận hoặc không thể kết nối. Vui lòng thử lại sau hoặc dùng chế độ Local AI."
              : "Lỗi AI: " + (err?.message || "Unknown"),
          });
          throw err; // rethrow so we skip the rest
        });

    const rawAnalysis = response?.text || "";
    const latencyMs = Date.now() - startTime;
    const scanAnalysis = parseMaterialScanAnalysis(rawAnalysis, scanId);
    const predictedCategory = scanAnalysis.category;
    const categoryLabels: Record<string, string> = {
      plastic: "Nhựa",
      paper: "Giấy",
      glass: "Thủy tinh",
      metal: "Kim loại",
      organic: "Hữu cơ",
      hazard: "Nguy hại",
    };
    const analysis = scanAnalysis.category
      ? `**Phân loại: ${categoryLabels[scanAnalysis.category]}**\n\n${scanAnalysis.description}\n\n**Hướng dẫn xử lý:**\n${scanAnalysis.disposalInstructions}`
      : `**Chưa thể xác thực vật thể**\n\n${scanAnalysis.description}\n\n${scanAnalysis.uncertaintyReason || "Hãy chụp lại ảnh rõ hơn."}`;

    // Gemini's text endpoint does not expose calibrated class probabilities.
    // Keep the legacy numeric field at zero for schema compatibility and mark
    // the provenance explicitly; never fabricate confidence from prose length.
    const confidence = 0;
    const confidenceSource = "unavailable" as const;
    const categorySource = "llm_structured_json" as const;

    // Card images are private product data, separate from the opt-in research
    // dataset. Development can retain the processed data URL in memory; a
    // production card uses Cloudinary and never writes base64 into Firestore.
    const cardImage = scanAnalysis.eligibleForCard
      ? await uploadCardImage(imageBase64, {
          ownerId: accountId,
          scanId,
          category: scanAnalysis.category!,
        })
      : null;
    const cardImageUrl =
      cardImage?.url || (process.env.NODE_ENV === "production" ? null : imageBase64);
    const cardPreview =
      scanAnalysis.eligibleForCard && scanAnalysis.category
        ? makeCardPreview(
            scanId,
            scanAnalysis.objectName,
            scanAnalysis.category,
            cardImageUrl,
            scanAnalysis,
          )
        : null;

    // Persist the verified scan before minting points. If the production
    // database is unavailable, the request fails without changing the balance.
    await saveMaterialScan({
      id: scanId,
      ownerNick: nickname.toLowerCase(),
      ownerId: accountId,
      imageHash,
      imageUrl: cardImageUrl,
      analysis: scanAnalysis,
      preview: cardPreview,
      cardId: null,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    // The request flag is only a user intention.  Release eligibility is
    // determined from the audited consent row, so a forged JSON body cannot
    // place an image into the research dataset.
    let consentGranted = false;
    if (consentToRelease === true) {
      const researchDb = getResearchDb();
      if (researchDb) {
        try {
          const { rows } = await researchDb.query(
            `SELECT 1 FROM dataset_contributors
             WHERE user_id = $1 AND consent_given = TRUE AND revoked_at IS NULL
             LIMIT 1`,
            [accountId],
          );
          consentGranted = rows.length > 0;
        } catch (e) {
          console.warn("[dataset] consent lookup failed; capture disabled:", e);
        }
      }
    }

    // ── D5: Server-authoritative reward ──────────────────────────────────
    // Reward history and balance are committed together. Firestore uses a
    // transaction so retries, duplicate images, restarts and multiple server
    // instances cannot mint points twice.
    const currentUser = scanAnalysis.eligibleForCard ? null : await getUser(nickname);
    const reward = scanAnalysis.eligibleForCard
      ? await creditScanReward(nickname, imageHash, scanAnalysis.category || undefined)
      : {
          awarded: 0,
          reason: "ineligible",
          points: currentUser?.points ?? null,
          accountId: currentUser?.account_id ?? accountId,
        };
    const newPointsBalance = reward.points;
    if (reward.awarded > 0 && newPointsBalance !== null) {
      writeGoogleSheetsLog(
        "1xqrjBMynOYuqGbvmBbuEHXFWZT0ZpwQE6Uy2N7tkr-Q",
        nickname,
        "AI Nhan dien rac",
        reward.awarded,
      );
      if (reward.accountId) {
        logRewardTransaction(reward.accountId, "earn", reward.awarded, {
          reason: "AI nhận diện rác",
          source: "scan",
          pointsBalance: newPointsBalance,
        }).catch(() => {});
      }
    }

    // Send response — points are server-authoritative, client must not add
    // its own +50 on top.
    res.json({
      analysis,
      scan: scanAnalysis,
      cardPreview,
      rewarded: newPointsBalance !== null && reward.awarded > 0,
      points: newPointsBalance,
      pointsEarned: newPointsBalance !== null ? reward.awarded : 0,
      rewardAmount: newPointsBalance !== null ? reward.awarded : 0,
      rewardReason:
        reward.awarded === 0
          ? reward.reason
          : newPointsBalance !== null
            ? reward.reason
            : "credit_failed",
      rewardCap: getScanRewardConfig(),
      aiMetrics: {
        model: "gemini_2.5_flash",
        latencyMs,
        confidence,
        confidenceSource,
        categorySource,
        category: predictedCategory,
      },
    });

    // Log events (non-blocking)
    if (isDbConnected() && predictedCategory) {
      visionPipeline
        .logInference(accountId, "gemini_2.5_flash", latencyMs, confidence, predictedCategory)
        .catch(() => {});
    }
    if (db && nickname) {
      db.collection("users")
        .doc(nickname.toLowerCase())
        .collection("scan_history")
        .add({
          timestamp: new Date().toISOString(),
          analysis,
          pointsEarned: reward.awarded,
          aiModel: "gemini_2.5_flash",
          latencyMs,
          predictedCategory,
          confidenceSource,
          categorySource,
        })
        .catch(() => {});
    }
    if (nickname) {
      eventLogger
        .logGarbageScan(
          nickname,
          scanAnalysis.eligibleForCard,
          predictedCategory || "uncertain",
          undefined,
        )
        .catch(() => {});
    }

    // ── Phase 1: Dataset capture (open science, opt-in) ───────────────────
    // Only kick off if user has explicitly consented via settings toggle.
    if (nickname && consentGranted && predictedCategory) {
      // Fire-and-forget: don't block the response
      (async () => {
        try {
          // 1) Upload image to Cloudinary (anonymized)
          const uploaded = await uploadToDataset(base64Data, {
            userId: accountId,
            scanId,
            category: predictedCategory,
            confidence,
          });

          // 2) Detect lighting + occlusion in parallel
          const [lighting, occlusion] = await Promise.all([
            datasetCurator.detectImageAttribute(imageBase64, "lighting"),
            datasetCurator.detectImageAttribute(imageBase64, "occlusion"),
          ]);

          // 3) Insert into ai_scan_metrics with consent + dataset metadata.
          // No top-k distribution is stored because Gemini did not return
          // logits or calibrated probabilities.
          const researchDb = getResearchDb();
          if (researchDb) {
            await researchDb
              .query(
                `INSERT INTO ai_scan_metrics (
                user_id, model_type, latency_ms, confidence_score, predicted_category,
                image_url, image_hash, lighting_condition, occlusion_level,
                top_k_predictions, consent_to_release, locale, geo_country, dataset_release_status
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending_review')
              RETURNING id`,
                [
                  accountId,
                  "gemini_2.5_flash",
                  latencyMs,
                  confidence,
                  predictedCategory,
                  uploaded?.url || null,
                  imageHash,
                  lighting,
                  occlusion,
                  JSON.stringify([]),
                  true,
                  locale || "vi",
                  null,
                ],
              )
              .catch((err: Error) => console.error("[dataset] insert failed:", err));

            // 5) Upsert contributor row
            await researchDb
              .query(
                `INSERT INTO dataset_contributors (user_id, display_name, consent_given, consent_date, first_contribution_at, last_contribution_at)
               VALUES ($1, $2, TRUE, NOW(), NOW(), NOW())
               ON CONFLICT (user_id) DO UPDATE SET
                 consent_given = TRUE,
                 last_contribution_at = NOW()`,
                [accountId, nickname],
              )
              .catch((err: Error) => console.error("[dataset] contributor upsert failed:", err));
          }
        } catch (err) {
          console.error("[dataset] capture pipeline error:", err);
        }
      })();
    }

    // Scan-reward bookkeeping is complete before the response is sent.
  } catch (error: any) {
    // Only catches truly unexpected errors
    console.error("Unexpected scan error:", error);
    if (!res.headersSent) {
      err(res, 500, "error.internal", req as any);
    }
  }
});

async function syncGoogleSheetsData(spreadsheetId: string) {
  const secretRaw =
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!secretRaw) {
    throw new Error("Service account is not configured");
  }
  const isBase64 = !secretRaw.trim().startsWith("{");
  const serviceAccountStr = isBase64
    ? Buffer.from(secretRaw, "base64").toString("utf8")
    : secretRaw;
  const serviceAccount = JSON.parse(serviceAccountStr);
  const privateKey = serviceAccount.private_key.replace(/\\n/g, "\n");

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: serviceAccount.client_email,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  let totalImported = 0;

  for (const sheet of spreadsheet.data.sheets || []) {
    const sheetName = sheet.properties?.title;
    if (!sheetName) continue;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!A:H`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) continue;

    if (sheetName.toLowerCase().includes("cauhinh")) {
      for (const row of rows) {
        if (!row || row.length < 2) continue;
        const key = row[0];
        const val = row[1];
        if (key) dynamicConfig[key] = val;
      }
      continue;
    }

    if (sheetName.toLowerCase().includes("bocauhoi")) {
      const newQuestions: Question[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 2) continue;
        const stt = parseInt(row[0]) || i;
        if (String(row[0]).includes("STT")) continue;

        newQuestions.push({
          id: stt,
          content: row[1] || "",
          options: [
            { key: "A", text: row[2] || "" },
            { key: "B", text: row[3] || "" },
            { key: "C", text: row[4] || "" },
            { key: "D", text: row[5] || "" },
          ].filter((o) => o.text !== ""),
          correctKey: String(row[6] || "")
            .trim()
            .toUpperCase(),
          points: parseInt(row[7]) || 10,
        });
      }
      if (newQuestions.length > 0) {
        dynamicQuestions = newQuestions;
      }
      continue;
    }

    if (sheetName.toLowerCase().includes("logs")) {
      continue;
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const userId = typeof row[0] === "string" ? row[0].trim() : String(row[0] || "");
      if (userId === "UserID" || userId.includes("Tài khoản") || userId === "") continue;

      const name = row[1];
      const pass = row[2];
      const nick = row[3];
      const points = row[4];
      const played = row[5];

      if (!nick || !pass) continue;

      const existing = await getUser(nick);
      if (existing) {
        // ONLY update name and pass directly in Firestore
        // Do NOT use saveUser here to avoid any risk of overwriting progress
        if (db) {
          try {
            await db
              .collection("users")
              .doc(nick.toLowerCase())
              .update({
                name: name || nick,
                pass: pass,
              });
          } catch (e) {
            console.error(`[sheets-sync] Failed to update ${nick}:`, e);
          }
        } else {
          existing.name = name || nick;
          existing.pass = pass;
          saveData();
        }
      } else {
        try {
          await saveUser(
            {
              name: name || nick,
              nick: nick,
              pass: pass,
              points: parseInt(points) || 0,
              hasPlayed: played === "TRUE" || played === "true",
              account_id: crypto.randomUUID(),
            },
            true,
          );
        } catch (e) {
          console.error(`[sheets-sync] Failed to save new user ${nick}:`, e?.message || e);
        }
      }
      totalImported++;
    }
  }
  return totalImported;
}

// 6. Admin Sheets Sync
app.post("/api/admin/sync-sheets", requireAdmin, async (req, res) => {
  try {
    const { spreadsheetId } = req.body;
    if (!spreadsheetId) {
      return err(res, 400, "error.validationFailed", req as any);
    }

    const totalImported = await syncGoogleSheetsData(spreadsheetId);

    res.json({
      success: true,
      message: `Đã đồng bộ thành công ${totalImported} người dùng từ tất cả các sheet!`,
    });
  } catch (error: any) {
    console.error("Spreadsheet sync error:", error);
    res.status(500).json({ error: error.message || "Failed to sync spreadsheet" });
  }
});

// ─── 7. Admin Management Endpoints ─────────────────────────────────────────────

// GET /api/admin/stats - Overview stats
app.get("/api/admin/stats", requireAdmin, async (_req, res) => {
  try {
    const stats = await getAdminStats();
    const db = getDb();
    if (db && isDbConnected()) {
      try {
        const { rows } = await db.query(`
          SELECT
            COUNT(DISTINCT user_id) FILTER (WHERE last_active > NOW() - INTERVAL '7 days') as active7d,
            COUNT(DISTINCT user_id) FILTER (WHERE last_active > NOW() - INTERVAL '1 day') as active1d,
            COUNT(DISTINCT experiment_id) as experiment_count
          FROM research_users ru
          LEFT JOIN experiment_assignments ea ON ea.user_id = ru.user_id
        `);
        stats.researchActive7d = parseInt(rows[0]?.active7d || "0");
        stats.researchActive1d = parseInt(rows[0]?.active1d || "0");
        stats.experimentCount = parseInt(rows[0]?.experiment_count || "0");
      } catch (e) {
        console.warn("[Admin/Stats] Research stats query failed:", e);
      }
    }
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// PUT /api/admin/users/:nick/role - Change user role
app.put("/api/admin/users/:nick/role", requireAdmin, async (req, res) => {
  try {
    const nick = getRouteParam(req.params.nick);
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) {
      return err(res, 400, "error.validationFailed", req as any);
    }
    const user = await getUser(nick);
    if (!user) return err(res, 404, "error.notFound", req as any);
    user.role = role;
    await saveUser(user);
    res.json({ success: true, message: `Đã đổi role của ${nick} thành ${role}` });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// PUT /api/admin/users/:nick/points - Adjust points
app.put("/api/admin/users/:nick/points", requireAdmin, async (req, res) => {
  try {
    const nick = getRouteParam(req.params.nick);
    const { points, reason } = req.body;
    if (!Number.isSafeInteger(points) || points < 0) {
      return err(res, 400, "error.validationFailed", req as any);
    }
    const result = await commitPointMutation({
      nickname: nick,
      targetBalance: points,
      source: "admin_adjustment",
      reason: String(reason || "Admin adjustment").slice(0, 240),
      idempotencyKey: String(
        req.headers["idempotency-key"] || req.body?.idempotencyKey || crypto.randomUUID(),
      ),
    });
    res.json({ success: true, oldPoints: result.oldPoints, newPoints: result.newPoints });
  } catch (e) {
    if ((e as Error).message === "USER_NOT_FOUND") {
      return err(res, 404, "error.notFound", req as any);
    }
    res.status(500).json({ error: (e as Error).message });
  }
});

// POST /api/admin/users/:nick/adjust-points - Increment/decrement points
app.post("/api/admin/users/:nick/adjust-points", requireAdmin, async (req, res) => {
  try {
    const nick = getRouteParam(req.params.nick);
    const { delta, reason } = req.body;
    if (!Number.isSafeInteger(delta) || Math.abs(delta) > 1_000_000) {
      return err(res, 400, "error.validationFailed", req as any);
    }
    const result = await commitPointMutation({
      nickname: nick,
      delta,
      source: "admin_adjustment",
      reason: String(reason || "Admin adjustment").slice(0, 240),
      idempotencyKey: String(
        req.headers["idempotency-key"] || req.body?.idempotencyKey || crypto.randomUUID(),
      ),
    });
    res.json({
      success: true,
      oldPoints: result.oldPoints,
      delta: result.appliedDelta,
      newPoints: result.newPoints,
    });
  } catch (e) {
    if ((e as Error).message === "USER_NOT_FOUND") {
      return err(res, 404, "error.notFound", req as any);
    }
    res.status(500).json({ error: (e as Error).message });
  }
});

// PUT /api/admin/users/:nick/suspend - Suspend/unsuspend user
app.put("/api/admin/users/:nick/suspend", requireAdmin, async (req, res) => {
  try {
    const nick = getRouteParam(req.params.nick);
    const { suspended } = req.body;
    const user = await getUser(nick);
    if (!user) return err(res, 404, "error.notFound", req as any);
    if (suspended) {
      user.roleBeforeSuspension = user.role === "admin" ? "admin" : "user";
      user.role = "suspended";
      user.disabled = true;
      disableUser(user.nick);
    } else {
      user.role = user.roleBeforeSuspension === "admin" ? "admin" : "user";
      delete user.roleBeforeSuspension;
      user.disabled = false;
      enableUser(user.nick);
    }
    await saveUser(user);
    res.json({ success: true, message: suspended ? `Đã suspend ${nick}` : `Đã unsuspend ${nick}` });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// POST /api/admin/users/:nick/disable - Layer 2.10 — instantly revoke
// every active token for a user. Distinct from /suspend (which just
// flips a role flag in DB): this path also purges their session cache
// so subsequent API calls fail with 401 even before the DB write
// completes. Used by admins to cut off compromised accounts.
app.post("/api/admin/users/:nick/disable", requireAdmin, async (req, res) => {
  try {
    const nick = getRouteParam(req.params.nick);
    if (!nick || typeof nick !== "string" || nick.length > 64) {
      return err(res, 400, "error.validationFailed", req as any);
    }
    const user = await getUser(nick);
    if (!user) return err(res, 404, "error.notFound", req as any);
    disableUser(user.nick);
    user.disabled = true;
    await saveUser(user);
    // Audit log
    try {
      await eventLogger.log(req.body.actor || "admin", "user_disabled", {
        target: nick,
        ts: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("[admin] failed to audit user disable:", (e as Error).message);
    }
    res.json({ success: true, message: `Đã vô hiệu hóa ${nick}` });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// POST /api/admin/users/:nick/enable - Layer 2.10 — re-enable a
// previously disabled user. Note: any tokens that were issued before
// the disable were purged from cache at disable time, so a re-enabled
// user must sign back in once to receive fresh tokens.
app.post("/api/admin/users/:nick/enable", requireAdmin, async (req, res) => {
  try {
    const nick = getRouteParam(req.params.nick);
    if (!nick || typeof nick !== "string" || nick.length > 64) {
      return err(res, 400, "error.validationFailed", req as any);
    }
    const user = await getUser(nick);
    if (!user) return err(res, 404, "error.notFound", req as any);
    enableUser(user.nick);
    user.disabled = false;
    await saveUser(user);
    try {
      await eventLogger.log(req.body.actor || "admin", "user_enabled", { target: nick });
    } catch (e) {
      console.warn("[admin] failed to audit user enable:", (e as Error).message);
    }
    res.json({ success: true, message: `Đã kích hoạt lại ${nick}` });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// POST /api/admin/users/:nick/reset-progress - Reset user progress
app.post("/api/admin/users/:nick/reset-progress", requireAdmin, async (req, res) => {
  try {
    const nick = getRouteParam(req.params.nick);
    const { confirm } = req.query;
    if (confirm !== "true") {
      return err(res, 400, "error.validationFailed", req as any);
    }
    const user = await getUser(nick);
    if (!user) return err(res, 404, "error.notFound", req as any);
    user.points = 0;
    user.totalExpEarned = 0;
    user.hasPlayed = false;
    user.progress = undefined;
    await saveUser(user);
    // Also reset in Firestore
    if (db) {
      try {
        await db.collection("user_progress").doc(nick.toLowerCase()).delete();
      } catch (e) {
        console.warn("[Admin] Firestore reset failed:", e);
      }
    }
    res.json({ success: true, message: `Đã reset tiến độ của ${nick}` });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// DELETE /api/admin/users/:nick - Delete user
app.delete("/api/admin/users/:nick", requireAdmin, async (req, res) => {
  try {
    const nick = getRouteParam(req.params.nick);
    const { confirm } = req.query;
    if (confirm !== "true") {
      return err(res, 400, "error.validationFailed", req as any);
    }
    if (db) {
      await db.collection("users").doc(nick.toLowerCase()).delete();
    }
    // Remove from local array
    users = users.filter((u) => u.nick.toLowerCase() !== nick.toLowerCase());
    saveData();
    res.json({ success: true, message: `Đã xóa người dùng ${nick}` });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// POST /api/admin/decay/:userId/detect - Trigger novelty decay detection manually
app.post("/api/admin/decay/:userId/detect", requireAdmin, async (req, res) => {
  try {
    const userId = getRouteParam(req.params.userId);
    const state = await noveltyDecayDetector.detectDecay(userId);
    res.json({ success: true, decayState: state });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// POST /api/admin/decay/:userId/intervene - Trigger intervention manually
app.post("/api/admin/decay/:userId/intervene", requireAdmin, async (req, res) => {
  try {
    const userId = getRouteParam(req.params.userId);
    const { interventionType } = req.body;
    const interventions = await noveltyDecayDetector.getRecommendedInterventions(userId);
    const intervention = interventions.find((i) => i === interventionType) || interventions[0];
    if (!intervention) {
      return err(res, 404, "error.notFound", req as any);
    }
    const result = await noveltyDecayDetector.triggerIntervention(userId, intervention);
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ─── Quiz Management Endpoints ────────────────────────────────────────

// GET /api/admin/quiz/questions - List all quiz questions
app.get("/api/admin/quiz/questions", requireAdmin, async (_req, res) => {
  try {
    if (!isQuizDbConfigured()) {
      // Fallback to in-memory defaults
      return res.json({ questions: dynamicQuestions, source: "memory" });
    }
    const questions = await listQuizQuestions();
    res.json({ questions, source: "supabase" });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// POST /api/admin/quiz/questions - Create a new quiz question
app.post("/api/admin/quiz/questions", requireAdmin, async (req, res) => {
  try {
    if (!isQuizDbConfigured()) {
      return err(res, 503, "error.databaseUnavailable", req as any);
    }
    const body = req.body || {};
    const adminNick = (req as any).userNick || "admin";
    const nextId = body.question_id || (await getNextQuestionId());

    const newQuestion: QuizQuestion = {
      question_id: nextId,
      content: String(body.content || "").trim(),
      options: Array.isArray(body.options) ? body.options : [],
      correct_key: String(body.correct_key || "A")
        .trim()
        .toUpperCase() as "A" | "B" | "C" | "D",
      points: Number(body.points) || 10,
      category: body.category || undefined,
      difficulty: body.difficulty || undefined,
      enabled: body.enabled !== false,
      image_url: body.image_url || undefined,
      order: Number(body.order) || nextId,
      created_by: adminNick,
    };

    if (!newQuestion.content) {
      return err(res, 400, "error.scan.noText", req as any);
    }
    if (newQuestion.options.length < 2) {
      return err(res, 400, "error.validationFailed", req as any);
    }
    if (!["A", "B", "C", "D"].includes(newQuestion.correct_key)) {
      return err(res, 400, "error.validationFailed", req as any);
    }

    const created = await createQuizQuestion(newQuestion);

    // Refresh in-memory cache
    dynamicQuestions = (await listQuizQuestions()).map((q) => ({
      id: q.question_id,
      content: q.content,
      options: q.options,
      correctKey: q.correct_key,
      points: q.points,
    }));

    await logAdminAction(adminNick, "quiz_create", "quiz_question", String(created.question_id), {
      content: created.content,
    });

    res.json({ success: true, question: created });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// PUT /api/admin/quiz/questions/:id - Update a quiz question
app.put("/api/admin/quiz/questions/:id", requireAdmin, async (req, res) => {
  try {
    if (!isQuizDbConfigured()) {
      return err(res, 503, "error.databaseUnavailable", req as any);
    }
    const questionId = Number(req.params.id);
    if (!Number.isFinite(questionId)) {
      return err(res, 400, "error.validationFailed", req as any);
    }
    const body = req.body || {};
    const adminNick = (req as any).userNick || "admin";

    const updates: Partial<QuizQuestion> = {};
    if (body.content !== undefined) updates.content = String(body.content).trim();
    if (body.options !== undefined) updates.options = body.options;
    if (body.correct_key !== undefined) {
      updates.correct_key = String(body.correct_key).trim().toUpperCase() as "A" | "B" | "C" | "D";
    }
    if (body.points !== undefined) updates.points = Number(body.points) || 10;
    if (body.category !== undefined) updates.category = body.category;
    if (body.difficulty !== undefined) updates.difficulty = body.difficulty;
    if (body.enabled !== undefined) updates.enabled = !!body.enabled;
    if (body.image_url !== undefined) updates.image_url = body.image_url;
    if (body.order !== undefined) updates.order = Number(body.order);

    const updated = await updateQuizQuestion(questionId, updates);
    if (!updated) {
      return err(res, 404, "error.notFound", req as any);
    }

    // Refresh in-memory cache
    dynamicQuestions = (await listQuizQuestions()).map((q) => ({
      id: q.question_id,
      content: q.content,
      options: q.options,
      correctKey: q.correct_key,
      points: q.points,
    }));

    await logAdminAction(adminNick, "quiz_update", "quiz_question", String(questionId), updates);

    res.json({ success: true, question: updated });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// DELETE /api/admin/quiz/questions/:id - Delete a quiz question
app.delete("/api/admin/quiz/questions/:id", requireAdmin, async (req, res) => {
  try {
    if (!isQuizDbConfigured()) {
      return err(res, 503, "error.databaseUnavailable", req as any);
    }
    const questionId = Number(req.params.id);
    if (!Number.isFinite(questionId)) {
      return err(res, 400, "error.validationFailed", req as any);
    }
    const adminNick = (req as any).userNick || "admin";

    await deleteQuizQuestion(questionId);

    // Refresh in-memory cache
    dynamicQuestions = (await listQuizQuestions()).map((q) => ({
      id: q.question_id,
      content: q.content,
      options: q.options,
      correctKey: q.correct_key,
      points: q.points,
    }));

    await logAdminAction(adminNick, "quiz_delete", "quiz_question", String(questionId), null);

    res.json({ success: true, deletedId: questionId });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// POST /api/admin/quiz/questions/reorder - Reorder quiz questions
app.post("/api/admin/quiz/questions/reorder", requireAdmin, async (req, res) => {
  try {
    if (!isQuizDbConfigured()) {
      return err(res, 503, "error.databaseUnavailable", req as any);
    }
    const { orderedIds } = req.body || {};
    if (!Array.isArray(orderedIds)) {
      return err(res, 400, "error.validationFailed", req as any);
    }
    const adminNick = (req as any).userNick || "admin";
    await reorderQuizQuestions(orderedIds.map((id: any) => Number(id)));
    await logAdminAction(adminNick, "quiz_reorder", "quiz_questions", null, {
      count: orderedIds.length,
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// POST /api/admin/quiz/questions/import - Bulk import questions (JSON)
app.post("/api/admin/quiz/questions/import", requireAdmin, async (req, res) => {
  try {
    if (!isQuizDbConfigured()) {
      return err(res, 503, "error.databaseUnavailable", req as any);
    }
    const { questions } = req.body || {};
    if (!Array.isArray(questions)) {
      return err(res, 400, "error.validationFailed", req as any);
    }
    const adminNick = (req as any).userNick || "admin";
    const count = await bulkImportQuestions(questions, adminNick);
    await logAdminAction(adminNick, "quiz_import", "quiz_questions", null, { count });
    res.json({ success: true, imported: count });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// GET /api/admin/quiz/questions/export - Export questions as JSON
app.get("/api/admin/quiz/questions/export", requireAdmin, async (req, res) => {
  try {
    if (!isQuizDbConfigured()) {
      return err(res, 503, "error.databaseUnavailable", req as any);
    }
    const questions = await listQuizQuestions();
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="quiz-questions-${Date.now()}.json"`,
    );
    res.send(JSON.stringify({ questions, exportedAt: new Date().toISOString() }, null, 2));
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// GET /api/admin/quiz/config - Get quiz config
app.get("/api/admin/quiz/config", requireAdmin, async (_req, res) => {
  try {
    if (!isQuizDbConfigured()) {
      return res.json(dynamicConfig);
    }
    const config = await getQuizConfig();
    res.json({ ...dynamicConfig, ...config });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// PUT /api/admin/quiz/config - Update quiz config (single key or batch)
app.put("/api/admin/quiz/config", requireAdmin, async (req, res) => {
  try {
    if (!isQuizDbConfigured()) {
      return err(res, 503, "error.databaseUnavailable", req as any);
    }
    const body = req.body || {};
    const adminNick = (req as any).userNick || "admin";

    if (body.key !== undefined && body.value !== undefined) {
      // Single key update
      await setQuizConfig(String(body.key), body.value, adminNick);
      dynamicConfig[String(body.key)] = body.value;
      await logAdminAction(adminNick, "quiz_config_update", "quiz_config", String(body.key), {
        value: body.value,
      });
    } else if (typeof body === "object") {
      // Batch update
      const count = await bulkSetQuizConfig(body, adminNick);
      Object.assign(dynamicConfig, body);
      await logAdminAction(adminNick, "quiz_config_update", "quiz_config", null, { count });
    } else {
      return err(res, 400, "error.validationFailed", req as any);
    }

    res.json({ success: true, config: dynamicConfig });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ─── Sheets 2-Way Sync Endpoints ─────────────────────────────────────

// POST /api/admin/sheets/full-sync - Full 2-way sync between Sheets, Firestore, and Supabase
app.post("/api/admin/sheets/full-sync", requireAdmin, async (req, res) => {
  try {
    const { spreadsheetId } = req.body || {};
    if (!spreadsheetId) {
      return err(res, 400, "error.validationFailed", req as any);
    }
    const adminNick = (req as any).userNick || "admin";

    const { runFullSheetsSync } = await import("../server/sheetsSync.js");
    const result = await runFullSheetsSync(spreadsheetId, { adminNick });

    await logAdminAction(adminNick, "sheets_full_sync", "sheets", spreadsheetId, result as any);

    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// POST /api/admin/sheets/push-to-sheets - Push DB data to Sheets (1-way)
app.post("/api/admin/sheets/push-to-sheets", requireAdmin, async (req, res) => {
  try {
    const { spreadsheetId } = req.body || {};
    if (!spreadsheetId) {
      return err(res, 400, "error.validationFailed", req as any);
    }
    const adminNick = (req as any).userNick || "admin";

    const { pushDbToSheets } = await import("../server/sheetsSync.js");
    const result = await pushDbToSheets(spreadsheetId);

    await logAdminAction(adminNick, "sheets_push", "sheets", spreadsheetId, result as any);

    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// GET /api/admin/sheets/status - Get sheets sync status
app.get("/api/admin/sheets/status", requireAdmin, async (_req, res) => {
  try {
    const { getSheetsSyncStatus } = await import("../server/sheetsSync.js");
    const status = await getSheetsSyncStatus();
    res.json(status);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ─── Admin Audit Log ──────────────────────────────────────────────────

async function logAdminAction(
  adminNick: string,
  actionType: string,
  targetType: string | null,
  targetId: string | null,
  details: any,
) {
  try {
    const pool = getDb();
    if (!pool || !isDbConnected()) return;
    await pool.query(
      `INSERT INTO admin_actions (admin_nick, action_type, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminNick, actionType, targetType, targetId, details ? JSON.stringify(details) : null],
    );
  } catch (e) {
    console.warn(`[AdminAudit] Failed to log action ${actionType}:`, (e as Error).message);
  }
}

// GET /api/admin/audit-log - Get recent admin actions
app.get("/api/admin/audit-log", requireAdmin, async (req, res) => {
  try {
    const pool = getDb();
    if (!pool || !isDbConnected()) {
      return res.json({ actions: [], source: "memory" });
    }
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const { rows } = await pool.query(
      `SELECT id, admin_nick, action_type, target_type, target_id, details, created_at
       FROM admin_actions
       ORDER BY created_at DESC
       LIMIT ${limit}`,
    );
    res.json({ actions: rows, source: "supabase" });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// GET /api/admin/email/status - Safe configuration diagnostics (never exposes credentials)
app.get("/api/admin/email/status", requireAdmin, async (_req, res) => {
  return res.json({
    success: true,
    ...getEmailConfigurationStatus(),
    outbox: await getEmailOutboxSummary(),
    deliverySemantics: "provider_acceptance_is_not_mailbox_delivery",
  });
});

// POST /api/admin/email/test - Explicit end-to-end provider check initiated by an admin
app.post("/api/admin/email/test", requireAdmin, async (req, res) => {
  const to = typeof req.body?.to === "string" ? req.body.to.trim() : "";
  if (to.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return res
      .status(400)
      .json({ success: false, message: "Địa chỉ email kiểm thử không hợp lệ." });
  }

  const delivery = await deliverEmail(emailSender, {
    from: notificationFrom,
    to,
    subject: "BMO EcoQuest — Kiểm tra hệ thống email",
    text: [
      "Hệ thống email BMO EcoQuest đang hoạt động.",
      `Thời gian kiểm tra: ${new Date().toISOString()}`,
      "Email này được gửi thủ công từ bảng quản trị.",
    ].join("\n"),
    html: `<div style="font-family:Inter,Arial,sans-serif;padding:24px;color:#052e28"><h2 style="margin:0 0 12px;color:#047857">BMO EcoQuest</h2><p>Hệ thống email đang hoạt động.</p><p style="color:#64748b;font-size:13px">Kiểm tra lúc ${escapeHtml(new Date().toISOString())}</p></div>`,
  });

  if (delivery.status === "skipped") {
    return res
      .status(503)
      .json({ success: false, status: delivery.status, reason: delivery.reason });
  }
  if (delivery.status === "failed") {
    return res
      .status(502)
      .json({ success: false, status: delivery.status, reason: delivery.reason });
  }
  return res.json({ success: true, status: delivery.status, id: delivery.id });
});

// GET /api/admin/system/health - System health check
app.get("/api/admin/system/health", requireAdmin, async (_req, res) => {
  try {
    const health: any = {
      server: { status: "ok", uptime: process.uptime(), memory: process.memoryUsage() },
      firestore: { status: db ? "connected" : "memory-only" },
      supabase: { status: isDbConnected() ? "connected" : "disconnected" },
      sheets: { status: "unknown" },
      rewardsDb: { status: isRewardsDbConfigured() ? "configured" : "not-configured" },
      quizDb: { status: isQuizDbConfigured() ? "configured" : "not-configured" },
      env: {
        nodeEnv: process.env.NODE_ENV || "development",
        adminApiKeySet: !!process.env.ADMIN_API_KEY,
        firebaseConfigured: !!(
          process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
        ),
        supabaseConfigured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      },
      timestamp: new Date().toISOString(),
    };

    // Test sheets connection
    try {
      const { testSheetsConnection } = await import("../server/sheetsSync.js");
      const sheetsTest = await testSheetsConnection(
        process.env.GOOGLE_SPREADSHEET_ID || "1xqrjBMynOYuqGbvmBbuEHXFWZT0ZpwQE6Uy2N7tkr-Q",
      );
      health.sheets = sheetsTest;
    } catch (e) {
      health.sheets = { status: "error", error: (e as Error).message };
    }

    res.json(health);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

async function startServer(): Promise<Server> {
  if (process.env.NODE_ENV === "production" && !db && !process.env.BMO_DATA_FILE?.trim()) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT is required in production; refusing to use ephemeral data.json storage.",
    );
  }

  // Initialize session store (sweeps expired tokens)
  await initSessionStore();
  startEmailOutboxWorker(emailSender);

  // Initialize research database (PostgreSQL)
  const dbReady = await initDb();
  if (dbReady) {
    await runSchema();
  }

  // Initialize research services on startup
  if (dbReady) {
    // Register users that exist in Firebase but not in research DB
    (async () => {
      try {
        const { getDb } = await import("../server/db.js");
        const db = getDb();
        if (db && db) {
          const existingUsers = await getAllUsers();
          for (const u of existingUsers) {
            try {
              await db.query(
                `INSERT INTO research_users (user_id, username) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING`,
                [u.account_id, u.name],
              );
            } catch (e) {
              console.warn("[Startup] research_users insert failed for", u.account_id, e);
            }
          }
        }
      } catch (e) {
        console.warn("[Startup] Research DB sync failed:", e);
      }
    })();

    // Initialize experiment engine with default experiments
    experimentEngine.initializeDefaults().catch(console.error);

    // Compute social network PageRanks periodically
    const pageRankTimer = setInterval(
      () => {
        socialNetworkAnalyzer.computeAllPageRanks().catch(console.error);
      },
      60 * 60 * 1000,
    ); // Every hour
    pageRankTimer.unref();

    // Schedule weekly reflection generation (runs every Sunday at 20:00)
    const scheduleWeeklyReflections = () => {
      const now = new Date();
      const nextSunday = new Date(now);
      nextSunday.setDate(now.getDate() + (7 - now.getDay()));
      nextSunday.setHours(20, 0, 0, 0);
      if (now.getDay() === 0 && now.getHours() >= 20) {
        nextSunday.setDate(nextSunday.getDate() + 7);
      }
      const msUntilSunday = nextSunday.getTime() - now.getTime();
      const reflectionTimer = setTimeout(() => {
        weeklyReflectionGenerator.generateWeeklyReflections().catch(console.error);
        const weeklyTimer = setInterval(
          () => {
            weeklyReflectionGenerator.generateWeeklyReflections().catch(console.error);
          },
          7 * 24 * 60 * 60 * 1000,
        );
        weeklyTimer.unref();
      }, msUntilSunday);
      reflectionTimer.unref();
    };
    scheduleWeeklyReflections();

    // Generate weekly events if none active
    (async () => {
      const activeEvent = await eventGenerator.getActiveEvent();
      if (!activeEvent) {
        await eventGenerator.generateWeeklyEvent();
      }
    })();
  }
  // The SPA fallback + 404 catch-all are registered at the END of
  // startServer() (right before app.listen) so they don't shadow
  // the per-domain routers mounted below.

  // Optional Google Sheets export. This writes external data, so production
  // operators must opt in explicitly instead of triggering it on every boot.
  const SPREADSHEET_ID =
    process.env.GOOGLE_SPREADSHEET_ID || "1xqrjBMynOYuqGbvmBbuEHXFWZT0ZpwQE6Uy2N7tkr-Q";
  const AUTO_SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
  const AUTO_SYNC_ENABLED = process.env.GOOGLE_SHEETS_AUTO_SYNC_ENABLED === "true";
  let syncErrorLogged = false;
  let initialSyncTimer: NodeJS.Timeout | null = null;
  let syncIntervalHandle: NodeJS.Timeout | null = null;
  let lastSyncTime: string | null = null;
  let lastSyncResult: any = null;

  const startAutoSync = async () => {
    try {
      const { runFullSheetsSync } = await import("../server/sheetsSync.js");
      const result = await runFullSheetsSync(SPREADSHEET_ID, { adminNick: "system" });
      lastSyncTime = new Date().toISOString();
      lastSyncResult = result;
      if (result.users > 0 || result.quizQuestions > 0) {
        console.log(
          `[AutoSync] Successfully synced: ${result.users} users, ${result.quizQuestions} questions, ${result.rewards} rewards`,
        );
      }
      syncErrorLogged = false; // Reset if it ever succeeds
    } catch (err: any) {
      if (err.message === "Service account is not configured") {
        if (!syncErrorLogged) {
          console.warn(`[AutoSync] Skipped: Service account is not configured for Google Sheets.`);
          syncErrorLogged = true;
        }
      } else {
        console.error(`[AutoSync] Error syncing Google Sheets:`, err.message);
      }
    }
  };

  if (AUTO_SYNC_ENABLED) {
    // Run once after 3s, then every 15 minutes.
    initialSyncTimer = setTimeout(startAutoSync, 3000);
    initialSyncTimer.unref();
    syncIntervalHandle = setInterval(startAutoSync, AUTO_SYNC_INTERVAL_MS);
    syncIntervalHandle.unref();
  }

  // Cleanup on shutdown
  const stopAutoSync = () => {
    if (initialSyncTimer) {
      clearTimeout(initialSyncTimer);
      initialSyncTimer = null;
    }
    if (syncIntervalHandle) {
      clearInterval(syncIntervalHandle);
      syncIntervalHandle = null;
    }
  };
  process.on("SIGTERM", stopAutoSync);
  process.on("SIGINT", stopAutoSync);

  // Research API routes
  app.use("/api/research", researchRouter);
  // Admin API routes (server-side proxy for admin operations)
  app.use("/api/admin", adminRouter);
  app.use("/api/vision", visionRouter());
  app.use("/api/dataset", datasetRouter());
  app.use("/api/family", familyRouter());
  app.use("/api/experiments", experimentsRouter());
  app.use("/api/social", socialRouter());
  app.use("/api/longitudinal", longitudinalRouter());

  // Phase 2: Federated learning router
  const { federatedRouter } = await import("../server/routes/federated.js");
  const { federatedAggregator } = await import("../server/services/federatedAggregator.js");
  federatedAggregator.start();
  app.use("/api/federated", federatedRouter());

  // Phase 3: Voice + locale + SMS routers
  const { voiceRouter } = await import("../server/routes/voice.js");
  const { smsRouter } = await import("../server/routes/sms.js");
  const { localeRouter } = await import("../server/routes/locale.js");
  app.use("/api/voice", voiceRouter());
  app.use("/api/sms", smsRouter());
  app.use("/api/locale", localeRouter());

  // Phase 4: Impact + smart bin routers
  const { impactRouter } = await import("../server/routes/impact.js");
  app.use("/api/impact", impactRouter());

  // Audit timeline (per-user slice of the tamper-evident log)
  const { auditRouter } = await import("../server/routes/audit.js");
  app.use("/api/audit", auditRouter());

  // Server-Sent Events live feed
  const { streamRouter } = await import("../server/routes/stream.js");
  app.use("/api/stream", streamRouter());

  // Model registry — signed manifests
  const { modelsRouter } = await import("../server/routes/models.js");
  app.use("/api/models", modelsRouter());

  // Liveness + dependency probe (used by smoke.sh and uptime monitors)
  const { healthRouter } = await import("../server/routes/health.js");
  app.use("/api/health", healthRouter());

  // Scan-derived material cards and server-scored sorting matches.
  const { materialCardsRouter } = await import("../server/routes/materialCards.js");
  app.use(
    "/api",
    materialCardsRouter({
      requireCompleteProfile,
      getLocalEconomy: (nick) =>
        process.env.NODE_ENV === "production" && !process.env.BMO_DATA_FILE?.trim()
          ? undefined
          : {
              getPoints: async () => (await getUser(nick))?.points ?? 0,
              debit: async (amount) => {
                const release = await acquireRewardLock(nick);
                try {
                  const user = await getUser(nick);
                  if (!user || user.points < amount) {
                    throw new MaterialCardError("insufficient_points", "Không đủ điểm để tạo thẻ.");
                  }
                  applyPointDelta(user, -amount);
                  await saveUser(user);
                  return user.points;
                } finally {
                  release();
                }
              },
            },
    }),
  );

  // Research data endpoints (shorter paths)
  app.get("/api/personality/:userId", requireAuth, async (req, res) => {
    const userId = getRouteParam(req.params.userId);
    if (!canAccessUserScope(req, userId)) return err(res, 403, "error.forbidden", req as any);
    const mode = await personalityEngine.getPersonality(userId);
    res.json({ personality_mode: mode });
  });

  app.get("/api/profile/:userId", requireAuth, async (req, res) => {
    const userId = getRouteParam(req.params.userId);
    if (!canAccessUserScope(req, userId)) return err(res, 403, "error.forbidden", req as any);
    const profile = await behavioralProfiler.getProfile(userId);
    if (!profile) {
      const newProfile = await behavioralProfiler.profileUser(userId);
      return res.json(newProfile);
    }
    res.json(profile);
  });

  app.get("/api/reflection/:userId", requireAuth, async (req, res) => {
    const userId = getRouteParam(req.params.userId);
    if (!canAccessUserScope(req, userId)) return err(res, 403, "error.forbidden", req as any);
    const reflection = await weeklyReflectionGenerator.getLatestReflection(userId);
    res.json(reflection || { message: "Chưa có phản hồi tuần này" });
  });

  app.get("/api/decay/:userId", requireAuth, async (req, res) => {
    const userId = getRouteParam(req.params.userId);
    if (!canAccessUserScope(req, userId)) return err(res, 403, "error.forbidden", req as any);
    const state = await noveltyDecayDetector.detectDecay(userId);
    res.json(state);
  });

  app.get("/api/interventions/:userId", requireAuth, async (req, res) => {
    const userId = getRouteParam(req.params.userId);
    if (!canAccessUserScope(req, userId)) return err(res, 403, "error.forbidden", req as any);
    const interventions = await adaptiveRewardEngine.getRecentInterventions(userId);
    res.json(interventions);
  });

  app.get("/api/simulation/:userId", requireAuth, async (req, res) => {
    const userId = getRouteParam(req.params.userId);
    if (!canAccessUserScope(req, userId)) return err(res, 403, "error.forbidden", req as any);
    const predictions = await simulationEngine.getSimulations(userId);
    res.json(predictions);
  });

  app.get("/api/active-event", async (req, res) => {
    const event = await eventGenerator.getActiveEvent();
    res.json(event);
  });

  app.post("/api/generate-event", requireAdmin, async (req, res) => {
    const event = await eventGenerator.generateWeeklyEvent();
    res.json(event);
  });

  app.get("/api/simulation/intervention/:type", async (req, res) => {
    const result = await simulationEngine.predictInterventionEffectiveness(req.params.type);
    res.json(result);
  });

  app.get("/api/reward-history/:nick", requireAuth, async (req, res) => {
    const requestedNick = getRouteParam(req.params.nick);
    const user = await getUser(requestedNick);
    if (!user) return err(res, 404, "error.notFound", req as any);
    if (
      !canAccessUserScope(req, requestedNick) &&
      !canAccessUserScope(req, String(user.account_id || ""))
    ) {
      return err(res, 403, "error.forbidden", req as any);
    }
    if (!db) return err(res, 503, "error.databaseUnavailable", req as any);
    try {
      const snapshot = await db
        .collection("point_transactions")
        .where("accountId", "==", user.account_id)
        .limit(200)
        .get();
      const rows = snapshot.docs
        .map((document) => {
          const value = document.data();
          return {
            id: document.id,
            transaction_type: value.type ?? (Number(value.amount) >= 0 ? "earn" : "spend"),
            amount: Number(value.amount) || 0,
            reason: value.reason ?? null,
            source: value.source ?? null,
            multiplier: Number(value.multiplier) || 1,
            points_balance: Number.isFinite(Number(value.balanceAfter))
              ? Number(value.balanceAfter)
              : null,
            created_at: new Date(Number(value.createdAt) || Date.now()).toISOString(),
          };
        })
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 50);
      res.json(rows);
    } catch (e) {
      err(res, 500, "error.internal", req as any);
    }
  });

  app.get("/api/reward-summary/:nick", requireAuth, async (req, res) => {
    const requestedNick = getRouteParam(req.params.nick);
    const user = await getUser(requestedNick);
    if (!user) return err(res, 404, "error.notFound", req as any);
    if (
      !canAccessUserScope(req, requestedNick) &&
      !canAccessUserScope(req, String(user.account_id || ""))
    ) {
      return err(res, 403, "error.forbidden", req as any);
    }
    if (!db) return err(res, 503, "error.databaseUnavailable", req as any);
    try {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const snapshot = await db
        .collection("point_transactions")
        .where("accountId", "==", user.account_id)
        .limit(1000)
        .get();
      const rows = snapshot.docs
        .map(
          (document) => document.data() as { type?: string; amount?: number; createdAt?: number },
        )
        .filter((row) => Number(row.createdAt) >= cutoff);
      let totalEarned = 0,
        totalSpent = 0;
      for (const r of rows) {
        const amount = Number(r.amount) || 0;
        if (r.type === "earn" || amount > 0) totalEarned += Math.abs(amount);
        else totalSpent += Math.abs(amount);
      }
      res.json({
        totalEarned,
        totalSpent,
        netChange: totalEarned - totalSpent,
        txCount: rows.length,
      });
    } catch (e) {
      err(res, 500, "error.internal", req as any);
    }
  });

  // ─── Weekly Tournament ──────────────────────────────────────────────────────
  app.get("/api/tournament/current", requireAuth, async (req, res) => {
    try {
      if (!db) return err(res, 503, "error.databaseUnavailable", req as any);
      // Get current week's Monday 00:00 Vietnam time (UTC+7)
      const now = new Date();
      const vnOffset = 7 * 60;
      const localMs = now.getTime() + now.getTimezoneOffset() * 60000;
      const vnNow = new Date(localMs + vnOffset * 60000);
      const dayOfWeek = vnNow.getDay(); // 0=Sun, 1=Mon
      const mondayMs =
        vnNow.getTime() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) * 24 * 60 * 60 * 1000;
      const weekStart = new Date(mondayMs);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      weekEnd.setHours(23, 59, 59, 999);

      const weekStartStr = weekStart.toISOString().split("T")[0];
      const weekEndStr = weekEnd.toISOString().split("T")[0];

      const tournamentRef = db.collection("tournaments").doc(`${weekStartStr}_${weekEndStr}`);
      const tournamentDoc = await tournamentRef.get();

      if (!tournamentDoc.exists) {
        // Create new tournament for this week
        await tournamentRef.set({
          id: `${weekStartStr}_${weekEndStr}`,
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          status: "active",
          participants: [],
          bracket: null,
          rewards: {
            first: { exp: 1000, badgeId: "weekly_champion", badgeName: "Vô Địch Tuần" },
            second: { exp: 500 },
            third: { exp: 250 },
            top8: { exp: 100 },
          },
          createdAt: Date.now(),
        });
        return res.json({
          tournament: null,
          userJoined: false,
          userPosition: null,
          timeRemaining: formatTimeRemaining(weekEnd),
        });
      }

      const tournamentData = tournamentDoc.data()!;
      const nick = (req as any).userNick as string;

      let userJoined = false;
      let userPosition: number | null = null;
      if (tournamentData.participants) {
        const participant = tournamentData.participants.find((p: any) => p.userId === nick);
        if (participant) {
          userJoined = true;
          const sorted = [...tournamentData.participants].sort(
            (a: any, b: any) => b.weeklyScore - a.weeklyScore,
          );
          userPosition = sorted.findIndex((p: any) => p.userId === nick) + 1;
        }
      }

      res.json({
        tournament: tournamentData,
        userJoined,
        userPosition,
        timeRemaining: formatTimeRemaining(new Date(tournamentData.weekEnd)),
      });
    } catch (e) {
      console.error("[tournament/current]", e);
      err(res, 500, "error.internal", req as any);
    }
  });

  app.post("/api/tournament/join", requireAuth, async (req, res) => {
    try {
      const nick = (req as any).userNick;
      if (!db) return err(res, 503, "error.databaseUnavailable", req as any);
      const now = new Date();
      const vnOffset = 7 * 60;
      const localMs = now.getTime() + now.getTimezoneOffset() * 60000;
      const vnNow = new Date(localMs + vnOffset * 60000);
      const dayOfWeek = vnNow.getDay();
      const mondayMs =
        vnNow.getTime() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) * 24 * 60 * 60 * 1000;
      const weekStart = new Date(mondayMs);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      weekEnd.setHours(23, 59, 59, 999);
      const weekStartStr = weekStart.toISOString().split("T")[0];
      const weekEndStr = weekEnd.toISOString().split("T")[0];

      const tournamentRef = db.collection("tournaments").doc(`${weekStartStr}_${weekEndStr}`);
      const tournamentDoc = await tournamentRef.get();
      const user = await getUser(nick);

      if (!tournamentDoc.exists) {
        return err(res, 404, "error.notFound", req as any);
      }
      const tournamentData = tournamentDoc.data()!;

      if (tournamentData.status === "completed") {
        return err(res, 400, "error.tournamentEnded", req as any);
      }

      const alreadyJoined = tournamentData.participants?.some((p: any) => p.userId === nick);
      if (alreadyJoined) {
        return res.json({ joined: true, message: "Already joined" });
      }

      const weeklyScore = user?.points || 0;
      const newParticipant = {
        userId: nick,
        name: user?.name || nick,
        points: weeklyScore,
        weeklyScore,
        joinedAt: Date.now(),
      };

      await tournamentRef.update({
        participants: [...(tournamentData.participants || []), newParticipant],
      });

      res.json({ joined: true, participant: newParticipant });
    } catch (e) {
      console.error("[tournament/join]", e);
      err(res, 500, "error.internal", req as any);
    }
  });

  app.get("/api/tournament/bracket", async (req, res) => {
    try {
      const { id } = req.query;
      if (!db) return err(res, 503, "error.databaseUnavailable", req as any);
      let docRef;
      if (id) {
        docRef = db.collection("tournaments").doc(id as string);
      } else {
        // Get most recent active tournament
        const now = new Date();
        const vnOffset = 7 * 60;
        const localMs = now.getTime() + now.getTimezoneOffset() * 60000;
        const vnNow = new Date(localMs + vnOffset * 60000);
        const dayOfWeek = vnNow.getDay();
        const mondayMs =
          vnNow.getTime() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) * 24 * 60 * 60 * 1000;
        const weekStart = new Date(mondayMs);
        weekStart.setHours(0, 0, 0, 0);
        const weekStartStr = weekStart.toISOString().split("T")[0];
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
        const weekEndStr = weekEnd.toISOString().split("T")[0];
        docRef = db.collection("tournaments").doc(`${weekStartStr}_${weekEndStr}`);
      }

      const doc = await docRef.get();
      if (!doc.exists) return res.json({ bracket: null, participants: [] });

      const data = doc.data()!;
      const participants = data.participants || [];
      const sorted = [...participants].sort((a: any, b: any) => b.weeklyScore - a.weeklyScore);
      const top8 = sorted.slice(0, 8);

      // Generate bracket if not exists
      let bracket = data.bracket;
      if (!bracket && top8.length >= 2) {
        bracket = generateBracket(top8);
        await docRef.update({ bracket });
      }

      res.json({ bracket, participants: sorted });
    } catch (e) {
      console.error("[tournament/bracket]", e);
      err(res, 500, "error.internal", req as any);
    }
  });

  // ─── PvP Arena ──────────────────────────────────────────────────────────────
  app.post("/api/pvp/match", requireAuth, async (req, res) => {
    try {
      const challengerNick = (req as any).userNick;
      if (!db) return err(res, 503, "error.databaseUnavailable", req as any);
      const WAGER = 20;

      const challenger = await getUser(challengerNick);
      if (!challenger) return err(res, 404, "error.notFound", req as any);
      if ((challenger.points || 0) < WAGER) {
        return err(res, 400, "error.clan.missingExp", req as any);
      }

      // Get all users and pick a random opponent with similar rank (nearby points)
      const allUsers = await getAllUsers();
      const eligibleOpponents = allUsers.filter(
        (u) => u.nick !== challengerNick && (u.points || 0) >= WAGER,
      );

      if (eligibleOpponents.length === 0) {
        return err(res, 404, "error.notFound", req as any);
      }

      // Pick opponent with closest points (rank matchmaking)
      eligibleOpponents.sort(
        (a, b) =>
          Math.abs((a.points || 0) - (challenger.points || 0)) -
          Math.abs((b.points || 0) - (challenger.points || 0)),
      );
      const opponent =
        eligibleOpponents[Math.floor(Math.random() * Math.min(3, eligibleOpponents.length))];

      const matchId = `pvp_${Date.now()}_${challengerNick}`;
      const match: PvPMatch = {
        id: matchId,
        challengerId: challengerNick,
        challengerName: challenger.name || challengerNick,
        opponentId: opponent.nick,
        opponentName: opponent.name || opponent.nick,
        challengerWager: WAGER,
        opponentWager: 0, // opponent hasn't accepted
        stake: WAGER, // challenger already wagered
        status: "matched",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        rounds: [],
      };

      const matchRef = db.collection("pvp_matches").doc(matchId);
      const challengerRef = db.collection("users").doc(challengerNick);
      const wagerAccepted = await db.runTransaction(async (tx) => {
        const currentChallenger = await tx.get(challengerRef);
        const currentPoints = Number(currentChallenger.data()?.points || 0);
        if (currentPoints < WAGER) return false;
        tx.set(matchRef, match);
        tx.update(challengerRef, { points: currentPoints - WAGER });
        return true;
      });
      if (!wagerAccepted) {
        return err(res, 400, "error.clan.missingExp", req as any);
      }

      res.json({
        matchId,
        opponentId: opponent.nick,
        opponentName: opponent.name || opponent.nick,
        opponentPoints: opponent.points || 0,
        stake: WAGER,
        status: "matched",
      });
    } catch (e) {
      console.error("[pvp/match]", e);
      err(res, 500, "error.internal", req as any);
    }
  });

  app.post("/api/pvp/result", requireAuth, async (req, res) => {
    try {
      const { matchId, playerWon, rounds } = req.body;
      const nick = (req as any).userNick;
      if (typeof matchId !== "string" || !matchId || typeof playerWon !== "boolean") {
        return res.status(400).json({ error: "matchId and playerWon are required" });
      }
      if (!db) return err(res, 503, "error.databaseUnavailable", req as any);

      const matchRef = db.collection("pvp_matches").doc(matchId);
      const safeRounds = Array.isArray(rounds)
        ? rounds.slice(0, 100).map((round, index) => ({
            round: Number.isFinite(Number(round?.round)) ? Number(round.round) : index + 1,
            playerScore: Number.isFinite(Number(round?.playerScore))
              ? Number(round.playerScore)
              : 0,
            opponentScore: Number.isFinite(Number(round?.opponentScore))
              ? Number(round.opponentScore)
              : 0,
            winner: ["player", "opponent", "draw"].includes(round?.winner) ? round.winner : "draw",
          }))
        : [];

      const outcome = await db.runTransaction(async (tx) => {
        const matchDoc = await tx.get(matchRef);
        if (!matchDoc.exists) return { status: "missing" as const };
        const match = matchDoc.data() as PvPMatch;
        if (match.challengerId !== nick) return { status: "forbidden" as const };
        if (match.status === "completed") {
          return { status: "completed" as const, winnerId: match.winnerId };
        }

        const winnerId = playerWon ? nick : match.opponentId;
        const winnerRef = db.collection("users").doc(winnerId);
        const winnerDoc = await tx.get(winnerRef);
        if (!winnerDoc.exists) return { status: "missing-user" as const };

        // Only the challenger's already-deducted stake is paid out. The old
        // `stake * 2` payout minted EXP because the opponent never staked.
        const payout = Math.max(0, Number(match.stake) || 0);
        tx.update(winnerRef, { points: Number(winnerDoc.data()?.points || 0) + payout });
        tx.update(matchRef, {
          status: "completed",
          winnerId,
          challengerResult: match.challengerId === winnerId ? "win" : "lose",
          opponentResult: match.opponentId === winnerId ? "win" : "lose",
          rounds: safeRounds,
          updatedAt: Date.now(),
        });
        return { status: "processed" as const, winnerId, payout };
      });

      if (outcome.status === "missing" || outcome.status === "missing-user") {
        return err(res, 404, "error.notFound", req as any);
      }
      if (outcome.status === "forbidden") return res.status(403).json({ error: "Forbidden" });
      if (outcome.status === "completed") {
        return res.json({ alreadyProcessed: true, winnerId: outcome.winnerId });
      }
      res.json({ winnerId: outcome.winnerId, reward: outcome.payout });
    } catch (e) {
      console.error("[pvp/result]", e);
      err(res, 500, "error.internal", req as any);
    }
  });

  app.get("/api/pvp/history", requireAuth, async (req, res) => {
    try {
      const nick = (req as any).userNick;
      if (!db) return err(res, 503, "error.databaseUnavailable", req as any);
      const matches: FirebaseFirestore.QuerySnapshot = await db
        .collection("pvp_matches")
        .where("status", "==", "completed")
        .orderBy("updatedAt", "desc")
        .limit(20)
        .get();

      const userMatches = matches.docs
        .map((d) => d.data())
        .filter((m: any) => m.challengerId === nick || m.opponentId === nick);

      res.json(userMatches);
    } catch (e) {
      console.error("[pvp/history]", e);
      err(res, 500, "error.internal", req as any);
    }
  });

  // ─── CLAN SYSTEM ────────────────────────────────────────────────────────────
  const MAX_CLANS = 50;
  const MAX_MEMBERS = 20;

  function getMondayTimestamp(): number {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday.getTime();
  }

  app.get("/api/clans", async (req, res) => {
    try {
      if (!db) return err(res, 503, "error.databaseUnavailable", req as any);
      const clansSnap = await db.collection("clans").orderBy("exp", "desc").limit(50).get();
      const clans = clansSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name,
          tag: data.tag,
          leaderId: data.leaderId,
          memberCount: (data.memberIds || []).length,
          maxMembers: MAX_MEMBERS,
          exp: data.exp || 0,
          level: data.level || 1,
          bio: data.bio || "",
          avatarSeed: data.avatarSeed || data.name || "",
          weeklyDonations: data.weeklyDonations || 0,
          weeklyGoal: data.weeklyGoal || 500,
        };
      });
      res.json({ clans, total: clans.length });
    } catch (e) {
      console.error("[clans]", e);
      err(res, 500, "error.internal", req as any);
    }
  });

  app.post("/api/clans", requireAuth, async (req, res) => {
    try {
      const nick = (req as any).userNick;
      const { name, tag, bio } = req.body || {};
      if (!name || name.trim().length < 2)
        return res
          .status(400)
          .json({ error: getErrorMessage("error.clan.nameTooShort", (req as any).locale?.locale) });
      if (!tag || tag.trim().length < 2 || tag.trim().length > 5)
        return res
          .status(400)
          .json({ error: getErrorMessage("error.clan.tagInvalid", (req as any).locale?.locale) });

      if (!db)
        return res.status(503).json({
          error: getErrorMessage("error.databaseUnavailable", (req as any).locale?.locale),
        });

      // Check if user already in a clan
      const userClanSnap = await db
        .collection("users")
        .doc(nick)
        .collection("profile")
        .doc("clan")
        .get();
      if (userClanSnap.exists)
        return res.status(400).json({
          error: getErrorMessage("error.clan.alreadyMember", (req as any).locale?.locale),
        });

      // Check clan count limit
      const clanCount = (await db.collection("clans").count().get()).data().count;
      if (clanCount >= MAX_CLANS)
        return res
          .status(400)
          .json({ error: getErrorMessage("error.clan.full", (req as any).locale?.locale) });

      // Check tag uniqueness
      const tagSnap = await db
        .collection("clans")
        .where("tag", "==", tag.trim().toUpperCase())
        .limit(1)
        .get();
      if (!tagSnap.empty)
        return res
          .status(400)
          .json({ error: getErrorMessage("error.clan.tagTaken", (req as any).locale?.locale) });

      const clanRef = db.collection("clans").doc();
      const clanData = {
        name: name.trim(),
        tag: tag.trim().toUpperCase(),
        leaderId: nick,
        memberIds: [nick],
        exp: 0,
        level: 1,
        bio: (bio || "").trim().slice(0, 200),
        createdAt: Date.now(),
        weeklyDonations: 0,
        weeklyGoal: 500,
        avatarSeed: name.trim(),
      };
      await clanRef.set(clanData);

      // Create member profile
      await db.collection("clans").doc(clanRef.id).collection("members").doc(nick).set({
        userId: nick,
        role: "owner",
        expContributed: 0,
        weeklyDonation: 0,
        joinedAt: Date.now(),
        level: 1,
      });

      // Link user to clan
      await db.collection("users").doc(nick).collection("profile").doc("clan").set({
        clanId: clanRef.id,
        role: "owner",
        joinedAt: Date.now(),
      });

      res.json({ id: clanRef.id, ...clanData });
    } catch (e) {
      console.error("[clans/create]", e);
      err(res, 500, "error.internal", req as any);
    }
  });

  app.get("/api/clan/:id", requireAuth, async (req, res) => {
    try {
      const id = getRouteParam(req.params.id);
      const nick = (req as any).userNick as string;
      if (!db) return err(res, 503, "error.databaseUnavailable", req as any);
      const clanSnap = await db.collection("clans").doc(id).get();
      if (!clanSnap.exists)
        return res
          .status(404)
          .json({ error: getErrorMessage("error.clan.notFound", (req as any).locale?.locale) });

      const clanData = clanSnap.data()!;
      const memberIds: string[] = clanData.memberIds || [];
      const isMember = memberIds.includes(nick);

      let members: Record<string, unknown>[] = [];
      let quests: Record<string, unknown>[] = [];
      let messages: Record<string, unknown>[] = [];
      if (isMember) {
        const [membersSnap, questsSnap, msgsSnap] = await Promise.all([
          db.collection("clans").doc(id).collection("members").get(),
          db
            .collection("clans")
            .doc(id)
            .collection("quests")
            .where("expiresAt", ">", Date.now())
            .limit(5)
            .get(),
          db
            .collection("clans")
            .doc(id)
            .collection("messages")
            .orderBy("createdAt", "desc")
            .limit(30)
            .get(),
        ]);
        members = membersSnap.docs.map((doc) => doc.data());
        quests = questsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        messages = msgsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).reverse();
      }

      res.json({
        id,
        name: clanData.name,
        tag: clanData.tag,
        leaderId: clanData.leaderId,
        memberIds: isMember ? memberIds : [],
        memberCount: memberIds.length,
        isMember,
        exp: clanData.exp || 0,
        level: clanData.level || 1,
        bio: clanData.bio || "",
        avatarSeed: clanData.avatarSeed || clanData.name || "",
        weeklyDonations: clanData.weeklyDonations || 0,
        weeklyGoal: clanData.weeklyGoal || 500,
        createdAt: clanData.createdAt,
        members,
        quests,
        messages,
      });
    } catch (e) {
      console.error("[clan/:id]", e);
      res.status(500).json({ error: "Failed to get clan" });
    }
  });

  app.post("/api/clan/:id/join", requireAuth, async (req, res) => {
    try {
      const nick = (req as any).userNick;
      const id = getRouteParam(req.params.id);
      if (!db) return err(res, 503, "error.databaseUnavailable", req as any);

      // Check if already in a clan
      const existingClan = await db
        .collection("users")
        .doc(nick)
        .collection("profile")
        .doc("clan")
        .get();
      if (existingClan.exists)
        return res.status(400).json({ error: "Bạn đã ở trong một clan khác" });

      const clanRef = db.collection("clans").doc(id);
      const clanSnap = await clanRef.get();
      if (!clanSnap.exists)
        return res
          .status(404)
          .json({ error: getErrorMessage("error.clan.notFound", (req as any).locale?.locale) });
      const clanData = clanSnap.data()!;

      const memberIds: string[] = clanData.memberIds || [];
      if (memberIds.length >= MAX_MEMBERS) return res.status(400).json({ error: "Clan đã đầy" });

      await db.runTransaction(async (tx) => {
        const snap = await tx.get(clanRef);
        const data = snap.data()!;
        const ids: string[] = data.memberIds || [];
        if (ids.length >= MAX_MEMBERS) throw new Error("Clan đã đầy");
        tx.update(clanRef, { memberIds: [...ids, nick] });
        tx.set(clanRef.collection("members").doc(nick), {
          userId: nick,
          role: "member",
          expContributed: 0,
          weeklyDonation: 0,
          joinedAt: Date.now(),
          level: 1,
        });
        tx.set(db.collection("users").doc(nick).collection("profile").doc("clan"), {
          clanId: id,
          role: "member",
          joinedAt: Date.now(),
        });
      });

      res.json({ success: true, clanId: id });
    } catch (e: any) {
      console.error("[clan/join]", e);
      if (e.message === "Clan đã đầy") return res.status(400).json({ error: e.message });
      res.status(500).json({ error: "Failed to join clan" });
    }
  });

  app.post("/api/clan/:id/leave", requireAuth, async (req, res) => {
    try {
      const nick = (req as any).userNick;
      const id = getRouteParam(req.params.id);
      if (!db) return err(res, 503, "error.databaseUnavailable", req as any);

      const clanRef = db.collection("clans").doc(id);
      const clanSnap = await clanRef.get();
      if (!clanSnap.exists)
        return res
          .status(404)
          .json({ error: getErrorMessage("error.clan.notFound", (req as any).locale?.locale) });
      const clanData = clanSnap.data()!;

      if (clanData.leaderId === nick)
        return res
          .status(400)
          .json({ error: "Chủ tịch không thể rời clan. Hãy chuyển giao hoặc giải tán clan." });

      await db.runTransaction(async (tx) => {
        const snap = await tx.get(clanRef);
        const data = snap.data()!;
        tx.update(clanRef, { memberIds: (data.memberIds || []).filter((m: string) => m !== nick) });
        tx.delete(clanRef.collection("members").doc(nick));
        tx.delete(db.collection("users").doc(nick).collection("profile").doc("clan"));
      });

      res.json({ success: true });
    } catch (e) {
      console.error("[clan/leave]", e);
      res.status(500).json({ error: "Failed to leave clan" });
    }
  });

  app.post("/api/clan/:id/donate", requireAuth, async (req, res) => {
    try {
      const nick = (req as any).userNick;
      const id = getRouteParam(req.params.id);
      const { amount } = req.body || {};
      const donateAmount = Number(amount);
      if (!Number.isInteger(donateAmount) || donateAmount < 10 || donateAmount > 10000) {
        return res.status(400).json({ error: "Mức đóng góp phải là số nguyên từ 10–10.000 EXP" });
      }

      if (!db) return err(res, 503, "error.databaseUnavailable", req as any);

      // Deduct from user
      const userSnap = await db.collection("users").doc(nick).get();
      const userData = userSnap.data()!;
      const userPoints = userData.points || 0;
      if (userPoints < donateAmount)
        return res
          .status(400)
          .json({ error: getErrorMessage("error.clan.missingExp", (req as any).locale?.locale) });

      const clanRef = db.collection("clans").doc(id);
      const clanSnap = await clanRef.get();
      if (!clanSnap.exists)
        return res
          .status(404)
          .json({ error: getErrorMessage("error.clan.notFound", (req as any).locale?.locale) });

      const clanData = clanSnap.data()!;
      if (!(clanData.memberIds || []).includes(nick))
        return res
          .status(400)
          .json({ error: getErrorMessage("error.clan.notMember", (req as any).locale?.locale) });

      await db.runTransaction(async (tx) => {
        // Deduct user points
        const uSnap = await tx.get(db.collection("users").doc(nick));
        const uData = uSnap.data()!;
        if ((uData.points || 0) < donateAmount) throw new Error("Không đủ EXP");
        tx.update(db.collection("users").doc(nick), { points: (uData.points || 0) - donateAmount });

        // Add to clan
        const cSnap = await tx.get(clanRef);
        const cData = cSnap.data()!;
        const newExp = (cData.exp || 0) + donateAmount;
        const newLevel = Math.floor(newExp / 1000) + 1;
        const newWeekly = (cData.weeklyDonations || 0) + donateAmount;
        tx.update(clanRef, { exp: newExp, level: newLevel, weeklyDonations: newWeekly });

        // Update member donation
        const memberRef = clanRef.collection("members").doc(nick);
        const mSnap = await tx.get(memberRef);
        const mData = mSnap.data() || {};
        tx.update(memberRef, {
          expContributed: (mData.expContributed || 0) + donateAmount,
          weeklyDonation: (mData.weeklyDonation || 0) + donateAmount,
        });
      });

      res.json({ success: true, donated: donateAmount });
    } catch (e: any) {
      console.error("[clan/donate]", e);
      if (e.message === "Không đủ EXP") return res.status(400).json({ error: e.message });
      res.status(500).json({ error: "Failed to donate" });
    }
  });

  app.post("/api/clan/:id/messages", requireAuth, async (req, res) => {
    try {
      const nick = (req as any).userNick;
      const id = getRouteParam(req.params.id);
      const { text } = req.body || {};
      if (!text || text.trim().length === 0)
        return res
          .status(400)
          .json({ error: getErrorMessage("error.clan.emptyMessage", (req as any).locale?.locale) });
      if (text.trim().length > 500)
        return res.status(400).json({
          error: getErrorMessage("error.clan.messageTooLong", (req as any).locale?.locale),
        });

      if (!db) return err(res, 503, "error.databaseUnavailable", req as any);
      const clanSnap = await db.collection("clans").doc(id).get();
      if (!clanSnap.exists)
        return res
          .status(404)
          .json({ error: getErrorMessage("error.clan.notFound", (req as any).locale?.locale) });
      const clanData = clanSnap.data()!;
      if (!(clanData.memberIds || []).includes(nick))
        return res
          .status(400)
          .json({ error: getErrorMessage("error.clan.notMember", (req as any).locale?.locale) });

      const userSnap = await db.collection("users").doc(nick).get();
      const userData = userSnap.data() || {};

      const msgRef = db.collection("clans").doc(id).collection("messages").doc();
      await msgRef.set({
        userId: nick,
        nick: userData.nick || nick,
        text: text.trim(),
        createdAt: Date.now(),
      });

      res.json({
        id: msgRef.id,
        userId: nick,
        nick: userData.nick || nick,
        text: text.trim(),
        createdAt: Date.now(),
      });
    } catch (e) {
      console.error("[clan/messages]", e);
      res.status(500).json({ error: "Failed to post message" });
    }
  });

  app.post("/api/clan/:id/assign-officer", requireAuth, async (req, res) => {
    try {
      const nick = (req as any).userNick;
      const id = getRouteParam(req.params.id);
      const { targetNick } = req.body || {};
      if (!targetNick)
        return res.status(400).json({
          error: getErrorMessage("error.clan.missingTarget", (req as any).locale?.locale),
        });

      if (!db) return err(res, 503, "error.databaseUnavailable", req as any);
      const clanRef = db.collection("clans").doc(id);
      const clanSnap = await clanRef.get();
      if (!clanSnap.exists)
        return res
          .status(404)
          .json({ error: getErrorMessage("error.clan.notFound", (req as any).locale?.locale) });
      const clanData = clanSnap.data()!;
      if (clanData.leaderId !== nick)
        return res
          .status(403)
          .json({ error: getErrorMessage("error.clan.notLeader", (req as any).locale?.locale) });
      if (!(clanData.memberIds || []).includes(targetNick))
        return res.status(400).json({
          error: getErrorMessage("error.clan.memberNotFound", (req as any).locale?.locale),
        });

      await clanRef.collection("members").doc(targetNick).update({ role: "officer" });
      res.json({ success: true });
    } catch (e) {
      console.error("[clan/assign-officer]", e);
      res.status(500).json({ error: "Failed to assign officer" });
    }
  });

  app.post("/api/clan/:id/transfer-owner", requireAuth, async (req, res) => {
    try {
      const nick = (req as any).userNick;
      const id = getRouteParam(req.params.id);
      const { targetNick } = req.body || {};
      if (!targetNick)
        return res.status(400).json({
          error: getErrorMessage("error.clan.missingTarget", (req as any).locale?.locale),
        });

      if (!db) return err(res, 503, "error.databaseUnavailable", req as any);
      const clanRef = db.collection("clans").doc(id);
      const clanSnap = await clanRef.get();
      if (!clanSnap.exists)
        return res
          .status(404)
          .json({ error: getErrorMessage("error.clan.notFound", (req as any).locale?.locale) });
      const clanData = clanSnap.data()!;
      if (clanData.leaderId !== nick)
        return res
          .status(403)
          .json({ error: getErrorMessage("error.clan.notLeader", (req as any).locale?.locale) });
      if (!(clanData.memberIds || []).includes(targetNick))
        return res.status(400).json({
          error: getErrorMessage("error.clan.memberNotFound", (req as any).locale?.locale),
        });

      await db.runTransaction(async (tx) => {
        tx.update(clanRef, { leaderId: targetNick });
        tx.update(clanRef.collection("members").doc(nick), { role: "officer" });
        tx.update(clanRef.collection("members").doc(targetNick), { role: "owner" });
        tx.update(db.collection("users").doc(nick).collection("profile").doc("clan"), {
          role: "officer",
        });
        tx.update(db.collection("users").doc(targetNick).collection("profile").doc("clan"), {
          role: "owner",
        });
      });

      res.json({ success: true });
    } catch (e) {
      console.error("[clan/transfer]", e);
      res.status(500).json({ error: "Failed to transfer ownership" });
    }
  });

  app.delete("/api/clan/:id", requireAuth, async (req, res) => {
    try {
      const nick = (req as any).userNick;
      const id = getRouteParam(req.params.id);
      if (!db) return err(res, 503, "error.databaseUnavailable", req as any);
      const clanRef = db.collection("clans").doc(id);
      const clanSnap = await clanRef.get();
      if (!clanSnap.exists)
        return res
          .status(404)
          .json({ error: getErrorMessage("error.clan.notFound", (req as any).locale?.locale) });
      if (clanSnap.data()!.leaderId !== nick)
        return res.status(403).json({
          error: getErrorMessage("error.clan.notLeaderDisband", (req as any).locale?.locale),
        });

      const memberIds: string[] = clanSnap.data()!.memberIds || [];
      await db.runTransaction(async (tx) => {
        // Remove clan link from all members
        for (const mId of memberIds) {
          tx.delete(db.collection("users").doc(mId).collection("profile").doc("clan"));
        }
        // Delete all subcollections
        const membersSnap = await tx.get(clanRef.collection("members"));
        for (const d of membersSnap.docs) tx.delete(d.ref);
        const questsSnap = await tx.get(clanRef.collection("quests"));
        for (const d of questsSnap.docs) tx.delete(d.ref);
        const msgsSnap = await tx.get(clanRef.collection("messages"));
        for (const d of msgsSnap.docs) tx.delete(d.ref);
        // Delete clan
        tx.delete(clanRef);
      });

      res.json({ success: true });
    } catch (e) {
      console.error("[clan/delete]", e);
      res.status(500).json({ error: "Failed to delete clan" });
    }
  });

  app.get("/api/user-clan", requireAuth, async (req, res) => {
    try {
      const nick = (req as any).userNick;
      if (!db) return err(res, 503, "error.databaseUnavailable", req as any);
      const profileSnap = await db
        .collection("users")
        .doc(nick)
        .collection("profile")
        .doc("clan")
        .get();
      if (!profileSnap.exists) return res.json({ inClan: false, clanId: null, role: null });

      const { clanId, role, joinedAt } = profileSnap.data()!;
      const clanSnap = await db.collection("clans").doc(clanId).get();
      if (!clanSnap.exists) return res.json({ inClan: false, clanId: null, role: null });

      const clanData = clanSnap.data()!;
      res.json({
        inClan: true,
        clanId,
        role,
        joinedAt,
        clan: {
          id: clanId,
          name: clanData.name,
          tag: clanData.tag,
          level: clanData.level || 1,
          exp: clanData.exp || 0,
          memberCount: (clanData.memberIds || []).length,
          maxMembers: MAX_MEMBERS,
          leaderId: clanData.leaderId,
        },
      });
    } catch (e) {
      console.error("[user-clan]", e);
      res.status(500).json({ error: "Failed to get user clan" });
    }
  });

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(err.statusCode || 500).json({ error: err.message || "Internal server error" });
  });

  // ── SPA fallback + 404 catch-all (must be LAST) ────────────────────────────
  // Layer 2.9 — every unknown /api route returns a localised JSON 404.
  // This is registered in both dev (Vite middlewareMode) and production so
  // the client `await res.json()` call never blows up with
  // "Unexpected token '<'".
  app.all(/^\/api\/.*/, (req, res, next) => {
    // Let the request pass through if another route handler is about to
    // match it. The 404/405 catch-all sits at the very end of the chain.
    if (req.method === "OPTIONS") return next();

    return res.status(404).json({
      error: "Not Found",
      code: "not_found",
      path: req.path,
    });
  });

  if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(
      express.static(distPath, {
        etag: true,
        setHeaders(res, filePath) {
          const normalized = filePath.replace(/\\/g, "/");
          if (normalized.includes("/assets/")) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          } else if (
            /\/(?:index\.html|sw\.js|sw-legacy-cleanup\.js|manifest\.webmanifest)$/.test(normalized)
          ) {
            res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");
            if (normalized.endsWith("/sw.js")) res.setHeader("Service-Worker-Allowed", "/");
          } else {
            res.setHeader("Cache-Control", "public, max-age=86400");
          }
        },
      }),
    );
    // SPA fallback: any non-/api GET that didn't match a router above
    // gets index.html so client-side routing works on refresh. Requests for
    // missing files must remain 404; returning HTML with status 200 makes PWA
    // installation fail with a misleading "invalid image" error.
    app.get(/^\/(?!api\/).*/, (req, res) => {
      if (path.extname(req.path)) {
        return res.status(404).type("text/plain").send("Not Found");
      }
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      return res.sendFile(path.join(distPath, "index.html"));
    });
  }

  return await new Promise<Server>((resolve, reject) => {
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
      resolve(server);
    });
    server.once("error", reject);
  });
}

export { app, startServer };

// ─── Phase 1 helpers: dataset capture ────────────────────────────────────────
