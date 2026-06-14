// Admin Google Sheets API service layer
// Wraps /api/admin/sheets/* endpoints

const token = () => localStorage.getItem("auth_token") || "";
const adminApiKey = (import.meta as any).env?.VITE_ADMIN_API_KEY || "";

const headers = (json = false): HeadersInit => ({
  ...(json ? { "Content-Type": "application/json" } : {}),
  Authorization: token() ? `Bearer ${token()}` : "",
  "x-admin-key": adminApiKey,
});

async function request<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: { ...headers(Boolean(opts.body)), ...(opts.headers as any) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export const adminSheetsApi = {
  fullSync: (spreadsheetId: string) =>
    request<{
      success: boolean;
      users: number;
      quizQuestions: number;
      rewards: number;
      behavioralEvents: number;
      duration: number;
      errors: string[];
    }>("/api/admin/sheets/full-sync", {
      method: "POST",
      body: JSON.stringify({ spreadsheetId }),
    }),

  pushToSheets: (spreadsheetId: string) =>
    request<{ success: boolean; users: number; quizQuestions: number; rewards: number }>(
      "/api/admin/sheets/push-to-sheets",
      { method: "POST", body: JSON.stringify({ spreadsheetId }) }
    ),

  pullFromSheets: (spreadsheetId: string) =>
    request<{ success: boolean; message: string }>("/api/admin/sync-sheets", {
      method: "POST",
      body: JSON.stringify({ spreadsheetId }),
    }),

  getStatus: () =>
    request<{
      lastSyncTime: string | null;
      lastSyncResult: any;
      syncHistory: any[];
      spreadsheetId: string;
      autoSyncIntervalMs: number;
      isConfigured: boolean;
    }>("/api/admin/sheets/status"),
};
