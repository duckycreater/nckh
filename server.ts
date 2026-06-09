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
import { resolveGacha, generateServerCard } from "./server/lib/cards.js";
import { GoogleGenAI } from "@google/genai";
import { initDb, isDbConnected, getDb } from "./server/db.js";
import { listRewards, upsertReward, deleteRewardById, isRewardsDbConfigured } from "./server/rewardsDb.js";
import { runSchema } from "./server/schema.js";
import { researchRouter } from "./server/routes/research.js";
import { eventLogger } from "./server/services/eventLogger.js";
import { personalityEngine } from "./server/services/personalityEngine.js";
import { behavioralProfiler } from "./server/services/behavioralProfiler.js";
import { adaptiveRewardEngine } from "./server/services/adaptiveRewardEngine.js";
import { noveltyDecayDetector } from "./server/services/noveltyDecayDetector.js";
import { weeklyReflectionGenerator } from "./server/services/weeklyReflection.js";
import { eventGenerator } from "./server/services/eventGenerator.js";
import { simulationEngine } from "./server/services/simulationEngine.js";
import { visionPipeline } from "./server/services/visionPipeline.js";
import { experimentEngine } from "./server/services/experimentEngine.js";
import { socialNetworkAnalyzer } from "./server/services/socialNetworkAnalyzer.js";
import { longitudinalAnalytics } from "./server/services/longitudinalAnalytics.js";
import { datasetManager } from "./server/services/datasetManager.js";
import { visionRouter } from "./server/routes/vision.js";
import { experimentsRouter } from "./server/routes/experiments.js";
import { socialRouter } from "./server/routes/social.js";
import { longitudinalRouter } from "./server/routes/longitudinal.js";
import { sessionTokens, createSessionToken } from "./server/auth.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const PORT = 3000;

// ─── Session token management (shared via ./server/auth.ts) ───────────────────

// ─── Auth Middleware ─────────────────────────────────────────────────────────
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const session = token && sessionTokens.get(token);
  if (!session || session.expires < Date.now()) {
    if (session && session.expires < Date.now()) sessionTokens.delete(token);
    return res.status(401).json({ error: "Unauthorized" });
  }
  (req as any).userNick = session.nick;
  next();
}

// ─── Admin Auth Middleware ───────────────────────────────────────────────────
async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const apiKey = req.headers["x-admin-key"] as string | undefined;
  const apiKeyHeader = process.env.ADMIN_API_KEY;

  if (apiKeyHeader && apiKey && apiKey === apiKeyHeader) {
    return next();
  }

  const token = req.headers.authorization?.replace("Bearer ", "");
  const session = token && sessionTokens.get(token);
  if (!session || session.expires < Date.now()) {
    if (session && session.expires < Date.now()) sessionTokens.delete(token);
    return res.status(401).json({ error: "Unauthorized" });
  }
  (req as any).userNick = session.nick;
  try {
    const user = await getUser(session.nick);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }
  } catch {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
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

app.use(express.json({ limit: "50mb" }));

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
    } else {
      const customApp = admin.initializeApp(
        {
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id,
        },
        "custom",
      );
      db = getFirestore(customApp, dbId);
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
}

interface User {
  name: string;
  nick: string;
  pass: string;
  points: number;
  hasPlayed: boolean;
  account_id: string;
  role?: string;
  progress?: UserProgress;
  selectedAvatar?: string;
  selectedFrame?: string;
  customAvatarUrl?: string;
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
          const { getDb } = await import("./server/db.js");
          const db = getDb();
          if (db) {
            await db.query(
              `INSERT INTO research_users (user_id, username, last_active) VALUES ($1, $2, NOW())
               ON CONFLICT (user_id) DO UPDATE SET last_active = NOW()`,
              [accountId, user.name]
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
                } catch {}
              }, 1000);
            }
          }
        } catch {}
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
          } catch {}
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
  const { reg_name, reg_nickname, reg_password } = req.body;
  const name = (reg_name || "").trim();
  const nick = (reg_nickname || "").trim();
  const pass = reg_password;

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
  const newUser = { name, nick, pass, points: 0, hasPlayed: false, account_id: crypto.randomUUID(), role };
  try {
    await saveUser(newUser, true);
  } catch (e) {
    console.error("[register] saveUser failed:", e?.message || e);
  }

  // Research: Register in research DB and assign personality
  const accountId = newUser.account_id;
  if (isDbConnected()) {
    try {
      const { getDb } = await import("./server/db.js");
      const db = getDb();
      if (db) {
        await db.query(
          `INSERT INTO research_users (user_id, username) VALUES ($1, $2)`,
          [accountId, name]
        );
        await personalityEngine.assignPersonality(accountId, 1);
        await eventLogger.log(accountId, "register", { timestamp: new Date().toISOString() });
      }
    } catch {}
  }

  res.json({ success: true, message: "Đăng ký thành công! Hãy đăng nhập." });
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
          } catch {}
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
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to reward" });
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
    const authNick = authHeader && authHeader.startsWith("Bearer ")
      ? sessionTokens.get(authHeader.replace("Bearer ", ""))?.nick
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

