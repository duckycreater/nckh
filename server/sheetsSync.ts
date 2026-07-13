import "dotenv/config";
import { google } from "googleapis";
import { getFirestore } from "./db.js";
import { listQuizQuestions, isQuizDbConfigured } from "./quizDb.js";
import { listRewards, isRewardsDbConfigured } from "./rewardsDb.js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const DEFAULT_SPREADSHEET_ID =
  process.env.GOOGLE_SPREADSHEET_ID || "1xqrjBMynOYuqGbvmBbuEHXFWZT0ZpwQE6Uy2N7tkr-Q";

// ─── Module-level sync state ─────────────────────────────────────────
let lastSyncTime: string | null = null;
let lastSyncResult: any = null;
let syncHistory: Array<{ timestamp: string; result: any; error?: string }> = [];

function getServiceAccount() {
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
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  return serviceAccount;
}

async function getSheetsClient(scopes: string[] = ["https://www.googleapis.com/auth/spreadsheets"]) {
  const sa = getServiceAccount();
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: sa.client_email,
      private_key: sa.private_key,
    },
    scopes,
  });
  return google.sheets({ version: "v4", auth });
}

function formatTimestamp(d: Date = new Date()): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yy} ${h}:${m}:${s}`;
}

// Coerce any value (including Firestore Timestamps, nested objects, arrays, etc.)
// into a primitive that the Google Sheets values.update API will accept.
// Firestore Timestamp has shape { _seconds, _nanoseconds } on the wire; we
// convert to an ISO string. We also handle Date, null/undefined, plain objects
// and arrays defensively.
function toCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? "" : value.toISOString();
  }
  // Firestore Timestamp has toDate() and seconds/nanoseconds
  const v: any = value;
  if (typeof v?.toDate === "function") {
    try {
      const d: Date = v.toDate();
      return isNaN(d.getTime()) ? "" : d.toISOString();
    } catch {
      /* fall through */
    }
  }
  if (
    v &&
    typeof v === "object" &&
    typeof v._seconds === "number" &&
    typeof v._nanoseconds === "number"
  ) {
    const ms = v._seconds * 1000 + Math.floor(v._nanoseconds / 1e6);
    return new Date(ms).toISOString();
  }
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

function rowToCells(row: unknown[]): string[] {
  return row.map(toCell);
}

function recordSync(result: any, error?: string) {
  const entry = { timestamp: new Date().toISOString(), result, error };
  lastSyncTime = entry.timestamp;
  lastSyncResult = result;
  syncHistory.unshift(entry);
  if (syncHistory.length > 50) syncHistory = syncHistory.slice(0, 50);
}

// ─── Sheet definitions ────────────────────────────────────────────────
const SHEET_DEFS: Record<string, { headers: string[]; description: string }> = {
  Users: {
    description: "All user accounts (from Firestore + data.json)",
    headers: ["UserID", "Name", "Nick", "Points", "Role", "Status", "CreatedAt", "LastActive", "AccountID"],
  },
  QuizQuestions: {
    description: "Quiz questions bank (from Supabase quiz_questions)",
    headers: ["QuestionID", "Content", "A", "B", "C", "D", "CorrectKey", "Points", "Category", "Difficulty", "Enabled", "Order", "ImageURL", "UpdatedAt"],
  },
  QuizConfig: {
    description: "Quiz runtime config (from Supabase quiz_config)",
    headers: ["Key", "Value", "UpdatedAt", "UpdatedBy"],
  },
  Rewards: {
    description: "Rewards catalog (from Supabase rewards)",
    headers: ["ID", "Name", "Description", "Cost", "ImageURL", "Color", "Active"],
  },
  BehavioralEvents: {
    description: "Last 500 behavioral events (from Supabase)",
    headers: ["Timestamp", "UserID", "EventType", "SessionID", "Metadata"],
  },
  RewardTransactions: {
    description: "Last 500 reward transactions (from Supabase)",
    headers: ["Timestamp", "UserID", "Type", "Amount", "Reason", "Source", "Balance"],
  },
  UserResearchProfiles: {
    description: "Behavioral profiles (from Supabase)",
    headers: ["UserID", "ProfileType", "Confidence", "Scores", "CreatedAt"],
  },
  NoveltyDecayLog: {
    description: "Engagement decay log (from Supabase)",
    headers: ["UserID", "EngagementScore", "StreakStability", "FeatureDiversity", "DetectedAt"],
  },
  Interventions: {
    description: "Adaptive interventions (from Supabase)",
    headers: ["ID", "UserID", "InterventionType", "TriggeredBy", "Effectiveness", "CreatedAt"],
  },
  SyncLog: {
    description: "Sync operation log (auto-populated)",
    headers: ["Timestamp", "Direction", "Source", "Records", "Status", "Error"],
  },
};

// ─── Helpers: ensure sheet exists ────────────────────────────────────
async function ensureSheet(
  sheets: any,
  spreadsheetId: string,
  sheetName: string,
  headers: string[],
): Promise<{ created: boolean }> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = (meta.data.sheets || []).some(
    (s: any) => s.properties?.title === sheetName,
  );
  if (exists) return { created: false };

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        { addSheet: { properties: { title: sheetName } } },
      ],
    },
  });

  // Write headers
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetName}'!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [headers] },
  });

  return { created: true };
}

// ─── Data fetchers ────────────────────────────────────────────────────

async function fetchUsersFromFirestore(): Promise<any[][]> {
  const db = getFirestore();
  if (!db) {
    // Fallback to in-memory users from server (if exposed)
    try {
      const mod = await import("../server.js").catch(() => null);
      const inMemUsers: any[] = (mod as any)?.users || [];
      return inMemUsers.map((u: any) => [
        u.account_id || "",
        u.name || "",
        u.nick || "",
        String(u.points ?? 0),
        u.role || "user",
        u.role === "suspended" ? "suspended" : "active",
        u.progress?.lastUpdateDate || "",
        "",
        u.account_id || "",
      ]);
    } catch {
      return [];
    }
  }
  const snapshot = await db.collection("users").get();
  const rows: any[][] = [];
  for (const doc of snapshot.docs) {
    const u = doc.data();
    rows.push([
      u.account_id || doc.id,
      u.name || "",
      u.nick || doc.id,
      String(u.points ?? 0),
      u.role || "user",
      u.role === "suspended" ? "suspended" : "active",
      toCell(u.createdAt),
      toCell(u.lastActive),
      u.account_id || "",
    ]);
  }
  return rows;
}

async function fetchQuizQuestionsFromDb(): Promise<any[][]> {
  if (!isQuizDbConfigured()) return [];
  const questions = await listQuizQuestions();
  return questions.map((q) => {
    const optA = q.options.find((o) => o.key === "A")?.text || "";
    const optB = q.options.find((o) => o.key === "B")?.text || "";
    const optC = q.options.find((o) => o.key === "C")?.text || "";
    const optD = q.options.find((o) => o.key === "D")?.text || "";
    return [
      String(q.question_id),
      q.content,
      optA,
      optB,
      optC,
      optD,
      q.correct_key,
      String(q.points),
      q.category || "",
      q.difficulty || "",
      q.enabled ? "TRUE" : "FALSE",
      String(q.order ?? q.question_id),
      q.image_url || "",
      q.updated_at || "",
    ];
  });
}

async function fetchQuizConfigFromDb(): Promise<any[][]> {
  if (!isQuizDbConfigured()) return [];
  const { getQuizConfig } = await import("./quizDb.js");
  const cfg = await getQuizConfig();
  const now = new Date().toISOString();
  return Object.entries(cfg).map(([key, value]) => [
    key,
    typeof value === "string" ? value : JSON.stringify(value),
    now,
    "system",
  ]);
}

async function fetchRewardsFromDb(): Promise<any[][]> {
  if (!isRewardsDbConfigured()) return [];
  const rewards = await listRewards();
  return rewards.map((r) => [
    r.id,
    r.name,
    r.desc,
    String(r.cost),
    r.imageUrl,
    r.color,
    "TRUE",
  ]);
}

async function fetchFromSupabase(sqlQuery: string): Promise<any[][]> {
  if (!supabaseUrl || !supabaseServiceKey) return [];
  try {
    const { getDb, isDbConnected } = await import("./db.js");
    if (!isDbConnected()) return [];
    const pool = getDb();
    if (!pool) return [];
    const { rows } = await pool.query(sqlQuery);
    return Array.isArray(rows)
      ? rows.map((r: any) => Object.values(r).map((v) => (v === null || v === undefined ? "" : String(v))))
      : [];
  } catch (e) {
    console.warn(`[sheetsSync] Supabase query failed:`, (e as Error).message);
    return [];
  }
}

// ─── Main sync function ─────────────────────────────────────────────

export interface SyncResult {
  users: number;
  quizQuestions: number;
  quizConfig: number;
  rewards: number;
  behavioralEvents: number;
  rewardTransactions: number;
  userResearchProfiles: number;
  noveltyDecayLog: number;
  interventions: number;
  conflicts: number;
  errors: string[];
  duration: number;
  startedAt: string;
  finishedAt: string;
}

export async function runFullSheetsSync(
  spreadsheetId: string = DEFAULT_SPREADSHEET_ID,
  options: { adminNick?: string } = {},
): Promise<SyncResult> {
  const startedAt = new Date();
  const errors: string[] = [];
  const result: SyncResult = {
    users: 0,
    quizQuestions: 0,
    quizConfig: 0,
    rewards: 0,
    behavioralEvents: 0,
    rewardTransactions: 0,
    userResearchProfiles: 0,
    noveltyDecayLog: 0,
    interventions: 0,
    conflicts: 0,
    errors,
    duration: 0,
    startedAt: startedAt.toISOString(),
    finishedAt: "",
  };

  try {
    const sheets = await getSheetsClient();

    // Ensure all sheets exist
    for (const [name, def] of Object.entries(SHEET_DEFS)) {
      try {
        await ensureSheet(sheets, spreadsheetId, name, def.headers);
      } catch (e) {
        errors.push(`Failed to ensure sheet ${name}: ${(e as Error).message}`);
      }
    }

    // Push data to each sheet
    const pushSheet = async (sheetName: string, rows: any[][]) => {
      if (rows.length === 0) return;
      try {
        // Clear existing data (keep header)
        const meta = await sheets.spreadsheets.get({ spreadsheetId });
        const sheet = (meta.data.sheets || []).find(
          (s: any) => s.properties?.title === sheetName,
        );
        if (sheet && sheet.properties?.gridProperties?.rowCount) {
          const totalRows = sheet.properties.gridProperties.rowCount;
          if (totalRows > 1) {
            await sheets.spreadsheets.values.clear({
              spreadsheetId,
              range: `'${sheetName}'!A2:Z${totalRows}`,
            });
          }
        }
        // Coerce every cell to a primitive the Sheets API accepts.
        // Firestore Timestamp objects would otherwise be rejected with
        // "Invalid values: struct_value { _seconds, _nanoseconds }".
        const safeRows = rows.map(rowToCells);
        // Write new data
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `'${sheetName}'!A2`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: safeRows },
        });
      } catch (e) {
        errors.push(`Failed to push ${sheetName}: ${(e as Error).message}`);
      }
    };

    // Run all pushes in parallel
    const [users, quizQuestions, quizConfig, rewards, events, txs, profiles, decay, interventions] =
      await Promise.all([
        fetchUsersFromFirestore().catch((e) => {
          errors.push(`users: ${e.message}`);
          return [];
        }),
        fetchQuizQuestionsFromDb().catch((e) => {
          errors.push(`quizQuestions: ${e.message}`);
          return [];
        }),
        fetchQuizConfigFromDb().catch((e) => {
          errors.push(`quizConfig: ${e.message}`);
          return [];
        }),
        fetchRewardsFromDb().catch((e) => {
          errors.push(`rewards: ${e.message}`);
          return [];
        }),
        fetchFromSupabase(
          "SELECT timestamp, user_id, event_type, session_id, metadata FROM behavioral_events ORDER BY timestamp DESC LIMIT 500",
        ).catch((e) => {
          errors.push(`events: ${e.message}`);
          return [];
        }),
        fetchFromSupabase(
          "SELECT created_at, user_id, transaction_type, amount, reason, source, points_balance FROM reward_transactions ORDER BY created_at DESC LIMIT 500",
        ).catch((e) => {
          errors.push(`tx: ${e.message}`);
          return [];
        }),
        fetchFromSupabase(
          "SELECT user_id, profile_type, confidence, scores, created_at FROM user_behavioral_profiles ORDER BY created_at DESC LIMIT 500",
        ).catch((e) => {
          errors.push(`profiles: ${e.message}`);
          return [];
        }),
        fetchFromSupabase(
          "SELECT user_id, engagement_score, streak_stability, feature_diversity, detected_at FROM novelty_decay_log ORDER BY detected_at DESC LIMIT 500",
        ).catch((e) => {
          errors.push(`decay: ${e.message}`);
          return [];
        }),
        fetchFromSupabase(
          "SELECT id, user_id, intervention_type, triggered_by, effectiveness_score, created_at FROM adaptive_interventions ORDER BY created_at DESC LIMIT 500",
        ).catch((e) => {
          errors.push(`interventions: ${e.message}`);
          return [];
        }),
      ]);

    result.users = users.length;
    result.quizQuestions = quizQuestions.length;
    result.quizConfig = quizConfig.length;
    result.rewards = rewards.length;
    result.behavioralEvents = events.length;
    result.rewardTransactions = txs.length;
    result.userResearchProfiles = profiles.length;
    result.noveltyDecayLog = decay.length;
    result.interventions = interventions.length;

    await Promise.all([
      pushSheet("Users", users),
      pushSheet("QuizQuestions", quizQuestions),
      pushSheet("QuizConfig", quizConfig),
      pushSheet("Rewards", rewards),
      pushSheet("BehavioralEvents", events),
      pushSheet("RewardTransactions", txs),
      pushSheet("UserResearchProfiles", profiles),
      pushSheet("NoveltyDecayLog", decay),
      pushSheet("Interventions", interventions),
    ]);

    // Write sync log
    try {
      const logRow = [
        formatTimestamp(startedAt),
        "push",
        "db->sheets",
        String(
          users.length +
            quizQuestions.length +
            quizConfig.length +
            rewards.length +
            events.length +
            txs.length +
            profiles.length +
            decay.length +
            interventions.length,
        ),
        errors.length === 0 ? "success" : "partial",
        errors.join(" | "),
      ];
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "SyncLog!A:F",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [logRow] },
      });
    } catch (e) {
      // Sync log failure is not critical
    }

    result.finishedAt = new Date().toISOString();
    result.duration = Date.now() - startedAt.getTime();
    recordSync(result);
    return result;
  } catch (e) {
    result.errors.push((e as Error).message);
    result.finishedAt = new Date().toISOString();
    result.duration = Date.now() - startedAt.getTime();
    recordSync(result, (e as Error).message);
    throw e;
  }
}

// ─── One-way push (DB → Sheets) ─────────────────────────────────────
export async function pushDbToSheets(
  spreadsheetId: string = DEFAULT_SPREADSHEET_ID,
): Promise<SyncResult> {
  return runFullSheetsSync(spreadsheetId);
}

// ─── Status ──────────────────────────────────────────────────────────
export async function getSheetsSyncStatus() {
  return {
    lastSyncTime,
    lastSyncResult,
    syncHistory: syncHistory.slice(0, 20),
    spreadsheetId: DEFAULT_SPREADSHEET_ID,
    autoSyncIntervalMs: 15 * 60 * 1000,
    isConfigured: !!(
      process.env.FIREBASE_SERVICE_ACCOUNT ||
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
    ),
  };
}

// ─── Test connection ─────────────────────────────────────────────────
export async function testSheetsConnection(
  spreadsheetId: string = DEFAULT_SPREADSHEET_ID,
): Promise<{ status: string; spreadsheetTitle?: string; error?: string }> {
  try {
    const sheets = await getSheetsClient(["https://www.googleapis.com/auth/spreadsheets.readonly"]);
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    return {
      status: "connected",
      spreadsheetTitle: meta.data.properties?.title || spreadsheetId,
    };
  } catch (e) {
    return { status: "error", error: (e as Error).message };
  }
}
