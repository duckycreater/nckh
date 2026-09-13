import React, { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Download,
  TrendingUp,
  Users,
  Activity,
  Brain,
  Zap,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button, Card, Badge, SectionHeading, EmptyState } from "../../lib/ui";
import { showToast } from "../../lib/toast";
import { StructuredDataView } from "./StructuredDataView";

const token = () => localStorage.getItem("auth_token") || "";

// Auth headers for API calls - server validates user role from token
const authHeaders = (): HeadersInit => ({
  Authorization: token() ? `Bearer ${token()}` : "",
});

type ResearchView =
  "overview" | "retention" | "interventions" | "decay" | "personality" | "leaderboard";

// Types for API responses
interface UserProfile {
  account_id: string;
  nickname?: string;
  [key: string]: unknown;
}

interface DecayData {
  [key: string]: unknown;
}

interface InterventionData {
  [key: string]: unknown;
}

interface UserDetailResult {
  profile: UserProfile | null;
  decay: DecayData | null;
  interventions: InterventionData | null;
  loading: boolean;
  error: string | null;
}

// Types for Research Dashboard API responses
interface ResearchOverview {
  totalUsers?: number;
  total_users?: number;
  totalEvents?: number;
  total_events?: number;
  totalInterventions?: number;
  total_interventions?: number;
  personalityCount?: number;
  personality_count?: number;
  personalityDistribution?: Record<string, number>;
  error?: string;
}

interface ResearchRetention {
  // Retention data structure - varies by API implementation
  [key: string]: unknown;
}

interface InterventionEffectiveness {
  // Intervention effectiveness data
  [key: string]: unknown;
}

interface EngagementDecay {
  // Engagement decay data
  [key: string]: unknown;
}

interface PersonalityComparison {
  // Personality comparison data
  [key: string]: unknown;
}

interface LeaderboardEntry {
  user_id?: string;
  nick?: string;
  username?: string;
  points_earned?: number;
  points?: number;
  sessions_count?: number;
  sessions?: number;
  streak_days?: number;
  streak?: number;
}

interface LeaderboardData {
  leaderboard?: LeaderboardEntry[];
  users?: LeaderboardEntry[];
  [key: string]: unknown;
}

type ResearchData = ResearchOverview &
  ResearchRetention &
  InterventionEffectiveness &
  EngagementDecay &
  PersonalityComparison &
  LeaderboardData;