app.post("/api/admin/unlock-all-cards", requireAdmin, async (req, res) => {
  try {
    const { nickname } = req.body;
    if (!nickname) return res.status(400).json({ success: false, error: "Missing nickname" });

    const CARD_TOTAL = 300;
    const flashcardCounts: Record<string, number> = {};
    for (let i = 1; i <= CARD_TOTAL; i++) {
      flashcardCounts[String(i)] = 3;
    }

    const progress = await getGameProgress(nickname);
    const updated = {
      ...(progress || {}),
      flashcardsRead: Array.from({ length: CARD_TOTAL }, (_, i) => i + 1),
      flashcardCounts,
    } as GameProgress;

    await saveGameProgress(nickname, updated);
    console.log(`[unlock-all-cards] Unlocked ${CARD_TOTAL} cards for ${nickname}`);
    res.json({ success: true, message: `Đã mở khóa ${CARD_TOTAL} thẻ cho ${nickname}` });
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
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.post("/api/upload", requireAdmin, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
    
    const result = await cloudinary.uploader.upload(dataURI, {
      resource_type: "auto",
    });
    
    res.json({ url: result.secure_url });
  } catch (error) {
    console.error("Upload error", error);
    res.status(500).json({ error: "Upload failed" });
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
    });
  } else {
    res.status(404).json({ message: "Not found" });
  }
});

// User Progress & Guild Progress APIs
app.post("/api/user-progress", async (req, res) => {
  try {
    const { nickname, type, data, redeemInfo } = req.body;
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
        lastUpdateDate: todayStr
      };
    }

    if (type === "flashcard") {
      // Server-side gacha: resolve which card is awarded
      const unlockedIds = progress.flashcardsRead || [];
      const pulledCardId = resolveGacha(unlockedIds);
      const pulledCard = generateServerCard(pulledCardId);

      progress.flashcardCounts = progress.flashcardCounts || {};
      progress.flashcardNames = progress.flashcardNames || {};
      progress.flashcardCounts[pulledCardId] = (progress.flashcardCounts[pulledCardId] || 0) + 1;
      if (!progress.flashcardsRead.includes(pulledCardId)) {
        progress.flashcardsRead.push(pulledCardId);
      }

      // Save and return the resolved card
      await saveGameProgress(nickname, progress);
      const cardLevels: Record<string, number> = (progress as any).cardLevels || {};
      const cardLevel = cardLevels[String(pulledCardId)] || 1;
      res.json({
        success: true,
        progress,
        card: pulledCard,
        isNew: !unlockedIds.includes(pulledCardId),
        cardLevel,
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

// ─── World Map Game Progress ───────────────────────────────────────────────────

app.get("/api/game-progress/:nickname", async (req, res) => {
  try {
    const nickname = (req.params.nickname || "").trim().toLowerCase();
    if (db) {
      const doc = await db.collection("user_game_progress").doc(nickname).get();
      if (doc.exists) {
        return res.json({ gameProgress: doc.data() });
      }
    }
    res.json({ gameProgress: null });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to load game progress" });
  }
});

app.post("/api/game-progress", async (req, res) => {
  try {
    const { nickname, action, regionId, bonus, progress: clientProgress } = req.body;
    if (!nickname) return res.status(400).json({ success: false, error: "nickname required" });

    let existingProgress: Record<string, unknown> = {};
    if (db) {
      const doc = await db.collection("user_game_progress").doc(nickname.toLowerCase()).get();
      if (doc.exists) existingProgress = doc.data() as Record<string, unknown>;
    }

    const updated = { ...existingProgress, ...(clientProgress || {}) };

    if (db) {
      await db.collection("user_game_progress").doc(nickname.toLowerCase()).set(updated, { merge: true });
    }

    res.json({ success: true, gameProgress: updated });
  } catch (e) {
    console.error("[game-progress] Error:", e);
    res.status(500).json({ success: false, error: "Failed to save game progress" });
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
      return res.status(500).json({ error: "GEMINI_API_KEY is not set" });
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
      res.status(500).json({ error: "Lỗi không xác định" });
    }
  }
});

app.post("/api/scan-garbage", async (req, res) => {
  try {
    const { imageBase64, nickname } = req.body;
    if (!ai) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not set" });
    }

    const startTime = Date.now();

    // Strip data URI prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

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
    const confidence = 0.85;

    // Send response immediately — don't wait for DB/Sync
    res.json({
      analysis,
      rewarded: false,
      points: 0,
      aiMetrics: {
        model: "gemini_2.5_flash",
        latencyMs,
        confidence,
        category: predictedCategory,
      },
    });

    // DB writes — fire-and-forget, don't block response
    if (nickname) {
      // Award points (non-blocking, best-effort)
      getUser(nickname).then((user) => {
        if (user) {
          user.points += 50;
          saveUser(user);
          writeGoogleSheetsLog(
            "1xqrjBMynOYuqGbvmBbuEHXFWZT0ZpwQE6Uy2N7tkr-Q",
            nickname,
            "AI Nhan dien rac",
            50,
          );
          logRewardTransaction(user.account_id, "earn", 50, {
            reason: "AI nhận diện rác",
            source: "scan",
            pointsBalance: user.points,
          });
        }
      }).catch(() => {});

      // Log events (non-blocking)
      if (isDbConnected()) {
        visionPipeline.logInference(nickname, "gemini_2.5_flash", latencyMs, confidence, predictedCategory).catch(() => {});
      }
      if (db) {
        db.collection("users").doc(nickname.toLowerCase()).collection("scan_history").add({
          timestamp: new Date().toISOString(),
          analysis,
          pointsEarned: 50,
          aiModel: "gemini_2.5_flash",
          latencyMs,
          predictedCategory,
        }).catch(() => {});
      }
      eventLogger.logGarbageScan(nickname, true, predictedCategory, undefined).catch(() => {});
    }
  } catch (error: any) {
    // Only catches truly unexpected errors
    console.error("Unexpected scan error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Lỗi không xác định" });
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
      return res.status(400).json({ error: "Missing spreadsheetId" });
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
      } catch {}
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
      return res.status(400).json({ error: "Invalid role. Must be 'user' or 'admin'." });
    }
    const user = await getUser(nick);
    if (!user) return res.status(404).json({ error: "User not found" });
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
      return res.status(400).json({ error: "Invalid points value" });
    }
    const user = await getUser(nick);
    if (!user) return res.status(404).json({ error: "User not found" });
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
      return res.status(400).json({ error: "Invalid delta value" });
    }
    const user = await getUser(nick);
    if (!user) return res.status(404).json({ error: "User not found" });
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
    if (!user) return res.status(404).json({ error: "User not found" });
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
      return res.status(400).json({ error: "Must confirm with ?confirm=true" });
    }
    const user = await getUser(nick);
    if (!user) return res.status(404).json({ error: "User not found" });
    user.points = 0;
    user.hasPlayed = false;
    user.progress = undefined;
    await saveUser(user);
    // Also reset in Firestore
    if (db) {
      try {
        await db.collection("user_progress").doc(nick.toLowerCase()).delete();
      } catch {}
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
      return res.status(400).json({ error: "Must confirm with ?confirm=true" });
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
      return res.status(404).json({ error: "No intervention available" });
    }
    const result = await noveltyDecayDetector.triggerIntervention(userId, intervention);
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

