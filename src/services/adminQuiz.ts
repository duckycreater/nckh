// Admin Quiz API service layer
// Wraps /api/admin/quiz/* endpoints with consistent auth + error handling

export interface QuizQuestion {
  question_id: number;
  content: string;
  options: { key: "A" | "B" | "C" | "D"; text: string }[];
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

const token = () => localStorage.getItem("auth_token") || "";
const adminApiKey = (import.meta as any).env?.VITE_ADMIN_API_KEY || "";

const headers = (json = false): HeadersInit => ({
  ...(json ? { "Content-Type": "application/json" } : {}),
  Authorization: token() ? `Bearer ${token()}` : "",
  "x-admin-key": adminApiKey,
});

async function request<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { ...opts, headers: { ...headers(Boolean(opts.body)), ...(opts.headers as any) } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export const adminQuizApi = {
  list: () => request<{ questions: QuizQuestion[]; source: string }>("/api/admin/quiz/questions"),

  create: (q: Partial<QuizQuestion>) =>
    request<{ success: boolean; question: QuizQuestion }>("/api/admin/quiz/questions", {
      method: "POST",
      body: JSON.stringify(q),
    }),

  update: (id: number, q: Partial<QuizQuestion>) =>
    request<{ success: boolean; question: QuizQuestion }>(`/api/admin/quiz/questions/${id}`, {
      method: "PUT",
      body: JSON.stringify(q),
    }),

  delete: (id: number) =>
    request<{ success: boolean; deletedId: number }>(`/api/admin/quiz/questions/${id}`, {
      method: "DELETE",
    }),

  reorder: (orderedIds: number[]) =>
    request<{ success: boolean }>("/api/admin/quiz/questions/reorder", {
      method: "POST",
      body: JSON.stringify({ orderedIds }),
    }),

  import: (questions: QuizQuestion[]) =>
    request<{ success: boolean; imported: number }>("/api/admin/quiz/questions/import", {
      method: "POST",
      body: JSON.stringify({ questions }),
    }),

  exportUrl: () => "/api/admin/quiz/questions/export",

  getConfig: () => request<any>("/api/admin/quiz/config"),

  setConfig: (cfg: Record<string, any>) =>
    request<{ success: boolean; config: any }>("/api/admin/quiz/config", {
      method: "PUT",
      body: JSON.stringify(cfg),
    }),

  syncToSheets: () =>
    request<{ success: boolean; users: number; quizQuestions: number }>(
      "/api/admin/quiz/sync-to-sheets",
      { method: "POST", body: JSON.stringify({}) }
    ),
};
