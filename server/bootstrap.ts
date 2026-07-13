import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { google } from "googleapis";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { resolveGacha, generateServerCard, CARD_TOTAL } from "../server/lib/cards.js";
import { GoogleGenAI } from "@google/genai";
import { datasetCurator, DatasetCurator as DatasetCuratorClass } from "../server/services/datasetCurator";
import { uploadToDataset } from "../server/services/cloudinaryDataset";
import { getDb as getResearchDb } from "../server/db";
import { initDb, isDbConnected, getDb, setFirestore } from "../server/db.js";
import { listRewards, upsertReward, deleteRewardById, isRewardsDbConfigured } from "../server/rewardsDb.js";
import { decideScanReward, getScanRewardConfig } from "../server/services/scanRewards";
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
import { userPreferencesRouter } from "../server/routes/userPreferences.js";
import { localeMiddleware } from "../server/services/localeRouter.js";
import { getErrorMessage, err } from "../server/services/errorMessages.js";
import { createSessionToken, validateToken } from "../server/auth.js";
import { initSessionStore } from "../server/services/sessionStore.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ─── Locale middleware (Phase 5 of i18n plan) ──────────────────────────────
// Resolves the requester's preferred locale from explicit header, then
// Accept-Language, then GeoIP. Attaches `req.locale` for downstream routes
// (error messages, email templates, audit logging).
app.use(localeMiddleware);

// ─── Session token management (shared via ./server/auth.ts) ───────────────────

// ─── Auth Middleware ─────────────────────────────────────────────────────────
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const result = validateToken(req.headers.authorization);
  if (!result) return res.status(401).json({ error: getErrorMessage("error.unauthorized", (req as any).locale?.locale) });
  (req as any).userNick = result.nick;
  (req as any).isAdmin = result.isAdmin;
  next();
}

// ─── Admin Auth Middleware ───────────────────────────────────────────────────
async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const apiKey = req.headers["x-admin-key"] as string | undefined;
  const apiKeyHeader = process.env.ADMIN_API_KEY;

  if (apiKeyHeader && apiKey && apiKey === apiKeyHeader) {
    return next();
  }

  const result = validateToken(req.headers.authorization);
  if (!result) return res.status(401).json({ error: "Unauthorized" });
  (req as any).userNick = result.nick;
  (req as any).isAdmin = result.isAdmin;
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
  const admins = allUsers.filter(u => u.role === "admin").length;
  const activeUsers = allUsers.filter(u => {
    if (!u.progress?.lastUpdateDate) return false;
    const last = new Date(u.progress.lastUpdateDate);
    const diff = Date.now() - last.getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  }).length;
  return { total, admins, activeUsers, researchActive7d: undefined, researchActive1d: undefined, experimentCount: undefined };
}

// Security middleware — installed before any routes so even error handlers
// benefit from the headers. See server/middleware/security.ts for tunables.
app.use(buildHelmet());
app.use(buildCors());
app.use(buildCsp());
app.use(buildSecureCookies());

// Auth-only endpoints get the tightest limit. Wire BEFORE the default
// limiter so the default doesn't claim the request first.
app.use("/api/auth", buildAuthRateLimiter());
app.use("/auth", buildAuthRateLimiter());

// Body parsing — placed AFTER the CORS preflight handlers so OPTIONS
// short-circuits don't try to parse a body.
app.use(express.json({ limit: "50mb" }));

// Write-heavy endpoints get the scan limiter, mounted before their route
// declaration. Each route file is responsible for re-mounting if it needs a
// tighter limit (e.g., /api/federated/submit uses 30/min).
app.use("/api/scan-garbage", buildScanRateLimiter());

// Default limiter catches everything else — generous so legitimate clients
// never hit it, tight enough to make abuse expensive.
app.use(buildDefaultRateLimiter());

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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

    const textBody = `Người chơi: ${user.name} (Tài khoản: ${user.account_id})\nĐã mua: ${itemName}\nSố điểm (Lõi Năng Lượng) hiện tại: ${user.points}`;
    const htmlBody = `
       <div style="font-family: sans-serif;">
           <h2 style="color: #7c3aed;">Yêu cầu mua vật phẩm mới!</h2>
           <p><strong>Người chơi:</strong> ${user.name} (Tài khoản: ${user.account_id})</p>
           <p><strong>Vật phẩm:</strong> <span style="color: #7c3aed; font-weight: bold;">${itemName}</span></p>
           <p><strong>Số điểm còn lại:</strong> <span style="color: #10b981;">${user.points} Lõi Năng Lượng</span></p>
       </div>
    `;

    if (!process.env.RESEND_API_KEY) {
       console.warn("[Email] Bỏ qua vì chưa có RESEND_API_KEY.");
       return;
    }

    const { data, error } = await resend.emails.send({
      from: "EcoQuest <onboarding@resend.dev>",
      to: "leoxkas280@gmail.com",
      subject: `EcoQuest: ${user.name} vừa mua ${itemName}!`,
      text: textBody,
      html: htmlBody,
    });
    if (error) {
      console.error("[Email] Resend error:", error);
    } else {
      console.log(`[Email] Purchase notification sent, ID: ${data?.id}`);
    }
  } catch (e) {
    console.error("[Email] Failed to send purchase notification:", e);
  }
}

async function sendCraftEmail(user: any, craftedItemId: any, redeemInfo?: { fullName: string, class: string }) {
  try {
     const itemNameMap: Record<number, string> = {
       1: "Voucher Fahasa 50.000đ",
       2: "Bình nước Eco-friendly 500ml",
       3: "Bình Giữ Nhiệt Lock&Lock",
       4: "Voucher Fahasa 100.000đ"
     };
     const itemName = itemNameMap[Number(craftedItemId)] || `Quà ID ${craftedItemId}`;
     
     let textBody = `Người chơi: ${user.name} (Tài khoản: ${user.account_id})\nĐã đổi quà tặng: ${itemName} (Mã Quà: ${craftedItemId})\nSố điểm (Lõi Năng Lượng) hiện tại: ${user.points}`;
     let htmlBody = `
        <div style="font-family: sans-serif; p { margin: 5px 0 }">
            <h2 style="color: #059669">Yêu cầu đổi quà mới!</h2>
            <p><strong>Người chơi:</strong> ${user.name} (Tài khoản: ${user.account_id})</p>
            <p><strong>Quà tặng:</strong> <span style="color: #ea580c; font-weight: bold;">${itemName}</span> (Mã Quà: ${craftedItemId})</p>
            <p><strong>Số điểm còn lại:</strong> <span style="color: #10b981;">${user.points} Lõi Năng Lượng</span></p>
     `;

     if (redeemInfo && redeemInfo.fullName) {
       textBody += `\n\n--- Thông tin người nhận ---\nHọ và tên: ${redeemInfo.fullName}\nLớp: ${redeemInfo.class || 'Không có'}`;
       htmlBody += `
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0"/>
          <h3 style="color: #4b5563">Thông tin người nhận</h3>
          <p><strong>Họ và tên:</strong> ${redeemInfo.fullName}</p>
          <p><strong>Lớp/Đơn vị:</strong> ${redeemInfo.class || 'Không có'}</p>
       `;
     }
     htmlBody += "</div>";
     
     if (!process.env.RESEND_API_KEY) {
        console.warn("[Email] Bỏ qua vì chưa có RESEND_API_KEY.");
        return;
     }

    const { data, error } = await resend.emails.send({
       from: "EcoQuest <onboarding@resend.dev>",
       to: "leoxkas280@gmail.com",
       subject: `EcoQuest: ${user.name} vừa đổi quà ${itemName}!`,
       text: textBody,
       html: htmlBody,
    });
    if (error) {
       console.error("[Email] Resend error:", error);
    } else {
       console.log(`[Email] Notification sent, ID: ${data?.id}`);
    }
  } catch (e) {
     console.error("[Email] Failed to send notification:", e);
  }
}

// In-memory Database (Fallback)
const DB_FILE = path.join(process.cwd(), "data.json");
let users: User[] = [];

// Initialize Firebase Admin if available
let db: admin.firestore.Firestore | null = null;
const secretRaw =
  process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ||
  process.env.FIREBASE_SERVICE_ACCOUNT;

