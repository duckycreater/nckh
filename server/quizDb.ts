import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export interface QuizOption {
  key: "A" | "B" | "C" | "D";
  text: string;
}

export interface QuizQuestion {
  question_id: number;
  content: string;
  options: QuizOption[];
  correct_key: "A" | "B" | "C" | "D";
  points: number;
  category?: string;
  difficulty?: "easy" | "medium" | "hard";
  enabled: boolean;
  image_url?: string;
  order: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export interface QuizConfigEntry {
  key: string;
  value: any;
  updated_at?: string;
  updated_by?: string;
}

function getHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: supabaseServiceKey,
    Authorization: `Bearer ${supabaseServiceKey}`,
  };
}

export function isQuizDbConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseServiceKey);
}

function normalizeQuestion(row: any): QuizQuestion {
  let options: QuizOption[] = [];
  if (Array.isArray(row.options)) {
    options = row.options;
  } else if (typeof row.options === "string") {
    try {
      const parsed = JSON.parse(row.options);
      options = Array.isArray(parsed) ? parsed : [];
    } catch {
      options = [];
    }
  }
  return {
    question_id: Number(row.question_id ?? row.id ?? 0),
    content: String(row.content || ""),
    options,
    correct_key: (String(row.correct_key || "A").trim().toUpperCase() as "A" | "B" | "C" | "D"),
    points: Number(row.points ?? 10),
    category: row.category || undefined,
    difficulty: (row.difficulty as "easy" | "medium" | "hard") || undefined,
    enabled: row.enabled === false ? false : true,
    image_url: row.image_url || undefined,
    order: Number(row.order ?? row.question_id ?? 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: row.created_by,
  };
}

// ─── Questions CRUD ─────────────────────────────────────────────

export async function listQuizQuestions(): Promise<QuizQuestion[]> {
  if (!isQuizDbConfigured()) {
    throw new Error("Quiz database is not configured");
  }

  const res = await fetch(
    `${supabaseUrl}/rest/v1/quiz_questions?select=*&order=order.asc,question_id.asc`,
    { method: "GET", headers: getHeaders() }
  );

  if (!res.ok) {
    throw new Error(`Failed to list quiz questions: ${res.status} ${await res.text()}`);
  }

  const rows = await res.json();
  return Array.isArray(rows) ? rows.map(normalizeQuestion) : [];
}

export async function getNextQuestionId(): Promise<number> {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/quiz_questions?select=question_id&order=question_id.desc&limit=1`,
    { method: "GET", headers: getHeaders() }
  );
  if (!res.ok) return 1;
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return 1;
  return Number(rows[0].question_id || 0) + 1;
}

export async function createQuizQuestion(
  q: Omit<QuizQuestion, "created_at" | "updated_at">,
): Promise<QuizQuestion> {
  if (!isQuizDbConfigured()) {
    throw new Error("Quiz database is not configured");
  }

  const payload = {
    question_id: q.question_id,
    content: q.content,
    options: q.options,
    correct_key: q.correct_key,
    points: q.points,
    category: q.category,
    difficulty: q.difficulty,
    enabled: q.enabled,
    image_url: q.image_url,
    order: q.order ?? q.question_id,
    created_by: q.created_by,
  };

  const res = await fetch(`${supabaseUrl}/rest/v1/quiz_questions?on_conflict=question_id`, {
    method: "POST",
    headers: {
      ...getHeaders(),
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to create quiz question: ${res.status} ${await res.text()}`);
  }

  const rows = await res.json();
  return normalizeQuestion(Array.isArray(rows) ? rows[0] : rows);
}

export async function updateQuizQuestion(
  questionId: number,
  updates: Partial<QuizQuestion>,
): Promise<QuizQuestion | null> {
  if (!isQuizDbConfigured()) {
    throw new Error("Quiz database is not configured");
  }

  const payload: any = { ...updates };
  delete payload.created_at;
  delete payload.updated_at;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/quiz_questions?question_id=eq.${questionId}`,
    {
      method: "PATCH",
      headers: {
        ...getHeaders(),
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to update quiz question: ${res.status} ${await res.text()}`);
  }

  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return normalizeQuestion(rows[0]);
}

