// Admin Research API service layer
// Wraps /api/research/* and /api/admin/research/* endpoints

const token = () => localStorage.getItem("auth_token") || "";
const adminApiKey = (import.meta as any).env?.VITE_ADMIN_API_KEY || "";

const headers = (): HeadersInit => ({
  Authorization: token() ? `Bearer ${token()}` : "",
  "x-admin-key": adminApiKey,
});

async function request<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { ...opts, headers: { ...headers(), ...(opts.headers as any) } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export const adminResearchApi = {
  getOverview: () => request<any>("/api/research/dashboard/overview"),
  getRetention: () => request<any>("/api/research/dashboard/retention"),
  getInterventions: () => request<any>("/api/research/dashboard/intervention-effectiveness"),
  getDecay: () => request<any>("/api/research/dashboard/engagement-decay"),
  getPersonalityComparison: () => request<any>("/api/research/dashboard/personality-comparison"),
  getWeeklyLeaderboard: () => request<any>("/api/research/leaderboard/weekly"),

  getUserProfile: (userId: string) => request<any>(`/api/profile/${userId}`),
  getUserDecay: (userId: string) => request<any>(`/api/decay/${userId}`),
  getUserInterventions: (userId: string) => request<any>(`/api/interventions/${userId}`),
  getUserReflection: (userId: string) => request<any>(`/api/reflection/${userId}`),
  getUserPersonality: (userId: string) =>
    request<{ personality_mode: string }>(`/api/personality/${userId}`),

  triggerDecay: (userId: string) =>
    request<{ success: boolean; decayState: any }>(`/api/admin/decay/${userId}/detect`, {
      method: "POST",
    }),

  triggerIntervention: (userId: string, type?: string) =>
    request<{ success: boolean; result: any }>(`/api/admin/decay/${userId}/intervene`, {
      method: "POST",
      body: JSON.stringify({ interventionType: type }),
      headers: { "Content-Type": "application/json" },
    }),

  exportUrl: (type: string) => `/api/research/export/${type}`,

  getAuditLog: (limit = 50) =>
    request<{ actions: any[]; source: string }>(`/api/admin/audit-log?limit=${limit}`),
};