export function ResearchPanel() {
  const [view, setView] = useState<ResearchView>("overview");
  const [data, setData] = useState<ResearchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const [userDetail, setUserDetail] = useState<UserDetailResult>({
    profile: null,
    decay: null,
    interventions: null,
    loading: false,
    error: null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const endpoints: Record<ResearchView, string> = {
        overview: "/api/research/dashboard/overview",
        retention: "/api/research/dashboard/retention",
        interventions: "/api/research/dashboard/intervention-effectiveness",
        decay: "/api/research/dashboard/engagement-decay",
        personality: "/api/research/dashboard/personality-comparison",
        leaderboard: "/api/research/leaderboard/weekly",
      };
      const res = await fetch(endpoints[view], { headers: authHeaders() });
      if (res.ok) {
        setData((await res.json()) as ResearchData);
      } else {
        setData({ error: `HTTP ${res.status}` });
      }
    } catch (e) {
      setData({ error: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCSV = async (type: string) => {
    try {
      const res = await fetch(`/api/research/export/${type}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Đã xuất CSV", `${type} đã được tải xuống`, "success");
    } catch (e) {
      showToast("Lỗi xuất", (e as Error).message, "error");
    }
  };

  const tabs: { id: ResearchView; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Tổng quan", icon: <Activity className="h-4 w-4" /> },
    { id: "retention", label: "Retention", icon: <TrendingUp className="h-4 w-4" /> },
    { id: "interventions", label: "Interventions", icon: <Zap className="h-4 w-4" /> },
    { id: "decay", label: "Engagement Decay", icon: <AlertCircle className="h-4 w-4" /> },
    { id: "personality", label: "Personality", icon: <Brain className="h-4 w-4" /> },
    { id: "leaderboard", label: "Leaderboard", icon: <Users className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-4">
      <Card className="rounded-[28px] p-4">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={
                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition " +
                (view === t.id
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200")
              }
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant="ghost" onClick={load} loading={loading}>
            <RefreshCw className="h-4 w-4" /> Tải lại
          </Button>
          <Button variant="ghost" onClick={() => exportCSV(view)}>
            <Download className="h-4 w-4" /> Xuất CSV
          </Button>
        </div>
      </Card>

      {loading && (
        <div className="flex items-center justify-center gap-2 p-8 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
        </div>
      )}

      {data && !loading && (
        <Card className="rounded-[28px] p-6">
          {data.error ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
              Lỗi: {data.error}
            </div>
          ) : view === "overview" ? (
            <OverviewView data={data} />
          ) : view === "retention" ? (
            <RetentionView data={data} />
          ) : view === "interventions" ? (
            <InterventionsView data={data} />
          ) : view === "decay" ? (
            <DecayView data={data} />
          ) : view === "personality" ? (
            <PersonalityView data={data} />
          ) : view === "leaderboard" ? (
            <LeaderboardView data={data} />
          ) : null}
        </Card>
      )}

      {/* User profile lookup */}
      <Card className="rounded-[28px] p-6">
        <SectionHeading
          eyebrow="User Lookup"
          title="Tra cứu chi tiết người dùng nghiên cứu"
          subtitle="Nhập account_id để xem profile, interventions, decay, personality."
        />
        <div className="mt-4 flex gap-2">
          <input
            value={searchUser}
            onChange={(e) => setSearchUser(e.target.value)}
            placeholder="account_id (UUID)"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <Button
            onClick={() => loadUserDetail(searchUser, setUserDetail)}
            disabled={userDetail.loading}
          >
            {userDetail.loading ? "Đang tải..." : "Tra cứu"}
          </Button>
        </div>

        {/* Loading state */}
        {userDetail.loading && (
          <div className="mt-3 flex items-center gap-2 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
          </div>
        )}

        {/* React escapes text values, so rendering the message directly is safe. */}
        {userDetail.error && (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
            Lỗi: {userDetail.error}
          </div>
        )}

        {/* Success state */}
        {userDetail.profile !== null && !userDetail.loading && !userDetail.error && (
          <div className="mt-3">
            <StructuredDataView
              data={{
                profile: userDetail.profile,
                decay: userDetail.decay,
                interventions: userDetail.interventions,
              }}
            />
          </div>
        )}
      </Card>
    </div>
  );
}

// Updated loadUserDetail using React state instead of innerHTML to prevent XSS
async function loadUserDetail(
  userId: string,
  setUserDetail: React.Dispatch<React.SetStateAction<UserDetailResult>>,
) {
  if (!userId) return;

  setUserDetail({ profile: null, decay: null, interventions: null, loading: true, error: null });

  try {
    const [profile, decay, interventions] = await Promise.all([
      fetch(`/api/profile/${userId}`, { headers: authHeaders() }),
      fetch(`/api/decay/${userId}`, { headers: authHeaders() }),
      fetch(`/api/interventions/${userId}`, { headers: authHeaders() }),
    ]);

    const data: UserDetailResult = {
      profile: profile.ok ? await profile.json() : null,
      decay: decay.ok ? await decay.json() : null,
      interventions: interventions.ok ? await interventions.json() : null,
      loading: false,
      error: null,
    };

    setUserDetail(data);
  } catch (e) {
    // Error message is safely handled - will be escaped in render
    setUserDetail({
      profile: null,
      decay: null,
      interventions: null,
      loading: false,
      error: (e as Error).message,
    });
  }
}

function OverviewView({ data }: { data: ResearchOverview }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatBox label="Tổng users" value={data.totalUsers ?? data.total_users ?? 0} />
      <StatBox label="Tổng events" value={data.totalEvents ?? data.total_events ?? 0} />
      <StatBox
        label="Tổng interventions"
        value={data.totalInterventions ?? data.total_interventions ?? 0}
      />
      <StatBox
        label="Personality modes"
        value={data.personalityCount ?? data.personality_count ?? 0}
      />
      {data.personalityDistribution && (
        <div className="col-span-full rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold mb-2">Phân bố personality</h3>
          <StructuredDataView data={data.personalityDistribution} />
        </div>
      )}
    </div>
  );
}

function RetentionView({ data }: { data: ResearchRetention }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">7-day Retention</h3>
      <StructuredDataView data={data} />
    </div>
  );
}

function InterventionsView({ data }: { data: InterventionEffectiveness }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Intervention Effectiveness</h3>
      <StructuredDataView data={data} />
    </div>
  );
}

function DecayView({ data }: { data: EngagementDecay }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Engagement Decay (30 ngày)</h3>
      <StructuredDataView data={data} />
    </div>
  );
}

function PersonalityView({ data }: { data: PersonalityComparison }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Personality Comparison</h3>
      <StructuredDataView data={data} />
    </div>
  );
}

function LeaderboardView({ data }: { data: LeaderboardData }) {
  const arr = Array.isArray(data) ? data : data.leaderboard || data.users || [];
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Weekly Leaderboard</h3>
      {arr.length === 0 ? (
        <EmptyState title="Chưa có dữ liệu" />
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500 border-b">
            <tr>
              <th className="py-2 px-2">#</th>
              <th className="py-2 px-2">User</th>
              <th className="py-2 px-2">Điểm tuần</th>
              <th className="py-2 px-2">Sessions</th>
              <th className="py-2 px-2">Streak</th>
            </tr>
          </thead>
          <tbody>
            {arr.slice(0, 20).map((row: LeaderboardEntry, i: number) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-2 px-2">{i + 1}</td>
                <td className="py-2 px-2 text-xs">
                  {(row.user_id || row.nick || row.username || "").slice(0, 12)}
                </td>
                <td className="py-2 px-2 font-semibold">{row.points_earned ?? row.points ?? 0}</td>
                <td className="py-2 px-2">{row.sessions_count ?? row.sessions ?? 0}</td>
                <td className="py-2 px-2">{row.streak_days ?? row.streak ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 text-center">
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}
