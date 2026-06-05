import React, { useState, useEffect } from "react";
import { BarChart3, Download, TrendingUp, Users, Activity, Zap, Brain, RefreshCw, Cpu, FlaskConical, Network, ArrowLeft } from "lucide-react";
import { ResearchDashboardData, InterventionEffectiveness, SimulationResult } from "../types";
import { StatisticalPanel } from "./StatisticalPanel";
import { ModelBenchmarkCharts } from "./ModelBenchmarkCharts";
import { Badge, Button, Card, EmptyState, LoadingSpinner, SectionHeading, TabButton } from "../lib/ui";

interface ResearchDashboardProps {
  user: { account_id: string };
}

function authHeaders() {
  const token = localStorage.getItem("auth_token");
  return { headers: { Authorization: `Bearer ${token}` } };
}

export function ResearchDashboard({ user }: ResearchDashboardProps) {
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
    } catch (e) {
      console.error("Export failed:", e);
    }
  };

  if (dbStatus === "checking") {
    return <LoadingSpinner message="Đang kiểm tra research database..." />;
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
    { key: "overview", label: "Tổng quan", icon: <BarChart3 size={16} /> },
    { key: "retention", label: "Retention", icon: <TrendingUp size={16} /> },
    { key: "interventions", label: "Interventions", icon: <Zap size={16} /> },
    { key: "personality", label: "Personality", icon: <Users size={16} /> },
    { key: "decay", label: "Engagement", icon: <Activity size={16} /> },
    { key: "simulation", label: "Simulation", icon: <Brain size={16} /> },
    { key: "ai-metrics", label: "AI Metrics", icon: <Cpu size={16} /> },
    { key: "experiments", label: "Experiments", icon: <FlaskConical size={16} /> },
    { key: "statistics", label: "Statistics", icon: <BarChart3 size={16} /> },
    { key: "effectiveness", label: "Effectiveness", icon: <TrendingUp size={16} /> },
    { key: "social", label: "Social", icon: <Network size={16} /> },
    { key: "longitudinal", label: "Longitudinal", icon: <TrendingUp size={16} /> },
  ] as const;

  const totalPersonality = data?.personalityDistribution?.reduce((a, b) => a + parseInt(b.count), 0) || 0;
  const totalProfiles = data?.profileDistribution?.reduce((a, b) => a + parseInt(b.count), 0) || 0;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="rounded-[32px] border-0 bg-[linear-gradient(140deg,#0f172a,#1d4ed8_55%,#10b981)] p-6 text-white shadow-[var(--shadow-strong)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Badge tone="accent" className="bg-white/10 text-white border-white/10">ISEF research platform</Badge>
              <h1 className="mt-4 flex items-center gap-2 text-3xl font-black tracking-tight"><BarChart3 className="text-white" /> Research Dashboard</h1>
              <p className="mt-2 text-sm leading-6 text-white/75">Bảng điều khiển phân tích dữ liệu nghiên cứu, retention, intervention và hiệu năng mô hình AI.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => exportData("events")} variant="ghost" className="bg-white/10 text-white border-white/10 hover:bg-white/20"><Download size={16} /> Events</Button>
              <Button onClick={() => exportData("interventions")} variant="ghost" className="bg-white/10 text-white border-white/10 hover:bg-white/20"><Download size={16} /> Interventions</Button>
              <Button onClick={loadOverviewData}><RefreshCw size={16} /> Refresh</Button>
            </div>
          </div>
        </Card>

        <Card className="rounded-[28px] p-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <TabButton key={tab.key} active={activeTab === tab.key} onClick={() => handleTabChange(tab.key)} className="shrink-0 whitespace-nowrap">
                {tab.icon}
                {tab.label}
              </TabButton>
            ))}
          </div>
        </Card>

        <Card className="rounded-[32px] p-6">
          {loading ? (
            <LoadingSpinner message="Đang tải dữ liệu nghiên cứu..." />
          ) : activeTab === "overview" && data ? (
            <div className="space-y-6">
              <SectionHeading title="Research overview" subtitle="Snapshot nhanh về hành vi người dùng, hoạt động và phân bố nhóm nghiên cứu." />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Total users", value: data.totalUsers, tone: "success" as const },
                  { label: "Total events", value: data.totalEvents.toLocaleString(), tone: "accent" as const },
                  { label: "Active 7d", value: data.activeUsers7d, tone: "warning" as const },
                  { label: "Avg session", value: `${Math.round(data.avgSessionDurationSeconds / 60)}m`, tone: "default" as const },
                ].map((item) => (
                  <Card key={item.label} className="rounded-[26px] bg-slate-50 p-5">
                    <Badge tone={item.tone}>{item.label}</Badge>
                    <p className="mt-4 text-4xl font-black text-slate-900">{item.value}</p>
                  </Card>
                ))}
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="rounded-[28px] p-5">
                  <SectionHeading title="Personality distribution" subtitle="Tỷ trọng các personality mode đang được gán." />
                  <div className="mt-5 space-y-4">
                    {data.personalityDistribution.length === 0 ? <EmptyState title="Chưa có dữ liệu personality" /> : data.personalityDistribution.map((p) => {
                      const pct = totalPersonality > 0 ? (parseInt(p.count) / totalPersonality) * 100 : 0;
                      return (
                        <div key={p.personality_mode}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="font-bold capitalize text-slate-700">{p.personality_mode}</span>
                            <span className="text-slate-500">{p.count} ({pct.toFixed(1)}%)</span>
                          </div>
                          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                <Card className="rounded-[28px] p-5">
                  <SectionHeading title="Behavioral profiles" subtitle="Phân bố profile hành vi của người chơi." />
                  <div className="mt-5 space-y-4">
                    {data.profileDistribution.length === 0 ? <EmptyState title="Chưa có dữ liệu profile" /> : data.profileDistribution.map((p) => {
                      const pct = totalProfiles > 0 ? (parseInt(p.count) / totalProfiles) * 100 : 0;
                      return (
                        <div key={p.profile_type}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="font-bold capitalize text-slate-700">{p.profile_type.replace("_", " ")}</span>
                            <span className="text-slate-500">{p.count} ({pct.toFixed(1)}%)</span>
                          </div>
                          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            </div>
          ) : activeTab === "retention" ? (
            <div>
              <SectionHeading title="Retention analysis" subtitle="Theo dõi số người dùng tạo mới và retained sau 7 ngày." />
              {retentionData.length > 0 ? (
                <div className="mt-5 overflow-x-auto rounded-[24px] border border-slate-100">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="p-3 text-left font-bold">Date</th>
                        <th className="p-3 text-right font-bold">Created</th>
                        <th className="p-3 text-right font-bold">Retained</th>
                        <th className="p-3 text-right font-bold">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {retentionData.map((r, i) => {
                        const rate = r.created > 0 ? ((r.retained / r.created) * 100).toFixed(1) : "0";
                        return (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="p-3 font-medium">{r.day}</td>
                            <td className="p-3 text-right">{r.created}</td>
                            <td className="p-3 text-right">{r.retained}</td>
                            <td className="p-3 text-right font-black text-emerald-600">{rate}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <EmptyState title="Chưa có retention data" />}
            </div>
          ) : activeTab === "interventions" ? (
            <div>
              <SectionHeading title="Intervention effectiveness" subtitle="Đánh giá hiệu quả trung bình của từng loại can thiệp." />
              {interventionData.length > 0 ? (
                <div className="mt-5 overflow-x-auto rounded-[24px] border border-slate-100">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="p-3 text-left font-bold">Intervention</th>
                        <th className="p-3 text-right font-bold">Count</th>
                        <th className="p-3 text-right font-bold">Avg effectiveness</th>
                      </tr>
                    </thead>
                    <tbody>
                      {interventionData.map((r: any, i) => {
                        const eff = parseFloat(String(r.avg_effectiveness || r.avg_dur || 0));
                        return (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="p-3 font-medium capitalize">{r.intervention_type.replace("_", " ")}</td>
                            <td className="p-3 text-right">{r.count}</td>
                            <td className="p-3 text-right font-black text-emerald-600">{eff > 0 ? "+" : ""}{eff.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <EmptyState title="Chưa có intervention data" />}
            </div>
          ) : activeTab === "personality" ? (
            <div>
              <SectionHeading title="Personality comparison" subtitle="So sánh ảnh hưởng của personality modes đến session và hành vi." />
              {interventionData.length > 0 ? (
                <div className="mt-5 overflow-x-auto rounded-[24px] border border-slate-100">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="p-3 text-left font-bold">Mode</th>
                        <th className="p-3 text-right font-bold">Users</th>
                        <th className="p-3 text-right font-bold">Avg session</th>
                        <th className="p-3 text-right font-bold">Avg actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {interventionData.map((r: any, i: number) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="p-3 font-medium capitalize">{r.personality_mode}</td>
                          <td className="p-3 text-right font-bold">{r.user_count}</td>
                          <td className="p-3 text-right">{r.avg_session_duration ? (r.avg_session_duration / 60).toFixed(1) : "N/A"}</td>
                          <td className="p-3 text-right">{r.avg_actions ? r.avg_actions.toFixed(1) : "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <EmptyState title="Chưa có personality comparison" />}
            </div>
          ) : activeTab === "decay" ? (
            <div>
              <SectionHeading title="Engagement decay curve" subtitle="Quan sát biến động engagement score theo thời gian." />
              {decayData.length > 0 ? (
                <div className="mt-6 flex h-72 items-end gap-2 rounded-[28px] bg-slate-50 p-4">
                  {decayData.map((d, i) => {
                    const maxScore = Math.max(...decayData.map((r: any) => r.avg_engagement || 0), 1);
                    const height = ((d.avg_engagement || 0) / maxScore) * 100;
                    return (
                      <div key={i} className="flex flex-1 flex-col items-center gap-2">
                        <div className="w-full rounded-t-xl bg-gradient-to-t from-emerald-500 to-cyan-400" style={{ height: `${Math.max(height, 4)}%` }} />
                        <span className="text-[10px] text-slate-400 -rotate-45 origin-center">{d.day}</span>
                      </div>
                    );
                  })}
                </div>
              ) : <EmptyState title="Chưa có engagement data" />}
            </div>
          ) : activeTab === "simulation" ? (
            <div>
              <SectionHeading title="Digital twin predictions" subtitle="Dự đoán dựa trên hành vi tài khoản hiện tại của bạn." />
              {simulationData.length > 0 ? (
                <div className="mt-5 space-y-4">
                  {simulationData.map((sim, i) => (
                    <Card key={i} className="rounded-[24px] bg-slate-50 p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="font-bold capitalize text-slate-900">{sim.predictionType.replace("_", " ")}</h3>
                          <p className="mt-1 text-sm text-slate-500">{sim.reasoning}</p>
                        </div>
                        <Badge tone={sim.confidence > 0.7 ? "success" : "warning"}>{sim.confidence > 0.7 ? "High confidence" : "Low confidence"} ({sim.confidence})</Badge>
                      </div>
                      <div className="mt-4 flex gap-8">
                        <div><p className="text-xs text-slate-400">Predicted value</p><p className="text-3xl font-black text-slate-900">{sim.predictedValue}{sim.predictionType === "dropout_risk" ? "%" : ""}</p></div>
                        <div><p className="text-xs text-slate-400">Horizon</p><p className="text-lg font-bold text-slate-700">{sim.horizonDays} days</p></div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : <EmptyState title="Chưa có simulation data" />}
            </div>
          ) : activeTab === "ai-metrics" ? (
            <div>
              <SectionHeading title="AI vision benchmark" subtitle="So sánh Gemini cloud, MobileNetV2, EfficientNet-Lite và YOLOv8n." />
              <div className="mt-5"><ModelBenchmarkCharts benchmark={modelBenchmark} confusionMatrix={confusionMatrix} /></div>
            </div>
          ) : activeTab === "experiments" ? (
            <div className="space-y-6">
              <SectionHeading title="Experiment management" subtitle="Theo dõi trạng thái các thử nghiệm và nhóm điều trị." />
              {experiments.length > 0 ? (
                <div className="space-y-4">
                  {experiments.map((exp: any) => (
                    <Card key={exp.id} className="rounded-[24px] bg-slate-50 p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h4 className="font-bold text-slate-900">{exp.name}</h4>
                          <p className="mt-1 text-xs text-slate-500">{exp.description}</p>
                        </div>
                        <Badge tone={exp.status === "active" ? "success" : exp.status === "paused" ? "warning" : "default"}>{exp.status?.toUpperCase()}</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(exp.groups || []).map((g: any) => <Badge key={g.name}>{g.name} ({(g.ratio * 100).toFixed(0)}%)</Badge>)}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : <EmptyState title="Chưa có experiments" />}
              {expResults && !expResults.error && (
                <Card className="rounded-[24px] bg-emerald-50 p-5">
                  <h4 className="font-bold text-emerald-900">Adaptive rewards results</h4>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    {expResults.groups?.map((g: any) => (
                      <div key={g.name} className="rounded-[20px] bg-white p-4 text-center">
                        <p className="text-xs uppercase text-slate-400">{g.name}</p>
                        <p className="mt-2 text-2xl font-black text-slate-900">{g.users}</p>
                        <p className="text-sm text-slate-500">users</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          ) : activeTab === "statistics" ? (
            <div>
              <SectionHeading title="Statistical analysis" subtitle="Panel thống kê tổng hợp cho thực nghiệm hiện tại." />
              <div className="mt-5">{statsData ? <StatisticalPanel data={statsData} /> : <EmptyState title="Chưa có statistical data" />}</div>
            </div>
          ) : activeTab === "effectiveness" ? (
            <div>
              <SectionHeading title="Effectiveness summary" subtitle="Tóm tắt mức độ hiệu quả của interventions và dữ liệu tuần." />
              {effectivenessData ? (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Card className="rounded-[24px] bg-slate-50 p-5">
                    <h4 className="font-bold text-slate-900">Interventions</h4>
                    <div className="mt-4 space-y-3">
                      {(effectivenessData.interventions || []).map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                          <span className="capitalize text-slate-600">{item.intervention_type?.replace("_", " ")}</span>
                          <span className="font-black text-emerald-600">{Number(item.avg_effectiveness || 0).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                  <Card className="rounded-[24px] bg-slate-50 p-5">
                    <h4 className="font-bold text-slate-900">Weekly summary</h4>
                    <pre className="mt-4 overflow-auto rounded-2xl bg-white p-4 text-xs text-slate-600">{JSON.stringify(effectivenessData.summary || {}, null, 2)}</pre>
                  </Card>
                </div>
              ) : <EmptyState title="Chưa có effectiveness data" />}
            </div>
          ) : activeTab === "social" ? (
            <div>
              <SectionHeading title="Social analytics" subtitle="Tóm tắt mạng lưới, influencers và communities." />
              {socialSummary ? (
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: "Influencers", value: influencers.length },
                    { label: "Communities", value: communities.length },
                    { label: "Team users", value: teamVsSolo?.teamUsers || 0 },
                    { label: "Solo users", value: teamVsSolo?.soloUsers || 0 },
                  ].map((item) => (
                    <Card key={item.label} className="rounded-[24px] bg-slate-50 p-5">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
                      <p className="mt-3 text-3xl font-black text-slate-900">{item.value}</p>
                    </Card>
                  ))}
                </div>
              ) : <EmptyState title="Chưa có social data" />}
            </div>
          ) : activeTab === "longitudinal" ? (
            <div>
              <SectionHeading title="Longitudinal analytics" subtitle="Survival, decay và cohort theo chuỗi thời gian." />
              {(survivalData.length || engagementDecay.length || Object.keys(cohortTable || {}).length) ? (
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <Card className="rounded-[24px] bg-slate-50 p-5"><p className="text-xs uppercase text-slate-400">Survival rows</p><p className="mt-3 text-3xl font-black text-slate-900">{survivalData.length}</p></Card>
                  <Card className="rounded-[24px] bg-slate-50 p-5"><p className="text-xs uppercase text-slate-400">Decay rows</p><p className="mt-3 text-3xl font-black text-slate-900">{engagementDecay.length}</p></Card>
                  <Card className="rounded-[24px] bg-slate-50 p-5"><p className="text-xs uppercase text-slate-400">Cohort keys</p><p className="mt-3 text-3xl font-black text-slate-900">{Object.keys(cohortTable || {}).length}</p></Card>
                </div>
              ) : <EmptyState title="Chưa có longitudinal data" />}
            </div>
          ) : (
            <EmptyState title="Tab này chưa có dữ liệu" subtitle="Chọn tab khác hoặc làm mới để thử lại." />
          )}
        </Card>
      </div>
    </div>
  );
}
