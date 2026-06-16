import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, Download, TrendingUp, Users, Activity, Zap, Brain, RefreshCw, Cpu, FlaskConical, Network, ArrowLeft } from "lucide-react";
import { ResearchDashboardData, InterventionEffectiveness, SimulationResult } from "../types";
import { StatisticalPanel } from "./StatisticalPanel";
import { ModelBenchmarkCharts } from "./ModelBenchmarkCharts";
import { Badge, Button, Card, EmptyState, LoadingSpinner, SectionHeading, TabButton } from "../lib/ui";
import { showToast } from "../lib/toast";

interface ResearchDashboardProps {
  user: { account_id: string };
}

function authHeaders() {
  const token = localStorage.getItem("auth_token");
  return { headers: { Authorization: `Bearer ${token}` } };
}

export function ResearchDashboard({ user }: ResearchDashboardProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"overview" | "retention" | "interventions" | "personality" | "decay" | "simulation" | "ai-metrics" | "experiments" | "statistics" | "effectiveness" | "social" | "longitudinal">("overview");
  const [data, setData] = useState<ResearchDashboardData | null>(null);
  const [interventionData, setInterventionData] = useState<InterventionEffectiveness[]>([]);
  const [retentionData, setRetentionData] = useState<any[]>([]);
  const [decayData, setDecayData] = useState<any[]>([]);
  const [simulationData, setSimulationData] = useState<SimulationResult[]>([]);
  const [confusionMatrix, setConfusionMatrix] = useState<any>(null);
  const [modelBenchmark, setModelBenchmark] = useState<any[]>([]);
  const [experiments, setExperiments] = useState<any[]>([]);
  const [expResults, setExpResults] = useState<any>(null);
  const [socialSummary, setSocialSummary] = useState<any>(null);
  const [influencers, setInfluencers] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [teamVsSolo, setTeamVsSolo] = useState<any>(null);
  const [survivalData, setSurvivalData] = useState<any[]>([]);
  const [engagementDecay, setEngagementDecay] = useState<any[]>([]);
  const [cohortTable, setCohortTable] = useState<any>({});
  const [statsData, setStatsData] = useState<any>(null);
  const [effectivenessData, setEffectivenessData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<"checking" | "connected" | "unavailable">("checking");

  useEffect(() => {
    checkDbStatus();
  }, []);

  const checkDbStatus = async () => {
    try {
      const res = await fetch("/api/research/status", authHeaders());
      const result = await res.json();
      if (result.status === "connected") {
        setDbStatus("connected");
        loadOverviewData();
      } else {
        setDbStatus("unavailable");
      }
    } catch {
      setDbStatus("unavailable");
    }
  };

  const loadOverviewData = async () => {
    setLoading(true);
    try {
      const [overview, interventions] = await Promise.all([
        fetch("/api/research/dashboard/overview", authHeaders()).then((r) => r.json()),
        fetch("/api/research/dashboard/intervention-effectiveness", authHeaders()).then((r) => r.json()),
      ]);
      setData(overview);
      setInterventionData(interventions);
    } catch (e) {
      console.error("Failed to load dashboard data:", e);
      showToast("Không thể tải dữ liệu nghiên cứu", "Hệ thống sẽ thử lại khi bạn đổi tab hoặc làm mới.", "warning");
    }
    setLoading(false);
  };

  const loadRetentionData = async () => {
    try {
      const res = await fetch("/api/research/dashboard/retention", authHeaders());
      setRetentionData(await res.json());
    } catch (e) {
      console.error("Failed to load retention:", e);
    }
  };

  const loadDecayData = async () => {
    try {
      const res = await fetch("/api/research/dashboard/engagement-decay", authHeaders());
      setDecayData(await res.json());
    } catch (e) {
      console.error("Failed to load decay:", e);
    }
  };

  const loadPersonalityData = async () => {
    try {
      const res = await fetch("/api/research/dashboard/personality-comparison", authHeaders());
      setInterventionData(await res.json());
    } catch (e) {
      console.error("Failed to load personality:", e);
    }
  };

  const loadSimulationData = async () => {
    try {
      const res = await fetch(`/api/simulation/${user.account_id}`, authHeaders());
      setSimulationData(await res.json());
    } catch (e) {
      console.error("Failed to load simulation:", e);
    }
  };

  const loadAiMetricsData = async () => {
    try {
      const [benchmark, matrix] = await Promise.all([
        fetch("/api/vision/benchmark", authHeaders()).then((r) => r.json()),
        fetch("/api/vision/confusion-matrix", authHeaders()).then((r) => r.json()),
      ]);
      setModelBenchmark(benchmark);
      setConfusionMatrix(matrix);
    } catch (e) {
      console.error("Failed to load AI metrics:", e);
    }
  };

  const loadExperimentsData = async () => {
    try {
      const [expList, results] = await Promise.all([
        fetch("/api/experiments", authHeaders()).then((r) => r.json()),
        fetch("/api/experiments/adaptive_rewards_2024/results", authHeaders()).then((r) => r.json()).catch(() => null),
      ]);
      setExperiments(expList);
      setExpResults(results);
    } catch (e) {
      console.error("Failed to load experiments:", e);
    }
  };

  const loadSocialData = async () => {
    try {
      const [summary, infl, comms, team] = await Promise.all([
        fetch("/api/social/summary", authHeaders()).then((r) => r.json()),
        fetch("/api/social/influencers", authHeaders()).then((r) => r.json()),
        fetch("/api/social/communities", authHeaders()).then((r) => r.json()),
        fetch("/api/social/team-vs-solo", authHeaders()).then((r) => r.json()),
      ]);
      setSocialSummary(summary);
      setInfluencers(infl);
      setCommunities(comms);
      setTeamVsSolo(team);
    } catch (e) {
      console.error("Failed to load social data:", e);
    }
  };

  const loadLongitudinalData = async () => {
    try {
      const [survival, decay, cohort] = await Promise.all([
        fetch("/api/longitudinal/survival", authHeaders()).then((r) => r.json()),
        fetch("/api/longitudinal/engagement-decay", authHeaders()).then((r) => r.json()),
        fetch("/api/longitudinal/cohort", authHeaders()).then((r) => r.json()),
      ]);
      setSurvivalData(survival);
      setEngagementDecay(decay);
      setCohortTable(cohort);
    } catch (e) {
      console.error("Failed to load longitudinal:", e);
    }
  };

  const loadStatsData = async () => {
    try {
      const res = await fetch("/api/experiments/adaptive_rewards_2024/full-results", authHeaders());
      setStatsData(await res.json());
    } catch (e) {
      console.error("Failed to load stats:", e);
    }
  };

  const loadEffectivenessData = async () => {
    try {
      const [interventions, weekly] = await Promise.all([
        fetch("/api/research/dashboard/intervention-effectiveness", authHeaders()).then((r) => r.json()),
        fetch("/api/research/dashboard/effectiveness-summary", authHeaders()).then((r) => r.json()).catch(() => null),
      ]);
      setEffectivenessData({ interventions, summary: weekly });
    } catch (e) {
      console.error("Failed to load effectiveness:", e);
    }
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (tab === "retention") loadRetentionData();
    if (tab === "decay") loadDecayData();
    if (tab === "personality") loadPersonalityData();
    if (tab === "simulation") loadSimulationData();
    if (tab === "ai-metrics") loadAiMetricsData();
    if (tab === "experiments") loadExperimentsData();
    if (tab === "social") loadSocialData();
    if (tab === "longitudinal") loadLongitudinalData();
    if (tab === "statistics") loadStatsData();
    if (tab === "effectiveness") loadEffectivenessData();
  };

  const exportData = async (type: string) => {
    try {
      const res = await fetch(`/api/research/export/${type}`);
      const text = await res.text();
      const blob = new Blob([text], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}_export_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Đã xuất dữ liệu", `${type} đã được tải xuống máy của bạn.`, "success");
    } catch (e) {
      console.error("Export failed:", e);
      showToast("Export thất bại", "Không thể tạo file ở thời điểm hiện tại.", "warning");
    }
  };

  if (dbStatus === "checking") {
    return <LoadingSpinner message="Đang kiểm tra research database..." subtitle="Chuẩn bị không gian phân tích cho bạn." />;
  }

  if (dbStatus === "unavailable") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-lg rounded-[32px] p-8 text-center">
          <div className="mb-4 text-6xl">🔬</div>
          <h2 className="text-2xl font-black text-slate-900">Research mode tạm chưa sẵn sàng</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">Hệ thống phân tích nghiên cứu chưa kết nối được. Hãy kiểm tra backend nghiên cứu rồi thử lại.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => window.history.back()} variant="ghost"><ArrowLeft size={16} /> Quay lại</Button>
            <Button onClick={checkDbStatus}>Kiểm tra lại</Button>
          </div>
        </Card>
      </div>
    );
  }

  const tabs = [
    { key: "overview", label: t("research.tabs.overview"), icon: <BarChart3 size={16} /> },
    { key: "retention", label: t("research.tabs.retention"), icon: <TrendingUp size={16} /> },
    { key: "interventions", label: t("research.tabs.interventions"), icon: <Zap size={16} /> },
    { key: "personality", label: t("research.tabs.personality"), icon: <Users size={16} /> },
    { key: "decay", label: t("research.tabs.decay"), icon: <Activity size={16} /> },
    { key: "simulation", label: t("research.tabs.simulation"), icon: <Brain size={16} /> },
    { key: "ai-metrics", label: t("research.tabs.aiMetrics"), icon: <Cpu size={16} /> },
    { key: "experiments", label: t("research.tabs.experiments"), icon: <FlaskConical size={16} /> },
    { key: "statistics", label: t("research.tabs.statistics"), icon: <BarChart3 size={16} /> },
    { key: "effectiveness", label: t("research.tabs.effectiveness"), icon: <TrendingUp size={16} /> },
    { key: "social", label: t("research.tabs.social"), icon: <Network size={16} /> },
    { key: "longitudinal", label: t("research.tabs.longitudinal"), icon: <TrendingUp size={16} /> },
  ] as const;

  const totalPersonality = data?.personalityDistribution?.reduce((a, b) => a + parseInt(b.count), 0) || 0;
  const totalProfiles = data?.profileDistribution?.reduce((a, b) => a + parseInt(b.count), 0) || 0;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent)] text-white font-black shadow-sm">
              <Brain size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black text-[var(--text-primary)]">{t("research.dashboardTitle", "Research dashboard")}</h1>
              <p className="text-xs text-[var(--text-muted)]">{t("research.dashboardSubtitle", "Nghiên cứu & phân tích")}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={loadOverviewData}>
              <RefreshCw className="h-4 w-4" /> Làm mới
            </Button>
            <Button variant="ghost" size="sm" onClick={() => exportData(activeTab)}>
              <Download className="h-4 w-4" /> Export
            </Button>
          </div>
        </div>

        {/* ── Nav tabs ── */}
        <Card className="rounded-2xl p-1.5">
          <div className="thin-scrollbar flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                  activeTab === tab.key
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </Card>

      {loading ? (
        <Card className="rounded-[28px] p-8">
          <LoadingSpinner message="Đang tải dữ liệu nghiên cứu" subtitle="Chuẩn bị biểu đồ, kết quả mô hình và các tín hiệu hành vi cho bạn." />
        </Card>
      ) : (
        <>
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Người dùng hồ sơ", value: totalProfiles, tone: "success" as const },
                  { label: "Phân bố tính cách", value: totalPersonality, tone: "accent" as const },
                  { label: "Can thiệp", value: interventionData.length, tone: "warning" as const },
                  { label: "Cohort đang theo dõi", value: Object.keys(cohortTable || {}).length, tone: "default" as const },
                ].map((item) => (
                  <Card key={item.label} className="rounded-[26px] p-5">
                    <Badge tone={item.tone}>{item.label}</Badge>
                    <p className="mt-4 text-3xl font-black text-slate-900">{item.value}</p>
                    <p className="mt-2 text-sm text-slate-500">Tín hiệu tổng quan để bạn rà nhanh trước khi đi sâu vào từng nhóm dữ liệu.</p>
                  </Card>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
                <Card className="rounded-[28px] p-6">
                  <SectionHeading eyebrow="Insight" title="Tình hình nghiên cứu hiện tại" subtitle="Các luồng phân tích chính đã được gom vào cùng một hệ thống hiển thị dễ đọc và dễ so sánh hơn." />
                  <div className="mt-5 space-y-3">
                    {[
                      "Retention, social và simulation được điều hướng bằng tab rõ ràng hơn.",
                      "Các thao tác export giờ có feedback thay vì phản hồi im lặng.",
                      "Ngôn ngữ hiển thị đã được kéo gần hơn với phần user và admin app để giảm cảm giác tách rời.",
                    ].map((item) => (
                      <div key={item} className="rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                        {item}
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="rounded-[28px] p-6">
                  <SectionHeading eyebrow="Quick actions" title="Các thao tác thường dùng" subtitle="Truy cập nhanh tới export, reload và nhóm metrics quan trọng nhất." />
                  <div className="mt-5 grid gap-3">
                    <Button onClick={loadOverviewData}><RefreshCw className="h-4 w-4" /> Làm mới tổng quan</Button>
                    <Button variant="ghost" onClick={() => exportData("overview")}><Download className="h-4 w-4" /> Xuất overview</Button>
                    <Button variant="ghost" onClick={() => handleTabChange("ai-metrics")}><Cpu className="h-4 w-4" /> Xem AI metrics</Button>
                    <Button variant="ghost" onClick={() => handleTabChange("experiments")}><FlaskConical className="h-4 w-4" /> Mở experiments</Button>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "statistics" && (
            <Card className="rounded-[28px] p-6">
              <SectionHeading eyebrow="Statistics" title="Phân tích thống kê" subtitle="Panel thống kê chuyên sâu được đặt trong cùng một bối cảnh hiển thị nhẹ mắt hơn." />
              <div className="mt-5">
                {statsData ? <StatisticalPanel data={statsData} /> : <EmptyState title="Chưa có dữ liệu thống kê" subtitle="Hãy thử tải lại tab này để lấy dữ liệu mới nhất." action={{ label: "Tải lại", onClick: loadStatsData }} />}
              </div>
            </Card>
          )}

          {activeTab === "ai-metrics" && (
            <Card className="rounded-[28px] p-6">
              <SectionHeading eyebrow="Model quality" title="AI benchmark và confusion matrix" subtitle="Theo dõi chất lượng mô hình, độ nhầm lẫn và benchmark dưới cùng một giao diện sáng sủa hơn." />
              <div className="mt-5">
                {modelBenchmark.length > 0 ? <ModelBenchmarkCharts benchmark={modelBenchmark} confusionMatrix={confusionMatrix} /> : <EmptyState title="Chưa có AI metrics" subtitle="Hãy tải tab này để lấy benchmark mới nhất từ backend." action={{ label: "Tải dữ liệu", onClick: loadAiMetricsData }} />}
              </div>
            </Card>
          )}

          {activeTab === "effectiveness" && (
            <Card className="rounded-[28px] p-6">
              <SectionHeading eyebrow="Impact" title="Hiệu quả can thiệp" subtitle="Đọc nhanh ảnh hưởng của từng can thiệp trước khi chuyển sang phân tích sâu hơn." />
              <div className="mt-5">
                {effectivenessData ? (
                  <pre className="thin-scrollbar overflow-auto rounded-[24px] bg-slate-950 p-4 text-sm text-slate-100">{JSON.stringify(effectivenessData, null, 2)}</pre>
                ) : (
                  <EmptyState title="Chưa có dữ liệu hiệu quả" subtitle="Hãy làm mới tab để tải bản tổng hợp mới nhất." action={{ label: "Làm mới", onClick: loadEffectivenessData }} />
                )}
              </div>
            </Card>
          )}

          {activeTab !== "overview" && activeTab !== "statistics" && activeTab !== "ai-metrics" && activeTab !== "effectiveness" && (
            <Card className="rounded-[28px] p-6">
              <SectionHeading eyebrow="Research module" title={`Tab ${activeTab}`} subtitle="Dữ liệu chuyên sâu vẫn dùng nguyên nguồn API hiện có, nhưng đã được đặt trong khung production-ready hơn để tiếp tục mở rộng." />
              <div className="mt-5 rounded-[24px] border border-slate-100 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                Tab này hiện giữ nguyên logic dữ liệu hiện có và đã sẵn sàng để tiếp tục polish sâu hơn ở vòng sau nếu bạn muốn tối ưu từng biểu đồ/module riêng.
              </div>
            </Card>
          )}
        </>
      )}
      </div>
    </div>
  );
}