async function startServer() {
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
        const { getDb } = await import("./server/db.js");
        const db = getDb();
        if (db && db) {
          const existingUsers = await getAllUsers();
          for (const u of existingUsers) {
            try {
              await db.query(
                `INSERT INTO research_users (user_id, username) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING`,
                [u.account_id, u.name]
              );
            } catch {}
          }
        }
      } catch {}
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
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Auto-sync Google Sheets Data initially and every 10 seconds
  const SPREADSHEET_ID = "1xqrjBMynOYuqGbvmBbuEHXFWZT0ZpwQE6Uy2N7tkr-Q";
  let syncErrorLogged = false;
  const startAutoSync = () => {
    syncGoogleSheetsData(SPREADSHEET_ID)
      .then((total) => {
        if (total > 0) {
          console.log(
            `[AutoSync] Successfully synced ${total} users from Google Sheets.`,
          );
        }
        syncErrorLogged = false; // Reset if it ever succeeds
      })
      .catch((err) => {
        if (err.message === "Service account is not configured") {
          if (!syncErrorLogged) {
            console.warn(`[AutoSync] Skipped: Service account is not configured for Google Sheets.`);
            syncErrorLogged = true;
          }
        } else {
          console.error(`[AutoSync] Error syncing Google Sheets:`, err.message);
        }
      });
  };

  setTimeout(startAutoSync, 3000); // Wait 3 seconds before first sync

  // Research API routes
  app.use("/api/research", researchRouter);
  app.use("/api/vision", visionRouter());
  app.use("/api/experiments", experimentsRouter());
  app.use("/api/social", socialRouter());
  app.use("/api/longitudinal", longitudinalRouter());

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
    if (!user) return res.status(404).json({ error: "User not found" });
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
      res.status(500).json({ error: "Failed to fetch reward history" });
    }
  });

  app.get("/api/reward-summary/:nick", async (req, res) => {
    const user = await getUser(req.params.nick);
    if (!user) return res.status(404).json({ error: "User not found" });
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
      res.status(500).json({ error: "Failed to fetch reward summary" });
    }
  });

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(err.statusCode || 500).json({ error: err.message || "Internal server error" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