if (secretRaw) {
  try {
    const isBase64 = !secretRaw.trim().startsWith("{");
    const serviceAccountStr = isBase64
      ? Buffer.from(secretRaw, "base64").toString("utf8")
      : secretRaw;
    const serviceAccount = JSON.parse(serviceAccountStr);
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
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
      db = admin.firestore();
      setFirestore(db);
    } else {
      const customApp = admin.initializeApp(
        {
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id,
        },
        "custom",
      );
      db = getFirestore(customApp, dbId);
      setFirestore(db);
    }
    console.log("Firebase Admin Initialized successfully!");

    // Auto sync from data.json to Firebase if it has users
    if (fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
      if (data.users && data.users.length > 0) {
        console.log(`Syncing ${data.users.length} users to Firebase...`);
        // Batch sync in chunks of 50 with delays to avoid Firestore quota exhaustion
        (async () => {
          const BATCH = 50;
          const DELAY_MS = 200;
          for (let i = 0; i < data.users.length; i += BATCH) {
            const batch = data.users.slice(i, i + BATCH);
            const promises = batch.map(async (u) => {
              try {
                const docRef = db!.collection("users").doc(u.nick.toLowerCase());
                const doc = await docRef.get();
                if (doc.exists) {
                  await docRef.update({ name: u.name, pass: u.pass });
                } else {
                  await docRef.set(u);
                }
              } catch (e) {
                // Silently skip individual failures to avoid quota errors
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
  flashcardCounts: Record<number, number>;
  flashcardNames?: Record<number, string>;
  checkins: number[];
  traded: number[];
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
  points: number;
  hasPlayed: boolean;
  account_id: string;
  role?: string;
  progress?: UserProgress;
  selectedAvatar?: string;
  selectedFrame?: string;
  customAvatarUrl?: string;
  shards?: number;
}

interface GameProgress {
  flashcardsRead: number[];
  flashcardCounts: Record<string, number>;
  flashcardNames?: Record<number, string>;
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
  if (!db) return null;
  const doc = await db.collection("user_progress").doc(nick.toLowerCase()).get();
  if (!doc.exists) return null;
  const progress = doc.data() as GameProgress;
  if (progress.flashcardCounts) {
    const normalized: Record<number, number> = {};
    for (const [k, v] of Object.entries(progress.flashcardCounts)) {
      normalized[Number(k)] = v;
    }
    progress.flashcardCounts = normalized as Record<string, number>;
  }
  return progress;
}

async function saveGameProgress(nick: string, progress: GameProgress) {
  if (!db) {
    console.log(`[saveGameProgress] No db, skipping save for ${nick}`);
    return;
  }
  try {
    await db.collection("user_progress").doc(nick.toLowerCase()).set(progress, { merge: true });
    console.log(`[saveGameProgress] Saved to user_progress/${nick.toLowerCase()}:`, JSON.stringify(progress.flashcardCounts || {}));
  } catch (e) {
    console.error(`[saveGameProgress] Failed to save progress for ${nick}:`, e?.message || e);
    // Don't throw — the in-memory state is already updated; the caller should still return success
  }
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

// Load data fallback
if (fs.existsSync(DB_FILE)) {
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    users = data.users || [];
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
  options?: { reason?: string; source?: string; multiplier?: number; pointsBalance?: number }
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
      ]
    );
  } catch (e) {
    console.warn("[RewardTx] Failed to log:", (e as Error).message);
  }
}

async function getUser(nick: string): Promise<User | undefined> {
  const normNick = (nick || "").trim().toLowerCase();
  if (db) {
    const doc = await db.collection("users").doc(normNick).get();
    if (doc.exists) {
      const user = doc.data() as User;
      if (user.progress?.flashcardCounts) {
        const normalized: Record<number, number> = {};
        for (const [k, v] of Object.entries(user.progress.flashcardCounts)) {
          normalized[Number(k)] = v;
        }
        user.progress.flashcardCounts = normalized;
      }
      return user;
    }
  }
  return users.find((u) => u.nick.toLowerCase() === normNick);
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
  id: string; challengerId: string; opponentId: string;
  challengerName: string; opponentName: string;
  challengerWager: number; opponentWager: number;
  winnerId?: string; challengerResult?: "win" | "lose" | "pending";
  opponentResult?: "win" | "lose" | "pending";
  stake: number; status: "matched" | "battle" | "completed";
  createdAt: number; updatedAt: number; rounds: any[];
}

interface TournamentParticipant { userId: string; name: string; points: number; weeklyScore: number; joinedAt: number; }
interface TournamentMatch { id: string; player1Id: string; player1Name: string; player2Id: string | null; player2Name: string | null; winnerId?: string; status: "pending" | "live" | "completed"; player1Score?: number; player2Score?: number; }

function generateBracket(participants: TournamentParticipant[]): { rounds: { round: number; name: string; matches: TournamentMatch[] }[] } {
  // Single-elimination bracket: round of 8 → quarter → semi → final
  const byes = 8 - participants.length;
  const bracket: { rounds: { round: number; name: string; matches: TournamentMatch[] }[] } = { rounds: [] };

  // Round 1 (Quarter-finals or pre-qualifier if < 8)
  const qfMatches: TournamentMatch[] = [];
  const sorted = [...participants].sort((a, b) => b.weeklyScore - a.weeklyScore);
  for (let i = 0; i < 8; i += 2) {
    const p1 = sorted[i];
    const p2 = i + 1 < sorted.length ? sorted[i + 1] : null;
    if (p1) {
      qfMatches.push({
        id: `qf_${i}`,
        player1Id: p1.userId, player1Name: p1.name,
        player2Id: p2?.userId || null, player2Name: p2?.name || "BYE",
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
      player1Id: "", player1Name: "???",
      player2Id: null, player2Name: "???",
      status: "pending",
    });
  }
  bracket.rounds.push({ round: 2, name: "Bán kết", matches: sfMatches });

  // Finals
  bracket.rounds.push({
    round: 3, name: "Chung kết",
    matches: [{
      id: "final",
      player1Id: "", player1Name: "???",
      player2Id: null, player2Name: "???",
      status: "pending",
    }],
  });

  return bracket;
}

async function saveUser(user: User, isNew: boolean = false): Promise<void> {
  const normNick = user.nick.toLowerCase();
  if (db) {
    try {
      // Always use merge to never accidentally delete existing fields like progress
      await db.collection("users").doc(normNick).set(user, { merge: true });
    } catch (e) {
      console.error(`[saveUser] Failed to save ${normNick} to Firestore:`, e?.message || e);
      // Fallback to in-memory storage if Firestore is unavailable
      if (isNew) {
        const exists = users.some((u) => u.nick.toLowerCase() === normNick);
        if (!exists) users.push(user);
      }
      saveData();
    }
  } else {
    if (isNew) users.push(user);
    saveData();
  }
}

async function getAllUsers(): Promise<User[]> {
  if (db) {
    const snap = await db.collection("users").get();
    return snap.docs.map((d) => d.data() as User);
  }
  return users;
}

import Groq from "groq-sdk";

let groqClient: Groq | null = null;
function getGroqClient() {
  if (!groqClient && process.env.GROQ_API_KEY) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

// 1. Robot Webhook
app.post("/api/robot", async (req, res) => {
  try {
    const { nickname, key } = req.body;
    if (key !== "BMO_ROBOT_2025") {
      res.json({ result: "error", message: "Sai mã bảo mật" });
      return;
    }

    const user = await getUser(nickname);
    if (user) {
      user.points += 10;
      await saveUser(user);
      writeGoogleSheetsLog(
        "1xqrjBMynOYuqGbvmBbuEHXFWZT0ZpwQE6Uy2N7tkr-Q",
        nickname,
        "Robot cộng 10 điểm",
        10,
      );
      res.json({
        result: "success",
        nickname: user.nick,
        new_points: user.points,
      });
    } else {
      res.json({ result: "error", message: "Không tìm thấy user" });
    }
  } catch (e: any) {
    res.json({ result: "error", message: e.toString() });
  }
});

// 2. Auth APIs
app.post("/api/login", async (req, res) => {
  const { login_nickname, login_password } = req.body;

  let user;
  try {
    user = await getUser(login_nickname);
  } catch (e) {
    console.error("[login] getUser failed:", e?.message || e);
    return res.status(500).json({ success: false, message: "Lỗi server, vui lòng thử lại." });
  }

  if (user) {
    if (user.pass === login_password) {

      // Auto grant admin if nickname starts with admin
      let role = user.role;
      if (login_nickname.toLowerCase().startsWith('admin')) {
        role = 'admin';
        if (user.role !== 'admin') {
          user.role = 'admin';
          try {
            await saveUser(user);
          } catch (e) {
            console.error("[login] saveUser failed:", e?.message || e);
          }
        }
      }

      const token = createSessionToken(user.nick);

      // Research: Register in research DB if not exists, assign personality
      const accountId = user.account_id;
      if (isDbConnected()) {
        try {
          const { getDb } = await import("../server/db.js");
          const db = getDb();
          if (db) {
            await db.query(
              `INSERT INTO research_users (user_id, username, full_name, class_grade)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (user_id) DO UPDATE SET
                 username = EXCLUDED.username,
                 last_active = NOW()`,
              [
                accountId,
                user.name,
                user.fullName || null,
                user.classGrade || null,
              ]
            );
            const existingProfile = await personalityEngine.getPersonality(accountId);
            if (existingProfile === "friendly") {
              await personalityEngine.assignPersonality(accountId, 1);
            }
            const currentProfile = await behavioralProfiler.getProfile(accountId);
            if (!currentProfile) {
              setTimeout(async () => {
                try {
                  await behavioralProfiler.profileUser(accountId);
                } catch (e) {
                  console.warn("[BehavioralProfiler] Failed:", e);
                }
              }, 1000);
            }
          }
        } catch (e) {
          console.warn("[Login] Research registration failed:", e);
        }
      }

      // Research: Log login event
      try {
        await eventLogger.logLogin(accountId);
      } catch (e) {
        console.error("[login] logLogin failed:", e?.message || e);
      }

      // Research: Check for novelty decay and trigger intervention if needed
      if (isDbConnected()) {
        setTimeout(async () => {
          try {
            const shouldIntervene = await noveltyDecayDetector.shouldTriggerIntervention(accountId);
            if (shouldIntervene) {
              const interventions = await noveltyDecayDetector.getRecommendedInterventions(accountId);
              if (interventions.length > 0) {
                await noveltyDecayDetector.triggerIntervention(accountId, interventions[0]);
              }
            }
          } catch (e) {
            console.warn("[NoveltyDecay] Intervention check failed:", e);
          }
        }, 5000);
      }

      res.json({
        success: true,
        token,
        nickname: user.name,
        points: user.points,
        account_id: user.nick,
        role: role,
        selectedAvatar: user.selectedAvatar,
        selectedFrame: user.selectedFrame,
        full_name: user.fullName || null,
        class_grade: user.classGrade || null,
        email: user.email || null,
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
  const { reg_name, reg_nickname, reg_password, reg_email, reg_class_grade, reg_full_name } = req.body;
  const name = (reg_name || "").trim();
  const nick = (reg_nickname || "").trim();
  const pass = reg_password;
  const email = (reg_email || "").trim();
  const classGrade = (reg_class_grade || "").trim();
  const fullName = (reg_full_name || "").trim();

  if (nick.length < 4) {
    res.json({ success: false, message: "Tài khoản phải trên 4 ký tự!" });
    return;
  }
  if (!/^[a-zA-Z0-9_]+$/.test(nick)) {
    res.json({
      success: false,
      message: "Nickname không được chứa dấu cách/ký tự lạ!",
    });
    return;
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.json({ success: false, message: "Email không hợp lệ!" });
    return;
  }
  if (classGrade && !/^[1-9]|1[0-2]$/.test(classGrade)) {
    res.json({ success: false, message: "Lớp không hợp lệ (1-12)!" });
    return;
  }
  if (fullName.length > 100) {
    res.json({ success: false, message: "Họ tên quá dài (tối đa 100 ký tự)!" });
    return;
  }

  let existing;
  try {
    existing = await getUser(nick);
  } catch (e) {
    console.error("[register] getUser failed:", e?.message || e);
    return res.status(500).json({ success: false, message: "Lỗi server, vui lòng thử lại." });
  }
  if (existing) {
    res.json({ success: false, message: "Tài khoản này đã tồn tại!" });
    return;
  }

  const role = nick.toLowerCase().startsWith('admin') ? 'admin' : 'user';
  const accountId = crypto.randomUUID();
  const newUser = {
    name,
    nick,
    pass,
    email,
    classGrade,
    fullName,
    points: 0,
    hasPlayed: false,
    account_id: accountId,
    role,
  };
  try {
    await saveUser(newUser, true);
  } catch (e) {
    console.error("[register] saveUser failed:", e?.message || e);
  }

  // Research: Register in research DB and assign personality.
  // The username column persists the original "Tên hiển thị" so existing
  // dashboards keep working; full_name and class_grade are stored alongside.
  if (isDbConnected()) {
    try {
      const { getDb } = await import("../server/db.js");
      const db = getDb();
      if (db) {
        await db.query(
          `INSERT INTO research_users (user_id, username, full_name, class_grade)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id) DO UPDATE SET
             username = EXCLUDED.username,
             full_name = COALESCE(EXCLUDED.full_name, research_users.full_name),
             class_grade = COALESCE(EXCLUDED.class_grade, research_users.class_grade)`,
          [accountId, name, fullName || null, classGrade || null]
        );
        await personalityEngine.assignPersonality(accountId, 1);
        await eventLogger.log(accountId, "register", {
          timestamp: new Date().toISOString(),
          class_grade: classGrade || null,
          full_name: fullName || null,
        });
      }
    } catch (e) {
      console.warn("[Auth] Registration research tasks failed:", e);
    }
  }

  res.json({
    success: true,
    message: "Đăng ký thành công! Hãy đăng nhập.",
    account_id: accountId,
  });
});

app.post("/api/change-password", async (req, res) => {
  const { cp_nickname, cp_old_pass, cp_new_pass } = req.body;

  let user;
  try {
    user = await getUser(cp_nickname);
  } catch (e) {
    console.error("[change-password] getUser failed:", e?.message || e);
    return res.status(500).json({ success: false, message: "Lỗi server, vui lòng thử lại." });
  }
  if (user) {
    if (user.pass === cp_old_pass) {
      user.pass = cp_new_pass;
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

app.post("/api/reward", async (req, res) => {
  try {
    const { nickname, points, reason } = req.body;
    const user = await getUser(nickname);
    if (user) {
      // Calculate streak multiplier for positive rewards
      let effectivePoints = points;
      let effectiveMultiplier = 1;
      let adaptiveMessage = "";
      if (points > 0) {
        const progress = await getGameProgress(nickname);
        const streakDays = progress?.streakDays || 1;
        effectiveMultiplier = Math.min(1 + (streakDays - 1) * 0.1, 2); // max 2x
        effectivePoints = Math.round(points * effectiveMultiplier);

        // Research: Adaptive reward based on behavioral profile
        if (isDbConnected()) {
          try {
            const adaptiveResult = await adaptiveRewardEngine.computeReward(user.account_id, points, reason || "reward");
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
      user.points += effectivePoints;
      await saveUser(user);

      if (db) {
         try {
           await db.collection("users").doc(nickname.toLowerCase()).collection("reward_history").add({
              timestamp: new Date().toISOString(),
              reason: reason || "Thử thách xanh",
              pointsAdded: effectivePoints,
              originalPoints: points,
              streakMultiplier: effectiveMultiplier,
           });
         } catch (e) {}
      }

      // Research: Log reward event
      await eventLogger.logReward(user.account_id, effectivePoints, 0, reason || "reward");
      await logRewardTransaction(user.account_id, effectivePoints > 0 ? "earn" : "spend", effectivePoints, {
        reason: reason || "reward",
        source: "gameplay",
        multiplier: effectiveMultiplier,
        pointsBalance: user.points,
      });

      writeGoogleSheetsLog(
        "1xqrjBMynOYuqGbvmBbuEHXFWZT0ZpwQE6Uy2N7tkr-Q",
        nickname,
        reason || "Thử thách xanh",
        effectivePoints,
      );
      res.json({
        success: true,
        points: user.points,
        earnedPoints: effectivePoints,
        multiplier: effectiveMultiplier,
        adaptiveMessage: adaptiveMessage || undefined
      });
    } else {
      err(res, 404, "error.notFound", req as any);
    }
  } catch (error) {
    err(res, 500, "error.internal", req as any);
  }
});

app.post("/api/change-name", async (req, res) => {
  const { cn_nickname, cn_newname, cn_password } = req.body;
  const newName = (cn_newname || "").trim();

  if (!newName) {
    res.json({ success: false, message: "Tên hiển thị không được để trống!" });
    return;
  }

  const user = await getUser(cn_nickname);
  if (user) {
    if (user.pass === cn_password) {
      user.name = newName;
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
app.post("/api/profile/meta", async (req, res) => {
  const { nickname, full_name, class_grade } = req.body;
  const nick = (nickname || "").trim();

  if (!nick) {
    return res.status(400).json({ success: false, message: "Thiếu tên tài khoản." });
  }
  const cleanedFullName = (full_name || "").trim();
  const cleanedClass = (class_grade || "").trim();
  if (cleanedClass && !/^([1-9]|1[0-2])$/.test(cleanedClass)) {
    return res.status(400).json({ success: false, message: "Lớp không hợp lệ (1-12)." });
  }
  if (cleanedFullName.length > 100) {
    return res.status(400).json({ success: false, message: "Họ tên quá dài (tối đa 100 ký tự)." });
  }

  try {
    const user = await getUser(nick);
    if (!user) {
      return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản." });
    }
    if (cleanedFullName) user.fullName = cleanedFullName;
    if (cleanedClass) user.classGrade = cleanedClass;
    await saveUser(user);

    // Mirror the profile metadata into the research DB so dashboards see it.
    if (isDbConnected()) {
      try {
        const { getDb } = await import("../server/db.js");
        const db = getDb();
        if (db && user.account_id) {
          await db.query(
            `UPDATE research_users
             SET full_name = COALESCE($2, full_name),
                 class_grade = COALESCE($3, class_grade)
             WHERE user_id = $1`,
            [user.account_id, user.fullName || null, user.classGrade || null]
          );
        }
      } catch (e) {
        console.warn("[profile/meta] research_users sync failed:", (e as Error).message);
      }
    }

    return res.json({
      success: true,
      message: "Đã cập nhật hồ sơ.",
      full_name: user.fullName || null,
      class_grade: user.classGrade || null,
    });
  } catch (e) {
    console.error("[profile/meta] error:", (e as Error).message);
    return res.status(500).json({ success: false, message: "Lỗi server." });
  }
});

// Update avatar/frame preference
app.post("/api/update-preference", async (req, res) => {
  const { nickname, selectedAvatar, selectedFrame } = req.body;
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

// Update profile (name + avatar + frame) — password-confirmed, optional session auth
app.put("/api/profile", async (req, res) => {
  const { nickname, name, selectedAvatar, selectedFrame, customAvatarUrl, pass } = req.body;
  try {
    const authHeader = req.headers.authorization;
    const authNick = authHeader
      ? validateToken(authHeader)?.nick
      : undefined;

    const targetUser = await getUser(nickname);
    if (!targetUser) {
      return res.json({ success: false, message: "Không tìm thấy tài khoản" });
    }

    if (pass === undefined || pass !== targetUser.pass) {
      return res.status(401).json({ success: false, message: "Mật khẩu xác nhận không đúng" });
    }

    if (authNick && authNick !== nickname) {
      const authUser = await getUser(authNick);
      if (!authUser || authUser.role !== "admin") {
        return res.status(403).json({ success: false, message: "Không có quyền chỉnh sửa" });
      }
    }

    if (name !== undefined) {
      const trimmed = (name || "").trim();
      if (!trimmed) return res.json({ success: false, message: "Tên không được để trống" });
      targetUser.name = trimmed;
    }
    if (selectedAvatar !== undefined) targetUser.selectedAvatar = selectedAvatar || undefined;
    if (selectedFrame !== undefined) targetUser.selectedFrame = selectedFrame || undefined;
    if (customAvatarUrl !== undefined) targetUser.customAvatarUrl = customAvatarUrl || undefined;
    await saveUser(targetUser);
    res.json({ success: true, user: { name: targetUser.name, selectedAvatar: targetUser.selectedAvatar, selectedFrame: targetUser.selectedFrame, customAvatarUrl: targetUser.customAvatarUrl, points: targetUser.points } });
  } catch (e) {
    console.error("[profile] Error:", e?.message || e);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// Upload custom avatar from device — works with password-confirmed profile flow
app.post("/api/avatar/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, message: "Chỉ chấp nhận ảnh JPG, PNG, GIF, WEBP" });
    }

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
  const sortedUsers = [...allUsers].sort((a, b) => b.points - a.points);
  const top10 = sortedUsers
    .slice(0, 10)
    .map((u) => ({ name: u.name, points: u.points, nick: u.nick }));
  res.json(top10);
});

const defaultRewards = [
  { 
    id: "1", 
    name: "Voucher Fahasa 50.000đ", 
    desc: "Đổi điểm kinh nghiệm lấy Voucher giảm giá 50.000đ khi mua sách tại hệ thống Fahasa.",
    cost: 1500, 
    ingredients: ["Quà tặng thực tế", "E-Voucher"],
    imageUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=200&q=80",
    color: "from-blue-500 to-blue-700",
    bgClass: "bg-blue-50",
    borderClass: "border-blue-200 hover:border-blue-400"
  },
  { 
    id: "2", 
    name: "Bình nước Eco-friendly 500ml", 
    desc: "Bình nước bằng tre, gỗ giữ nhiệt, an toàn sức khỏe, giảm rác nhựa.",
    cost: 1000, 
    ingredients: ["Giảm rác nhựa", "Giao tận nhà"],
    imageUrl: "https://images.unsplash.com/photo-1605651202774-7d573fd3f12d?auto=format&fit=crop&w=200&q=80",
    color: "from-emerald-400 to-green-600",
    bgClass: "bg-emerald-50",
    borderClass: "border-emerald-300 hover:border-emerald-500"
  }
];

app.get("/api/rewards", async (req, res) => {
  try {
    if (isRewardsDbConfigured()) {
      try {
        const rewards = await listRewards();
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
      }
    }

    res.json(defaultRewards);
  } catch (e) {
    console.error("[rewards:get] Error:", e);
    res.json(defaultRewards);
  }
});

app.post("/api/rewards", requireAdmin, async (req, res) => {
  try {
    if (!isRewardsDbConfigured()) {
      return res.status(503).json({ success: false, error: "Rewards database unavailable" });
    }

    const reward = req.body;
    const savedReward = await upsertReward({
      id: reward.id ? reward.id.toString() : Date.now().toString(),
      name: reward.name || "",
      desc: reward.desc || "",
      cost: Number(reward.cost || 0),
      ingredients: Array.isArray(reward.ingredients) ? reward.ingredients : [],
      imageUrl: reward.imageUrl || "",
      color: reward.color || "",
      bgClass: reward.bgClass || "",
      borderClass: reward.borderClass || "",
    });

    res.json({ success: true, reward: savedReward });
  } catch (e) {
    console.error("[rewards:post] Error:", e);
    res.status(500).json({ success: false, error: "Failed to save reward" });
  }
});

// ─── Card Fusion: combine 3 copies → upgraded version ────────────────────────
app.post("/api/cards/fuse", async (req, res) => {
  try {
    const { nickname, cardId } = req.body;
    if (!nickname || !cardId) {
      return res.status(400).json({ success: false, error: "Missing fields" });
    }

    const progress = await getGameProgress(nickname);
    const user = await getUser(nickname);
    if (!user || !progress) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const count = progress.flashcardCounts?.[String(cardId)] || 0;
    if (count < 3) {
      return res.status(400).json({ success: false, error: `Cần 3 thẻ để hợp nhất. Bạn hiện có ${count}.` });
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
    user.points = (user.points || 0) + xpReward;

    await saveGameProgress(nickname, progress);
    await saveUser(user);

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
  }
});

// ─── Card Level Up: spend XP to level up owned cards ─────────────────────────
app.post("/api/cards/levelup", async (req, res) => {
  try {
    const { nickname, cardId } = req.body;
    if (!nickname || !cardId) {
      return res.status(400).json({ success: false, error: "Missing fields" });
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
    const cardLevels: Record<string, number> = (progress as any).cardLevels || {};
    const currentLevel = cardLevels[String(cardId)] || 1;
    const nextLevel = currentLevel + 1;
    const xpCost = nextLevel * nextLevel * 30; // 120, 270, 480, 750...

    if ((user.points || 0) < xpCost) {
      return res.status(400).json({ success: false, error: `Cần ${xpCost} EXP để lên cấp ${nextLevel}. Bạn chỉ có ${user.points}.` });
    }

    user.points -= xpCost;
    cardLevels[String(cardId)] = nextLevel;
    (progress as any).cardLevels = cardLevels;

    await saveGameProgress(nickname, progress);
    await saveUser(user);

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
  }
});

// ─── Shard purchase ───────────────────────────────────────────────────────────
// Shard shop items (synchronized with client-side SHARD_SHOP_ITEMS)
// type: "card" | "xp_boost" | "frame"
const SHARD_SHOP_DEFINITIONS = [
  { id: "xp_50", type: "xp_boost", cost: 5, xpBonus: 50 },
  { id: "xp_200", type: "xp_boost", cost: 15, xpBonus: 200 },
  { id: "xp_1000", type: "xp_boost", cost: 60, xpBonus: 1000 },
];
const CARD_SHOP_ITEMS: Record<string, { rarity: string; element: string; cardId: number }> = {
  shard_rare_1:   { rarity: "rare",      element: "plastic", cardId: 11  },
  shard_rare_2:   { rarity: "rare",      element: "organic", cardId: 151 },
  shard_epic_1:   { rarity: "epic",      element: "hazard",  cardId: 201 },
  shard_epic_2:   { rarity: "epic",      element: "metal",   cardId: 251 },
  shard_legendary:{ rarity: "legendary", element: "hazard",  cardId: 301 },
};

app.post("/api/shards/purchase", requireAuth, async (req, res) => {
  try {
    const { nickname, itemId } = req.body;
    if (!nickname || !itemId) {
      return res.status(400).json({ success: false, error: "Missing fields" });
    }

    const progress = await getGameProgress(nickname);
    const user = await getUser(nickname);
    if (!user || !progress) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const shardCosts: Record<string, number> = {
      xp_50: 5, xp_200: 15, xp_1000: 60,
      shard_rare_1: 20, shard_rare_2: 20,
      shard_epic_1: 50, shard_epic_2: 50,
      shard_legendary: 120,
    };
    const cost = shardCosts[itemId];
    if (!cost) {
      return res.status(400).json({ success: false, error: "Item not found" });
    }

    const currentShards = progress.shards || 0;
    if (currentShards < cost) {
      return res.status(400).json({ success: false, error: `Need ${cost} shards. You have ${currentShards}.` });
    }

    progress.shards = currentShards - cost;

    // Handle XP boost — add directly to user points
    if (itemId.startsWith("xp_")) {
      const def = SHARD_SHOP_DEFINITIONS.find((d) => d.id === itemId);
      const xpBonus = def ? def.xpBonus : 0;
      user.points = (user.points || 0) + xpBonus;
      await saveGameProgress(nickname, progress);
      await saveUser(user);
      return res.json({ success: true, shardsRemaining: progress.shards, xpAwarded: xpBonus, remainingPoints: user.points });
    }

    // Handle card purchase
    const cardDef = CARD_SHOP_ITEMS[itemId];
    if (cardDef) {
      const cardId = cardDef.cardId;
      const serverCard = generateServerCard(cardId);
      progress.flashcardCounts = progress.flashcardCounts || {};
      progress.flashcardCounts[String(cardId)] = (progress.flashcardCounts[String(cardId)] || 0) + 1;
      if (!progress.flashcardsRead.includes(cardId)) {
        progress.flashcardsRead.push(cardId);
      }
      await saveGameProgress(nickname, progress);
      await saveUser(user);
      return res.json({
        success: true,
        shardsRemaining: progress.shards,
        card: serverCard,
        isNew: !progress.flashcardsRead.includes(cardId),
      });
    }

    res.status(400).json({ success: false, error: "Unhandled item type" });
  } catch (e) {
    console.error("[shards:purchase] Error:", e);
    res.status(500).json({ success: false, error: "Purchase failed" });
  }
});

// ─── Get card levels ─────────────────────────────────────────────────────────
app.get("/api/cards/levels/:nickname", async (req, res) => {
  try {
    const progress = await getGameProgress(req.params.nickname);
    const levels: Record<string, number> = (progress as any)?.cardLevels || {};
    res.json(levels);
  } catch (e) {
    res.status(500).json({});
  }
});

// ─── Multi-card gacha pull ───────────────────────────────────────────────────
// POST /api/cards/gacha-pull { nickname, count }
// Returns an array of resolved cards (max 10) with isNew + shardsAwarded flags.
app.post("/api/cards/gacha-pull", async (req, res) => {
  try {
    const { nickname, count: rawCount } = req.body || {};
    if (!nickname || typeof nickname !== "string") {
      return res.status(400).json({ success: false, error: "Missing nickname" });
    }
    const count = Math.max(1, Math.min(10, Number.parseInt(String(rawCount ?? 1), 10) || 1));

    const user = await getUser(nickname);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const progress = await getGameProgress(nickname);
    progress.flashcardCounts = progress.flashcardCounts || {};
    progress.flashcardNames = progress.flashcardNames || {};
    if (!Array.isArray(progress.flashcardsRead)) progress.flashcardsRead = [];

    const currentPullCount = (progress as any).gachaPullCount ?? 0;
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

      progress.flashcardCounts[String(pulledCardId)] = (progress.flashcardCounts[String(pulledCardId)] || 0) + 1;
      if (isNew) progress.flashcardsRead.push(pulledCardId);

      let shardsAwarded = 0;
      if (!isNew) {
        progress.shards = (progress.shards || 0) + 3;
        shardsAwarded = 3;
        totalShardsAwarded += 3;
      }

      cards.push({ ...pulledCard, isNew, shardsAwarded });
    }

    (progress as any).gachaPullCount = currentPullCount + count;
    await saveGameProgress(nickname, progress);

    const cardLevels: Record<string, number> = (progress as any).cardLevels || {};
    const enrichedCards = cards.map((c) => ({ ...c, cardLevel: cardLevels[String(c.id)] || 1 }));

    res.json({
      success: true,
      cards: enrichedCards,
      totalShardsAwarded,
      progress,
    });
  } catch (error: any) {
    console.error("[gacha-pull] Error:", error?.message || error);
    res.status(500).json({ success: false, error: "Gacha pull failed" });
  }
});

app.post("/api/admin/unlock-all-cards", requireAdmin, async (req, res) => {
  try {
    const { nickname } = req.body;
    if (!nickname) return res.status(400).json({ success: false, error: "Missing nickname" });

    const CARD_TOTAL_USED = CARD_TOTAL;
    const flashcardCounts: Record<string, number> = {};
    for (let i = 1; i <= CARD_TOTAL_USED; i++) {
      flashcardCounts[String(i)] = 3;
    }

    const progress = await getGameProgress(nickname);
    const updated = {
      ...(progress || {}),
      flashcardsRead: Array.from({ length: CARD_TOTAL_USED }, (_, i) => i + 1),
      flashcardCounts,
    } as GameProgress;

    await saveGameProgress(nickname, updated);
    console.log(`[unlock-all-cards] Unlocked ${CARD_TOTAL_USED} cards for ${nickname}`);
    res.json({ success: true, message: `Đã mở khóa ${CARD_TOTAL_USED} thẻ cho ${nickname}` });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || "Lỗi" });
  }
});

app.delete("/api/rewards/:id", requireAdmin, async (req, res) => {
  try {
    if (!isRewardsDbConfigured()) {
      return res.status(503).json({ success: false, error: "Rewards database unavailable" });
    }

    await deleteRewardById(req.params.id);
    res.json({ success: true });
  } catch (e) {
    console.error("[rewards:delete] Error:", e);
    res.status(500).json({ success: false, error: "Failed to delete" });
  }
});

app.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const allUsers = await getAllUsers();
    res.json(allUsers.map(u => ({ name: u.name, nick: u.nick, points: u.points, role: u.role || 'user', account_id: u.account_id })));
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
         usersList = allUsers.slice(0, 5).map(u => ({ id: u.account_id, name: u.name, points: u.points, badge: u.points > 100 ? "🌿" : "🌱" }));
       } catch (err) {}
       
       // stations
       try {
         const stationsSnap = await db.collection("stations").get();
         stationsList = stationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
       } catch (err) {}
       
       // barter items
       try {
         const barterSnap = await db.collection("barter").get();
         barterList = barterSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
       } catch (err) {}
    } else {
       const allUsers = await getAllUsers();
       usersList = allUsers.slice(0, 5).map(u => ({ id: u.account_id, name: u.name, points: u.points, badge: "🌱" }));
    }
    
    res.json({ users: usersList, stations: stationsList, barterItems: barterList });
  } catch (e) {
    res.json({ users: [], stations: [], barterItems: [] });
  }
});

app.get("/api/user/:nick", async (req, res) => {
  const user = await getUser(req.params.nick);
  const progress = await getGameProgress(req.params.nick);
  if (user) {
    res.json({
      name: user.name,
      points: user.points,
      hasPlayed: user.hasPlayed,
      progress: progress || user.progress || null,
      selectedAvatar: user.selectedAvatar,
      selectedFrame: user.selectedFrame,
      shards: (progress?.shards ?? user.progress?.shards ?? user.shards ?? 0),
    });
  } else {
    res.status(404).json({ message: "Not found" });
  }
});

// User Progress & Guild Progress APIs
app.post("/api/user-progress", async (req, res) => {
  try {
    const { nickname, type, data, redeemInfo, pullCount } = req.body;
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

    const todayStr = new Date().toDateString();

    // Initialize or reset daily progress if it's a new day
    if (!progress || progress.lastUpdateDate !== todayStr) {
      let newStreak = 1;
      if (progress && progress.lastUpdateDate) {
        const lastDate = new Date(progress.lastUpdateDate);
        const today = new Date(todayStr);
        const diffTime = Math.abs(today.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          newStreak = (progress.streakDays || 1) + 1;
        } else if (diffDays === 0) {
          newStreak = progress.streakDays || 1;
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
        guildDonated: false,
        streakDays: newStreak,
        lastUpdateDate: todayStr,
        shards: progress?.shards ?? 0,
      };
    }

    if (type === "flashcard") {
      // Server-side gacha: resolve which card is awarded
      const unlockedIds = progress.flashcardsRead || [];
      const pulledCardId = resolveGacha(unlockedIds, pullCount);
      const pulledCard = generateServerCard(pulledCardId);
      const isNew = !unlockedIds.includes(pulledCardId);

      progress.flashcardCounts = progress.flashcardCounts || {};
      progress.flashcardNames = progress.flashcardNames || {};
      progress.flashcardCounts[pulledCardId] = (progress.flashcardCounts[pulledCardId] || 0) + 1;
      if (!progress.flashcardsRead.includes(pulledCardId)) {
        progress.flashcardsRead.push(pulledCardId);
      }

      // Duplicate → award 3 shards
      let shardsAwarded = 0;
      if (!isNew) {
        progress.shards = (progress.shards || 0) + 3;
        shardsAwarded = 3;
      }

      // Save and return the resolved card
      await saveGameProgress(nickname, progress);
      const cardLevels: Record<string, number> = (progress as any).cardLevels || {};
      const cardLevel = cardLevels[String(pulledCardId)] || 1;
      res.json({
        success: true,
        progress,
        card: pulledCard,
        isNew,
        cardLevel,
        shardsAwarded,
      });
      return;
    } else if (type === "checkin") {
      if (!progress.checkins.includes(data)) {
        progress.checkins.push(data);
      }
    } else if (type === "trade") {
      if (!progress.traded.includes(data)) {
        progress.traded.push(data);
      }
    } else if (type === "challenge") {
      if (!progress.challengesCompleted.includes(data)) {
        progress.challengesCompleted.push(data);
      }
    } else if (type === "craft") {
      progress.crafted = progress.crafted || [];
      if (!progress.crafted.includes(data)) {
        progress.crafted.push(data);
        sendCraftEmail(user, data, redeemInfo).catch(console.error);
      }
      try {
        if (db) {
          await db.collection("users").doc(nickname.toLowerCase()).collection("craft_history").add({
            timestamp: new Date().toISOString(),
            craftedItemId: data,
            redeemInfo,
          });
        }
      } catch (e) {}
      // Research: Log craft transaction
      const craftCostMap: Record<string, number> = { "1": 1500, "2": 1000, "3": 2000, "4": 3000 };
      const craftPoints = craftCostMap[String(data)] || 0;
      try {
        const craftUser = await getUser(nickname);
        if (craftUser) {
          await logRewardTransaction(craftUser.account_id, "spend", -craftPoints, {
            reason: `Đổi quà: ${data}`,
            source: "craft",
            pointsBalance: craftUser.points,
          });
        }
      } catch (e) {
        console.error("[user-progress] craft logRewardTransaction failed:", e?.message || e);
      }
    } else if (type === "purchase") {
      progress.purchased = progress.purchased || [];
      progress.purchased.push(data);
      try {
        if (db) {
          await db.collection("users").doc(nickname.toLowerCase()).collection("purchase_history").add({
            timestamp: new Date().toISOString(),
            purchasedItemId: data,
          });
        }
      } catch (e) {}
      sendPurchaseEmail(user, String(data));
      const purchaseCostMap: Record<string, number> = { "av1": 50, "av2": 150, "av3": 300, "fr1": 100, "fr2": 200, "fr3": 500 };
      const purchaseCost = purchaseCostMap[String(data)] || 0;
      try {
        const purchaseUser = await getUser(nickname);
        if (purchaseUser) {
          await logRewardTransaction(purchaseUser.account_id, "spend", -purchaseCost, {
            reason: `Mua vật phẩm: ${data}`,
            source: "purchase",
            pointsBalance: purchaseUser.points,
          });
        }
      } catch (e) {
        console.error("[user-progress] purchase logRewardTransaction failed:", e?.message || e);
      }
    } else if (type === "guild_donated") {
      progress.guildDonated = true;
      try {
        if (db) {
          const globalRef = db.collection("global").doc("guild_campaign");
          const globalDoc = await globalRef.get();
          if (globalDoc.exists) {
            await globalRef.update({ progress: admin.firestore.FieldValue.increment(10) });
          } else {
            await globalRef.set({ progress: 10 });
          }
        }
      } catch (e) {
        console.error("Guild update local fallback needed", e);
        globalGuildProgress += 10;
      }
    }

    // Save to dedicated user_progress collection (not users/{nick})
    await saveGameProgress(nickname, progress);
    console.log(`[user-progress] Saved to user_progress/${nickname.toLowerCase()}, flashcardCounts:`, JSON.stringify(progress.flashcardCounts || {}));
    res.json({ success: true, progress });
  } catch (error) {
    console.error(`[user-progress] Error:`, error);
    res.status(500).json({ success: false, error: "Failed to update progress" });
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
app.get("/api/exam/:nick", async (req, res) => {
  const user = await getUser(req.params.nick);

  if (!user) {
    res.json({ status: "ERROR", message: "User not found" });
    return;
  }

  if (user.hasPlayed) {
    res.json({ status: "PLAYED", message: "✅ Bạn đã hoàn thành minigame." });
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

  const qs = dynamicQuestions.map((q) => ({
    id: q.id,
    content: q.content,
    options: q.options,
  }));
  res.json({
    status: "OPEN",
    message: "🔥 Minigame bắt đầu!",
    questions: qs,
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
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ||
      process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!secretRaw) {
      console.warn(`[AutoSync] Cannot write logs to Sheets. Service account is missing.`);
      return;
    }
    const isBase64 = !secretRaw.trim().startsWith("{");
    const serviceAccountStr = isBase64
      ? Buffer.from(secretRaw, "base64").toString("utf8")
      : secretRaw;
    const serviceAccount = JSON.parse(serviceAccountStr);
    const privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');

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

app.post("/api/exam/submit", async (req, res) => {
  const { nickname, userAnswers } = req.body;
  const user = await getUser(nickname);

  if (!user) {
    res.json({
      success: false,
      message: "Lỗi: Không tìm thấy user để cộng điểm.",
    });
    return;
  }

  if (user.hasPlayed) {
    res.json({ success: false, message: "Bạn đã nộp bài trước đó!" });
    return;
  }

  let totalScore = 0;
  let correctCount = 0;

  for (const ans of userAnswers || []) {
    // ans format: { id: number, choice: string }
    const q = dynamicQuestions.find((dq) => dq.id === ans.id);
    if (q) {
      if (ans.choice.toUpperCase() === q.correctKey.toUpperCase()) {
        totalScore += q.points;
        correctCount++;
      }
    }
  }

  user.points += totalScore;
  user.hasPlayed = true;
  await saveUser(user);

  if (db && nickname) {
     try {
       await db.collection("users").doc(nickname.toLowerCase()).collection("exam_history").add({
          timestamp: new Date().toISOString(),
          answers: userAnswers || [],
          totalScore: totalScore,
          correctCount: correctCount
       });
     } catch(e) {}
  }

  // Research: Log quiz completion
  await eventLogger.logQuiz(nickname, true, totalScore, correctCount, dynamicQuestions.length);
  await logRewardTransaction(user.account_id, "earn", totalScore, {
    reason: "Hoàn thành bài kiểm tra",
    source: "quiz",
    pointsBalance: user.points,
  });

  // Write to Logs sheet!
  writeGoogleSheetsLog(
    "1xqrjBMynOYuqGbvmBbuEHXFWZT0ZpwQE6Uy2N7tkr-Q",
    nickname,
    "Hoàn thành bài kiểm tra",
    totalScore,
  );

  res.json({
    success: true,
    message: `🎉 Đúng ${correctCount} câu. Cộng ${totalScore} điểm.`,
    newTotal: user.points,
  });
});

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

// 5. Chat API
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, nickname } = req.body;

    if (!ai) {
      return err(res, 500, "error.internal", req as any);
    }

    // Research: Get personality mode for personalized system prompt
    let systemInstruction = `Bạn là Robot Siêu Cấp Xanh, một chuyên gia về bảo vệ môi trường, phân loại rác thải. Tính cách của bạn vui vẻ, nhiệt tình, luôn động viên mọi người bảo vệ trái đất. Bạn chỉ tập trung trả lời các câu hỏi liên quan đến phân loại rác, bảo vệ môi trường, sống xanh. Nếu được hỏi ngoài lề, hãy khéo léo lái câu chuyện về bảo vệ môi trường.`;

    if (isDbConnected() && nickname) {
      personalityEngine.getPersonality(nickname).then((mode) => {
        systemInstruction = personalityEngine.getPrompt(mode);
      }).catch(() => {});
    }

    const formattedMessages = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const response = await Promise.race([
      ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: formattedMessages,
        config: { systemInstruction },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI_TIMEOUT")), 30_000)
      ),
    ]).catch((err: any) => {
      const isTimeout = err?.message?.includes("AI_TIMEOUT") || err?.name === "AbortError";
      console.error(isTimeout ? "Chat AI timeout:" : "Chat AI error:", err?.message);
      res.status(isTimeout ? 504 : 500).json({
        error: isTimeout
          ? "AI đang bận. Vui lòng thử lại."
          : "Lỗi AI: " + (err?.message || "Unknown"),
      });
      throw err;
    });

    res.json({ message: response?.text || "" });

    // DB writes — fire-and-forget
    if (nickname) {
      if (db) {
        db.collection("users").doc(nickname.toLowerCase()).collection("chat_history").add({
          timestamp: new Date().toISOString(),
          userMessage: messages[messages.length - 1].content,
          botResponse: response?.text || ""
        }).catch(() => {});
      }
      eventLogger.log(nickname, "chat_message", {
        message_length: messages[messages.length - 1].content?.length || 0,
      }).catch(() => {});
    }
  } catch (error: any) {
    console.error("Unexpected chat error:", error);
    if (!res.headersSent) {
      err(res, 500, "error.internal", req as any);
    }
  }
});

app.post("/api/scan-garbage", async (req, res) => {
  try {
    const { imageBase64: bodyImageBase64, image, nickname, consentToRelease, locale, geoLat, geoLng } = req.body;
    const imageBase64 = bodyImageBase64 ?? image;
    if (!imageBase64) {
      return err(res, 400, "error.scan.noText", req as any);
    }
    if (!ai) {
      return err(res, 500, "error.internal", req as any);
    }

    const startTime = Date.now();

    // Strip data URI prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    // Compute image hash for dedup + provenance
    const imageHash = DatasetCuratorClass.hashImage(base64Data);

    const prompt =
      "Hãy đóng vai một chuyên gia môi trường siêu đỉnh. Hãy phân tích hình ảnh này và cho biết đây là rác gì. Nó thuộc loại nào: Rác tái chế, Rác vô cơ (còn lại), Rác hữu cơ, hay Rác nguy hại? Hướng dẫn cách bỏ rác này đúng cách. Trả lời ngắn gọn, thân thiện và kèm theo icon.";

    const response = await Promise.race([
      ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
            ],
          },
        ],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI_TIMEOUT: Gemini request timed out after 30s (possibly blocked in Vietnam)")), 30_000)
      ),
    ]).catch((err: any) => {
      // Ensure we always respond — don't let AI errors cascade
      const isTimeout = err?.message?.includes("AI_TIMEOUT") || err?.name === "AbortError";
      console.error(isTimeout ? "Gemini timeout (network blocked?)" : "Gemini error:", err?.message);
      res.status(isTimeout ? 504 : 500).json({
        error: isTimeout
          ? "AI đang bận hoặc không thể kết nối. Vui lòng thử lại sau hoặc dùng chế độ Local AI."
          : "Lỗi AI: " + (err?.message || "Unknown"),
      });
      throw err; // rethrow so we skip the rest
    });

    const analysis = response?.text || "";
    const latencyMs = Date.now() - startTime;
    const predictedCategory = visionPipeline.parseGeminiResponseToCategory(analysis);

    // Estimate confidence from response quality indicators
    const textLen = analysis.length;
    const hasCategoryKeyword = /nhựa|giấy|thủy tinh|kim loại|hữu cơ|nguy hại|plastic|paper|glass|metal|organic|hazard/i.test(analysis);
    const confidence = hasCategoryKeyword
      ? Math.min(0.95, 0.70 + (textLen > 50 ? 0.15 : 0) + (textLen > 150 ? 0.10 : 0))
      : 0.50;

    // ── D5: Server-authoritative reward ──────────────────────────────────
    // Decide the reward BEFORE responding so the client can never claim
    // a different value. The reward is capped (see scanRewards.ts) so a
    // motivated attacker can't inflate points by replaying the request.
    const reward = decideScanReward(nickname);
    let newPointsBalance: number | null = null;
    if (nickname && reward.awarded > 0) {
      try {
        const user = await getUser(nickname);
        if (user) {
          user.points = (user.points || 0) + reward.awarded;
          await saveUser(user);
          newPointsBalance = user.points;
          writeGoogleSheetsLog(
            "1xqrjBMynOYuqGbvmBbuEHXFWZT0ZpwQE6Uy2N7tkr-Q",
            nickname,
            "AI Nhan dien rac",
            reward.awarded,
          );
          logRewardTransaction(user.account_id, "earn", reward.awarded, {
            reason: "AI nhận diện rác",
            source: "scan",
            pointsBalance: user.points,
          }).catch(() => {});
        }
      } catch (e) {
        console.error("[scan] reward credit failed:", (e as Error).message);
      }
    }

    // Send response — points are server-authoritative, client must not add
    // its own +50 on top.
    res.json({
      analysis,
      rewarded: reward.awarded > 0,
      points: newPointsBalance, // null = user not logged in, no balance to report
      pointsEarned: reward.awarded,
      rewardReason: reward.reason,
      rewardCap: getScanRewardConfig(),
      aiMetrics: {
        model: "gemini_2.5_flash",
        latencyMs,
        confidence,
        category: predictedCategory,
      },
    });

    // Log events (non-blocking)
    if (isDbConnected()) {
      visionPipeline.logInference(nickname, "gemini_2.5_flash", latencyMs, confidence, predictedCategory).catch(() => {});
    }
    if (db && nickname) {
      db.collection("users").doc(nickname.toLowerCase()).collection("scan_history").add({
        timestamp: new Date().toISOString(),
        analysis,
        pointsEarned: reward.awarded,
        aiModel: "gemini_2.5_flash",
        latencyMs,
        predictedCategory,
      }).catch(() => {});
    }
    if (nickname) {
      eventLogger.logGarbageScan(nickname, true, predictedCategory, undefined).catch(() => {});
    }

    // ── Phase 1: Dataset capture (open science, opt-in) ───────────────────
    // Only kick off if user has explicitly consented via settings toggle.
    if (nickname && consentToRelease === true) {
      // Fire-and-forget: don't block the response
      (async () => {
        try {
          // 1) Upload image to Cloudinary (anonymized)
          const uploaded = await uploadToDataset(base64Data, {
            userId: nickname,
            scanId: Date.now(), // placeholder; real scan_id assigned after insert
            category: predictedCategory,
            confidence,
          });

          // 2) Detect lighting + occlusion in parallel
          const [lighting, occlusion] = await Promise.all([
            datasetCurator.detectImageAttribute(imageBase64, "lighting"),
            datasetCurator.detectImageAttribute(imageBase64, "occlusion"),
          ]);

          // 3) Build top-K predictions heuristic (all 6 categories, top-1 = confidence)
          const topKPredictions = buildTopKPredictions(predictedCategory, confidence);

          // 4) Insert into ai_scan_metrics with consent + dataset metadata
          const researchDb = getResearchDb();
          if (researchDb) {
            await researchDb.query(
              `INSERT INTO ai_scan_metrics (
                user_id, model_type, latency_ms, confidence_score, predicted_category,
                image_url, image_hash, lighting_condition, occlusion_level,
                top_k_predictions, consent_to_release, locale, geo_country, dataset_release_status
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending_review')
              RETURNING id`,
              [
                nickname,
                "gemini_2.5_flash",
                latencyMs,
                confidence,
                predictedCategory,
                uploaded?.url || null,
                imageHash,
                lighting,
                occlusion,
                JSON.stringify(topKPredictions),
                true,
                locale || "vi",
                null,
              ],
            ).catch((err: Error) => console.error("[dataset] insert failed:", err));

            // 5) Upsert contributor row
            await researchDb.query(
              `INSERT INTO dataset_contributors (user_id, display_name, consent_given, consent_date, first_contribution_at, last_contribution_at)
               VALUES ($1, $2, TRUE, NOW(), NOW(), NOW())
               ON CONFLICT (user_id) DO UPDATE SET
                 consent_given = TRUE,
                 last_contribution_at = NOW()`,
              [nickname, nickname],
            ).catch((err: Error) => console.error("[dataset] contributor upsert failed:", err));
          }
        } catch (err) {
          console.error("[dataset] capture pipeline error:", err);
        }
      })();
    }

    // D5: scan-reward bookkeeping is now done synchronously in the
    // response block above (decideScanReward + saveUser before res.json).
    // The legacy fire-and-forget +50 here was double-counting points.
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
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ||
    process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!secretRaw) {
    throw new Error("Service account is not configured");
  }
  const isBase64 = !secretRaw.trim().startsWith("{");
  const serviceAccountStr = isBase64
    ? Buffer.from(secretRaw, "base64").toString("utf8")
    : secretRaw;
  const serviceAccount = JSON.parse(serviceAccountStr);
  const privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');

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

      const userId =
        typeof row[0] === "string" ? row[0].trim() : String(row[0] || "");
      if (userId === "UserID" || userId.includes("Tài khoản") || userId === "")
        continue;

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
            await db.collection("users").doc(nick.toLowerCase()).update({ 
              name: name || nick, 
              pass: pass 
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
    res
      .status(500)
      .json({ error: error.message || "Failed to sync spreadsheet" });
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
    const { nick } = req.params;
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) {
      return err(res, 400, 'error.validationFailed', req as any);
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
    const { nick } = req.params;
    const { points, reason } = req.body;
    if (typeof points !== "number") {
      return err(res, 400, "error.validationFailed", req as any);
    }
    const user = await getUser(nick);
    if (!user) return err(res, 404, "error.notFound", req as any);
    const oldPoints = user.points;
    user.points = Math.max(0, points);
    await saveUser(user);
    await logRewardTransaction(user.account_id, "adjustment", points - oldPoints, {
      reason: reason || "Admin adjustment",
      source: "admin",
      pointsBalance: user.points,
    });
    res.json({ success: true, oldPoints, newPoints: user.points });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// POST /api/admin/users/:nick/adjust-points - Increment/decrement points
app.post("/api/admin/users/:nick/adjust-points", requireAdmin, async (req, res) => {
  try {
    const { nick } = req.params;
    const { delta, reason } = req.body;
    if (typeof delta !== "number") {
      return err(res, 400, "error.validationFailed", req as any);
    }
    const user = await getUser(nick);
    if (!user) return err(res, 404, "error.notFound", req as any);
    const oldPoints = user.points;
    user.points = Math.max(0, user.points + delta);
    await saveUser(user);
    await logRewardTransaction(user.account_id, "adjustment", delta, {
      reason: reason || "Admin adjustment",
      source: "admin",
      pointsBalance: user.points,
    });
    res.json({ success: true, oldPoints, delta, newPoints: user.points });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// PUT /api/admin/users/:nick/suspend - Suspend/unsuspend user
app.put("/api/admin/users/:nick/suspend", requireAdmin, async (req, res) => {
  try {
    const { nick } = req.params;
    const { suspended } = req.body;
    const user = await getUser(nick);
    if (!user) return err(res, 404, "error.notFound", req as any);
    user.role = suspended ? "suspended" : (nick.toLowerCase().startsWith("admin") ? "admin" : "user");
    await saveUser(user);
    res.json({ success: true, message: suspended ? `Đã suspend ${nick}` : `Đã unsuspend ${nick}` });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// POST /api/admin/users/:nick/reset-progress - Reset user progress
app.post("/api/admin/users/:nick/reset-progress", requireAdmin, async (req, res) => {
  try {
    const { nick } = req.params;
    const { confirm } = req.query;
    if (confirm !== "true") {
      return err(res, 400, "error.validationFailed", req as any);
    }
    const user = await getUser(nick);
    if (!user) return err(res, 404, "error.notFound", req as any);
    user.points = 0;
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
    const { nick } = req.params;
    const { confirm } = req.query;
    if (confirm !== "true") {
      return err(res, 400, "error.validationFailed", req as any);
    }
    if (db) {
      await db.collection("users").doc(nick.toLowerCase()).delete();
    }
    // Remove from local array
    users = users.filter(u => u.nick.toLowerCase() !== nick.toLowerCase());
    saveData();
    res.json({ success: true, message: `Đã xóa người dùng ${nick}` });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// POST /api/admin/decay/:userId/detect - Trigger novelty decay detection manually
app.post("/api/admin/decay/:userId/detect", requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const state = await noveltyDecayDetector.detectDecay(userId);
    res.json({ success: true, decayState: state });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// POST /api/admin/decay/:userId/intervene - Trigger intervention manually
app.post("/api/admin/decay/:userId/intervene", requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { interventionType } = req.body;
    const interventions = await noveltyDecayDetector.getRecommendedInterventions(userId);
    const intervention = interventions.find(i => i === interventionType) || interventions[0];
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
      correct_key: String(body.correct_key || "A").trim().toUpperCase() as "A" | "B" | "C" | "D",
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

    await logAdminAction(adminNick, "quiz_create", "quiz_question", String(created.question_id), { content: created.content });

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
    await logAdminAction(adminNick, "quiz_reorder", "quiz_questions", null, { count: orderedIds.length });
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
app.get("/api/admin/quiz/questions/export", requireAdmin, async (_req, res) => {
  try {
    if (!isQuizDbConfigured()) {
      return err(res, 503, "error.databaseUnavailable", req as any);
    }
    const questions = await listQuizQuestions();
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="quiz-questions-${Date.now()}.json"`);
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
      await logAdminAction(adminNick, "quiz_config_update", "quiz_config", String(body.key), { value: body.value });
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
      [
        adminNick,
        actionType,
        targetType,
        targetId,
        details ? JSON.stringify(details) : null,
      ]
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
       LIMIT ${limit}`
    );
    res.json({ actions: rows, source: "supabase" });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
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
        process.env.GOOGLE_SPREADSHEET_ID || "1xqrjBMynOYuqGbvmBbuEHXFWZT0ZpwQE6Uy2N7tkr-Q"
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

async function startServer() {
  // Initialize session store (sweeps expired tokens)
  await initSessionStore();

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
                [u.account_id, u.name]
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
    setInterval(() => {
      socialNetworkAnalyzer.computeAllPageRanks().catch(console.error);
    }, 60 * 60 * 1000); // Every hour

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
      setTimeout(() => {
        weeklyReflectionGenerator.generateWeeklyReflections().catch(console.error);
        setInterval(() => {
          weeklyReflectionGenerator.generateWeeklyReflections().catch(console.error);
        }, 7 * 24 * 60 * 60 * 1000);
      }, msUntilSunday);
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
  // Placeholder: see end-of-file block.

  // Auto-sync Google Sheets Data initially and every 15 minutes (push DB → Sheets + pull Sheets → DB)
  const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || "1xqrjBMynOYuqGbvmBbuEHXFWZT0ZpwQE6Uy2N7tkr-Q";
  const AUTO_SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
  let syncErrorLogged = false;
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

  // Run once after 3s, then every 15 minutes
  setTimeout(startAutoSync, 3000);
  syncIntervalHandle = setInterval(startAutoSync, AUTO_SYNC_INTERVAL_MS);

  // Cleanup on shutdown
  const stopAutoSync = () => {
    if (syncIntervalHandle) {
      clearInterval(syncIntervalHandle);
      syncIntervalHandle = null;
    }
  };
  process.on("SIGTERM", stopAutoSync);
  process.on("SIGINT", stopAutoSync);

  // Research API routes
  app.use("/api/research", researchRouter);
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

  // Research data endpoints (shorter paths)
  app.get("/api/personality/:userId", async (req, res) => {
    const mode = await personalityEngine.getPersonality(req.params.userId);
    res.json({ personality_mode: mode });
  });

  app.get("/api/profile/:userId", async (req, res) => {
    const profile = await behavioralProfiler.getProfile(req.params.userId);
    if (!profile) {
      const newProfile = await behavioralProfiler.profileUser(req.params.userId);
      return res.json(newProfile);
    }
    res.json(profile);
  });

  app.get("/api/reflection/:userId", async (req, res) => {
    const reflection = await weeklyReflectionGenerator.getLatestReflection(req.params.userId);
    res.json(reflection || { message: "Chưa có phản hồi tuần này" });
  });

  app.get("/api/decay/:userId", async (req, res) => {
    const state = await noveltyDecayDetector.detectDecay(req.params.userId);
    res.json(state);
  });

  app.get("/api/interventions/:userId", async (req, res) => {
    const interventions = await adaptiveRewardEngine.getRecentInterventions(req.params.userId);
    res.json(interventions);
  });

  app.get("/api/simulation/:userId", async (req, res) => {
    const predictions = await simulationEngine.getSimulations(req.params.userId);
    res.json(predictions);
  });

  app.get("/api/active-event", async (req, res) => {
    const event = await eventGenerator.getActiveEvent();
    res.json(event);
  });

  app.post("/api/generate-event", async (req, res) => {
    const event = await eventGenerator.generateWeeklyEvent();
    res.json(event);
  });

  app.get("/api/simulation/intervention/:type", async (req, res) => {
    const result = await simulationEngine.predictInterventionEffectiveness(req.params.type);
    res.json(result);
  });

  app.get("/api/reward-history/:nick", async (req, res) => {
    const user = await getUser(req.params.nick);
    if (!user) return err(res, 404, "error.notFound", req as any);
    const db = getDb();
    if (!db) return res.json([]);
    try {
      const { rows } = await db.query(
        `SELECT transaction_type, amount, reason, source, multiplier, points_balance, created_at
         FROM reward_transactions
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [user.account_id]
      );
      res.json(rows);
    } catch (e) {
      err(res, 500, "error.internal", req as any);
    }
  });

  app.get("/api/reward-summary/:nick", async (req, res) => {
    const user = await getUser(req.params.nick);
    if (!user) return err(res, 404, "error.notFound", req as any);
    const db = getDb();
    if (!db) return res.json({ totalEarned: 0, totalSpent: 0, netChange: 0, txCount: 0 });
    try {
      const { rows } = await db.query(
        `SELECT transaction_type, amount FROM reward_transactions
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
        [user.account_id]
      );
      let totalEarned = 0, totalSpent = 0;
      for (const r of rows as { transaction_type: string; amount: number }[]) {
        if (r.transaction_type === "earn") totalEarned += r.amount;
        else totalSpent += Math.abs(r.amount);
      }
      res.json({ totalEarned, totalSpent, netChange: totalEarned - totalSpent, txCount: rows.length });
    } catch (e) {
      err(res, 500, "error.internal", req as any);
    }
  });

  // ─── Weekly Tournament ──────────────────────────────────────────────────────
  app.get("/api/tournament/current", async (_req, res) => {
    try {
      if (!db) return err(res, 503, "error.databaseUnavailable", req as any);
      // Get current week's Monday 00:00 Vietnam time (UTC+7)
      const now = new Date();
      const vnOffset = 7 * 60;
      const localMs = now.getTime() + (now.getTimezoneOffset() * 60000);
      const vnNow = new Date(localMs + vnOffset * 60000);
      const dayOfWeek = vnNow.getDay(); // 0=Sun, 1=Mon
      const mondayMs = vnNow.getTime() - ((dayOfWeek === 0 ? 6 : dayOfWeek - 1) * 24 * 60 * 60 * 1000);
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
        return res.json({ tournament: null, userJoined: false, userPosition: null, timeRemaining: formatTimeRemaining(weekEnd) });
      }

      const tournamentData = tournamentDoc.data()!;
      const user = _req.headers.authorization
        ? await getUserFromToken(_req.headers.authorization.replace("Bearer ", ""))
        : null;

      let userJoined = false;
      let userPosition: number | null = null;
      if (user && tournamentData.participants) {
        const participant = tournamentData.participants.find((p: any) => p.userId === user.nick);
        if (participant) {
          userJoined = true;
          const sorted = [...tournamentData.participants].sort((a: any, b: any) => b.weeklyScore - a.weeklyScore);
          userPosition = sorted.findIndex((p: any) => p.userId === user.nick) + 1;
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
      const localMs = now.getTime() + (now.getTimezoneOffset() * 60000);
      const vnNow = new Date(localMs + vnOffset * 60000);
      const dayOfWeek = vnNow.getDay();
      const mondayMs = vnNow.getTime() - ((dayOfWeek === 0 ? 6 : dayOfWeek - 1) * 24 * 60 * 60 * 1000);
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
        const localMs = now.getTime() + (now.getTimezoneOffset() * 60000);
        const vnNow = new Date(localMs + vnOffset * 60000);
        const dayOfWeek = vnNow.getDay();
        const mondayMs = vnNow.getTime() - ((dayOfWeek === 0 ? 6 : dayOfWeek - 1) * 24 * 60 * 60 * 1000);
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
        (u) => u.nick !== challengerNick && (u.points || 0) >= WAGER
      );

      if (eligibleOpponents.length === 0) {
        return err(res, 404, "error.notFound", req as any);
      }

      // Pick opponent with closest points (rank matchmaking)
      eligibleOpponents.sort((a, b) => Math.abs((a.points || 0) - (challenger.points || 0)) - Math.abs((b.points || 0) - (challenger.points || 0)));
      const opponent = eligibleOpponents[Math.floor(Math.random() * Math.min(3, eligibleOpponents.length))];

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

      await db.collection("pvp_matches").doc(matchId).set(match);

      // Deduct wager from challenger
      await db.collection("users").doc(challengerNick).update({
        points: admin.firestore.FieldValue.increment(-WAGER),
      });

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
      if (!db) return err(res, 503, "error.databaseUnavailable", req as any);

      const matchRef = db.collection("pvp_matches").doc(matchId);
      const matchDoc = await matchRef.get();
      if (!matchDoc.exists) return err(res, 404, "error.notFound", req as any);

      const match = matchDoc.data() as PvPMatch;

      if (match.status === "completed") {
        return res.json({ alreadyProcessed: true });
      }

      // Determine winner
      let winnerId: string;
      if (playerWon) {
        winnerId = nick;
      } else {
        // Opponent wins
        winnerId = match.challengerId === nick ? match.opponentId : match.challengerId;
      }

      // Award EXP: winner gets double stake, loser loses their wager
      const totalStake = match.stake * 2; // winner takes all
      const winnerRef = db.collection("users").doc(winnerId);
      await winnerRef.update({
        points: admin.firestore.FieldValue.increment(totalStake),
      });

      await matchRef.update({
        status: "completed",
        winnerId,
        challengerResult: match.challengerId === winnerId ? "win" : "lose",
        opponentResult: match.opponentId === winnerId ? "win" : "lose",
        rounds: rounds || [],
        updatedAt: Date.now(),
      });

      res.json({ winnerId, reward: totalStake });
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

  app.get("/api/clans", async (_req, res) => {
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
      if (!name || name.trim().length < 2) return res.status(400).json({ error: getErrorMessage("error.clan.nameTooShort", (req as any).locale?.locale) });
      if (!tag || tag.trim().length < 2 || tag.trim().length > 5) return res.status(400).json({ error: getErrorMessage("error.clan.tagInvalid", (req as any).locale?.locale) });

      if (!db) return res.status(503).json({ error: getErrorMessage("error.databaseUnavailable", (req as any).locale?.locale) });

      // Check if user already in a clan
      const userClanSnap = await db.collection("users").doc(nick).collection("profile").doc("clan").get();
      if (userClanSnap.exists) return res.status(400).json({ error: getErrorMessage("error.clan.alreadyMember", (req as any).locale?.locale) });

      // Check clan count limit
      const clanCount = (await db.collection("clans").count().get()).data().count;
      if (clanCount >= MAX_CLANS) return res.status(400).json({ error: getErrorMessage("error.clan.full", (req as any).locale?.locale) });

      // Check tag uniqueness
      const tagSnap = await db.collection("clans").where("tag", "==", tag.trim().toUpperCase()).limit(1).get();
      if (!tagSnap.empty) return res.status(400).json({ error: getErrorMessage("error.clan.tagTaken", (req as any).locale?.locale) });

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

  app.get("/api/clan/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!db) return err(res, 503, "error.databaseUnavailable", req as any);
      const clanSnap = await db.collection("clans").doc(id).get();
      if (!clanSnap.exists) return res.status(404).json({ error: getErrorMessage("error.clan.notFound", (req as any).locale?.locale) });

      const clanData = clanSnap.data()!;

      // Get members
      const membersSnap = await db.collection("clans").doc(id).collection("members").get();
      const members = membersSnap.docs.map((d) => d.data());

      // Get quests
      const questsSnap = await db.collection("clans").doc(id).collection("quests")
        .where("expiresAt", ">", Date.now())
        .limit(5).get();
      const quests = questsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Get recent messages
      const msgsSnap = await db.collection("clans").doc(id).collection("messages")
        .orderBy("createdAt", "desc").limit(30).get();
      const messages = msgsSnap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse();

      res.json({
        id,
        name: clanData.name,
        tag: clanData.tag,
        leaderId: clanData.leaderId,
        memberIds: clanData.memberIds || [],
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
      const { id } = req.params;
      if (!db) return err(res, 503, "error.databaseUnavailable", req as any);

      // Check if already in a clan
      const existingClan = await db.collection("users").doc(nick).collection("profile").doc("clan").get();
      if (existingClan.exists) return res.status(400).json({ error: "Bạn đã ở trong một clan khác" });

      const clanRef = db.collection("clans").doc(id);
      const clanSnap = await clanRef.get();
      if (!clanSnap.exists) return res.status(404).json({ error: getErrorMessage("error.clan.notFound", (req as any).locale?.locale) });
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
      const { id } = req.params;
      if (!db) return err(res, 503, "error.databaseUnavailable", req as any);

      const clanRef = db.collection("clans").doc(id);
      const clanSnap = await clanRef.get();
      if (!clanSnap.exists) return res.status(404).json({ error: getErrorMessage("error.clan.notFound", (req as any).locale?.locale) });
      const clanData = clanSnap.data()!;

      if (clanData.leaderId === nick) return res.status(400).json({ error: "Chủ tịch không thể rời clan. Hãy chuyển giao hoặc giải tán clan." });

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
      const { id } = req.params;
      const { amount } = req.body || {};
      const donateAmount = Math.max(10, Math.min(10000, Number(amount) || 0));
      if (donateAmount < 10) return res.status(400).json({ error: "Tối thiểu 10 EXP" });

      if (!db) return err(res, 503, "error.databaseUnavailable", req as any);

      // Deduct from user
      const userSnap = await db.collection("users").doc(nick).get();
      const userData = userSnap.data()!;
      const userPoints = userData.points || 0;
      if (userPoints < donateAmount) return res.status(400).json({ error: getErrorMessage("error.clan.missingExp", (req as any).locale?.locale) });

      const clanRef = db.collection("clans").doc(id);
      const clanSnap = await clanRef.get();
      if (!clanSnap.exists) return res.status(404).json({ error: getErrorMessage("error.clan.notFound", (req as any).locale?.locale) });

      const clanData = clanSnap.data()!;
      if (!(clanData.memberIds || []).includes(nick)) return res.status(400).json({ error: getErrorMessage("error.clan.notMember", (req as any).locale?.locale) });

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
      const { id } = req.params;
      const { text } = req.body || {};
      if (!text || text.trim().length === 0) return res.status(400).json({ error: getErrorMessage("error.clan.emptyMessage", (req as any).locale?.locale) });
      if (text.trim().length > 500) return res.status(400).json({ error: getErrorMessage("error.clan.messageTooLong", (req as any).locale?.locale) });

      if (!db) return err(res, 503, "error.databaseUnavailable", req as any);
      const clanSnap = await db.collection("clans").doc(id).get();
      if (!clanSnap.exists) return res.status(404).json({ error: getErrorMessage("error.clan.notFound", (req as any).locale?.locale) });
      const clanData = clanSnap.data()!;
      if (!(clanData.memberIds || []).includes(nick)) return res.status(400).json({ error: getErrorMessage("error.clan.notMember", (req as any).locale?.locale) });

      const userSnap = await db.collection("users").doc(nick).get();
      const userData = userSnap.data() || {};

      const msgRef = db.collection("clans").doc(id).collection("messages").doc();
      await msgRef.set({
        userId: nick,
        nick: userData.nick || nick,
        text: text.trim(),
        createdAt: Date.now(),
      });

      res.json({ id: msgRef.id, userId: nick, nick: userData.nick || nick, text: text.trim(), createdAt: Date.now() });
    } catch (e) {
      console.error("[clan/messages]", e);
      res.status(500).json({ error: "Failed to post message" });
    }
  });

  app.post("/api/clan/:id/assign-officer", requireAuth, async (req, res) => {
    try {
      const nick = (req as any).userNick;
      const { id } = req.params;
      const { targetNick } = req.body || {};
      if (!targetNick) return res.status(400).json({ error: getErrorMessage("error.clan.missingTarget", (req as any).locale?.locale) });

      if (!db) return err(res, 503, "error.databaseUnavailable", req as any);
      const clanRef = db.collection("clans").doc(id);
      const clanSnap = await clanRef.get();
      if (!clanSnap.exists) return res.status(404).json({ error: getErrorMessage("error.clan.notFound", (req as any).locale?.locale) });
      const clanData = clanSnap.data()!;
      if (clanData.leaderId !== nick) return res.status(403).json({ error: getErrorMessage("error.clan.notLeader", (req as any).locale?.locale) });
      if (!(clanData.memberIds || []).includes(targetNick)) return res.status(400).json({ error: getErrorMessage("error.clan.memberNotFound", (req as any).locale?.locale) });

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
      const { id } = req.params;
      const { targetNick } = req.body || {};
      if (!targetNick) return res.status(400).json({ error: getErrorMessage("error.clan.missingTarget", (req as any).locale?.locale) });

      if (!db) return err(res, 503, "error.databaseUnavailable", req as any);
      const clanRef = db.collection("clans").doc(id);
      const clanSnap = await clanRef.get();
      if (!clanSnap.exists) return res.status(404).json({ error: getErrorMessage("error.clan.notFound", (req as any).locale?.locale) });
      const clanData = clanSnap.data()!;
      if (clanData.leaderId !== nick) return res.status(403).json({ error: getErrorMessage("error.clan.notLeader", (req as any).locale?.locale) });
      if (!(clanData.memberIds || []).includes(targetNick)) return res.status(400).json({ error: getErrorMessage("error.clan.memberNotFound", (req as any).locale?.locale) });

      await db.runTransaction(async (tx) => {
        tx.update(clanRef, { leaderId: targetNick });
        tx.update(clanRef.collection("members").doc(nick), { role: "officer" });
        tx.update(clanRef.collection("members").doc(targetNick), { role: "owner" });
        tx.update(db.collection("users").doc(nick).collection("profile").doc("clan"), { role: "officer" });
        tx.update(db.collection("users").doc(targetNick).collection("profile").doc("clan"), { role: "owner" });
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
      const { id } = req.params;
      if (!db) return err(res, 503, "error.databaseUnavailable", req as any);
      const clanRef = db.collection("clans").doc(id);
      const clanSnap = await clanRef.get();
      if (!clanSnap.exists) return res.status(404).json({ error: getErrorMessage("error.clan.notFound", (req as any).locale?.locale) });
      if (clanSnap.data()!.leaderId !== nick) return res.status(403).json({ error: getErrorMessage("error.clan.notLeaderDisband", (req as any).locale?.locale) });

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
      const profileSnap = await db.collection("users").doc(nick).collection("profile").doc("clan").get();
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

  // ── SPA fallback + 404 catch-all (must be LAST) ────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA fallback: any non-/api GET that didn't match a router above
    // gets the index.html so client-side routing works on refresh.
    app.get(/^\/(?!api\/).*/, (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    // Unknown /api/* paths return JSON 404 instead of the SPA HTML,
    // so client `await res.json()` calls don't blow up with
    // "Unexpected token '<'".
    app.all(/^\/api\/.*/, (_req, res) => {
      res.status(404).json({ error: "Not Found" });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export { app, startServer };

// ─── Phase 1 helpers: dataset capture ────────────────────────────────────────

/**
 * Build heuristic top-K predictions for waste classification.
 * Gemini doesn't expose logprobs, so we synthesize a softmax-like distribution
 * centered on the predicted category with the given confidence.
 * Real softmax values are stored when available (ONNX pipeline).
 */
function buildTopKPredictions(topCategory: string, topConfidence: number): Array<{ category: string; prob: number }> {
  const allCats = ["plastic", "paper", "glass", "metal", "organic", "hazard"];
  const remaining = (1 - topConfidence) / (allCats.length - 1);
  return allCats.map((c) => ({
    category: c,
    prob: c === topCategory ? Math.round(topConfidence * 1000) / 1000 : Math.round(remaining * 1000) / 1000,
  }));
}
