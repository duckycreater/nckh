import "dotenv/config";
import admin from "firebase-admin";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export interface ResearchPool {
  query: <T = any>(text: string, params?: any[]) => Promise<{ rows: T[]; rowCount: number }>;
  end: () => Promise<void>;
}

let pool: ResearchPool | null = null;
let isConnected = false;

let firestoreDb: admin.firestore.Firestore | null = null;

export function getFirestore(): admin.firestore.Firestore | null {
  return firestoreDb;
}

export function setFirestore(db: admin.firestore.Firestore): void {
  firestoreDb = db;
}

export function getDb(): ResearchPool | null {
  return pool;
}

export function isDbConnected(): boolean {
  return isConnected;
}

export async function initDb(): Promise<boolean> {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn("[ResearchDB] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. Research features disabled.");
    return false;
  }

  try {
    // Test connection by calling exec_sql
    const testRes = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ query: "SELECT 1 AS connected" }),
    });

    if (!testRes.ok) {
      const text = await testRes.text();
      throw new Error(`exec_sql test failed: ${testRes.status} ${text}`);
    }

    const testData = await testRes.json();
    if (!testData || testData === "[]" || (Array.isArray(testData) && testData.length === 0)) {
      // Might need retry on first call
    }

    pool = {
      async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
        let sql = text;
        if (params && params.length > 0) {
          sql = text.replace(/\$(\d+)/g, (_, n) => {
            const val = params[parseInt(n) - 1];
            if (val === null || val === undefined) return "NULL";
            if (typeof val === "number") return String(val);
            if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
            return `'${String(val).replace(/'/g, "''")}'`;
          });
        }

        const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseServiceKey,
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ query: sql }),
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`exec_sql error: ${res.status} ${errText}`);
        }

        const raw = await res.json();
        let rows: any[] = [];

        if (typeof raw === "string") {
          try {
            rows = JSON.parse(raw);
          } catch {
            rows = [{ result: raw }];
          }
        } else if (Array.isArray(raw)) {
          rows = raw;
        } else if (raw) {
          rows = [raw];
        }

        return { rows: rows as T[], rowCount: rows.length };
      },
      end: async () => { pool = null; },
    };

    isConnected = true;
    console.log("[ResearchDB] Supabase REST client initialized (service role via exec_sql).");
    return true;
  } catch (e) {
    console.warn("[ResearchDB] Supabase client initialization failed:", (e as Error).message);
    isConnected = false;
    return false;
  }
}

export async function closeDb(): Promise<void> {
  pool = null;
  isConnected = false;
}