export async function deleteQuizQuestion(questionId: number): Promise<boolean> {
  if (!isQuizDbConfigured()) {
    throw new Error("Quiz database is not configured");
  }

  const res = await fetch(
    `${supabaseUrl}/rest/v1/quiz_questions?question_id=eq.${questionId}`,
    { method: "DELETE", headers: getHeaders() }
  );

  if (!res.ok) {
    throw new Error(`Failed to delete quiz question: ${res.status} ${await res.text()}`);
  }

  return true;
}

export async function reorderQuizQuestions(
  orderedIds: number[],
): Promise<boolean> {
  if (!isQuizDbConfigured()) {
    throw new Error("Quiz database is not configured");
  }

  // Update order for each in a single transaction-like pattern
  const updates = orderedIds.map((id, index) =>
    fetch(
      `${supabaseUrl}/rest/v1/quiz_questions?question_id=eq.${id}`,
      {
        method: "PATCH",
        headers: { ...getHeaders(), Prefer: "return=minimal" },
        body: JSON.stringify({ order: index + 1 }),
      }
    )
  );

  const results = await Promise.all(updates);
  return results.every((r) => r.ok);
}

export async function bulkImportQuestions(
  questions: QuizQuestion[],
  createdBy: string,
): Promise<number> {
  if (!isQuizDbConfigured()) {
    throw new Error("Quiz database is not configured");
  }

  if (questions.length === 0) return 0;

  const nextId = await getNextQuestionId();
  const payload = questions.map((q, idx) => ({
    question_id: q.question_id || nextId + idx,
    content: q.content,
    options: q.options,
    correct_key: q.correct_key,
    points: q.points ?? 10,
    category: q.category,
    difficulty: q.difficulty,
    enabled: q.enabled !== false,
    image_url: q.image_url,
    order: q.order ?? nextId + idx,
    created_by: createdBy,
  }));

  const res = await fetch(`${supabaseUrl}/rest/v1/quiz_questions?on_conflict=question_id`, {
    method: "POST",
    headers: {
      ...getHeaders(),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to import quiz questions: ${res.status} ${await res.text()}`);
  }

  return payload.length;
}

// ─── Quiz Config ─────────────────────────────────────────────

export async function getQuizConfig(): Promise<Record<string, any>> {
  if (!isQuizDbConfigured()) {
    return {};
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/quiz_config?select=key,value,updated_at,updated_by`, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!res.ok) {
    console.warn(`[quizDb] Failed to fetch config: ${res.status}`);
    return {};
  }

  const rows = await res.json();
  if (!Array.isArray(rows)) return {};

  const out: Record<string, any> = {};
  for (const row of rows) {
    let value = row.value;
    if (typeof value === "string") {
      try {
        value = JSON.parse(value);
      } catch {
        // keep as string
      }
    }
    out[row.key] = value;
  }
  return out;
}

export async function setQuizConfig(
  key: string,
  value: any,
  updatedBy: string,
): Promise<boolean> {
  if (!isQuizDbConfigured()) {
    throw new Error("Quiz database is not configured");
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/quiz_config?on_conflict=key`, {
    method: "POST",
    headers: {
      ...getHeaders(),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ key, value, updated_by: updatedBy }),
  });

  if (!res.ok) {
    throw new Error(`Failed to set config: ${res.status} ${await res.text()}`);
  }

  return true;
}

export async function bulkSetQuizConfig(
  entries: Record<string, any>,
  updatedBy: string,
): Promise<number> {
  let count = 0;
  for (const [key, value] of Object.entries(entries)) {
    await setQuizConfig(key, value, updatedBy);
    count++;
  }
  return count;
}
