import React, { useState, useEffect } from "react";
import { BarChart3, Download, TrendingUp, Users, Activity, Zap, Brain, RefreshCw, Cpu, FlaskConical, Network, Eye, CheckCircle, XCircle, AlertTriangle, ArrowRight } from "lucide-react";
import { ResearchDashboardData, InterventionEffectiveness, SimulationResult } from "../types";
import { StatisticalPanel } from "./StatisticalPanel";
import { ModelBenchmarkCharts } from "./ModelBenchmarkCharts";

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
  // AI Metrics
  const [aiMetrics, setAiMetrics] = useState<any[]>([]);
  const [confusionMatrix, setConfusionMatrix] = useState<any>(null);
  const [modelBenchmark, setModelBenchmark] = useState<any[]>([]);
  const [misclassifications, setMisclassifications] = useState<any[]>([]);
  // Experiments
  const [experiments, setExperiments] = useState<any[]>([]);
  const [expResults, setExpResults] = useState<any>(null);
  // Social
  const [socialSummary, setSocialSummary] = useState<any>(null);
  const [influencers, setInfluencers] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [teamVsSolo, setTeamVsSolo] = useState<any>(null);
  // Longitudinal
  const [survivalData, setSurvivalData] = useState<any[]>([]);
  const [engagementDecay, setEngagementDecay] = useState<any[]>([]);
  const [cohortTable, setCohortTable] = useState<any>({});
  // Statistics
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
        fetch("/api/research/dashboard/overview", authHeaders()).then(r => r.json()),
        fetch("/api/research/dashboard/intervention-effectiveness", authHeaders()).then(r => r.json()),
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
      const data = await res.json();
      setRetentionData(data);
    } catch (e) {
      console.error("Failed to load retention:", e);
    }
  };

  const loadDecayData = async () => {
    try {
      const res = await fetch("/api/research/dashboard/engagement-decay", authHeaders());
      const data = await res.json();
      setDecayData(data);
    } catch (e) {
      console.error("Failed to load decay:", e);
    }
  };

  const loadPersonalityData = async () => {
    try {
      const res = await fetch("/api/research/dashboard/personality-comparison", authHeaders());
      const data = await res.json();
      setInterventionData(data);
    } catch (e) {
      console.error("Failed to load personality:", e);
    }
  };

  const loadSimulationData = async () => {
    try {
      const res = await fetch(`/api/simulation/${user.account_id}`, authHeaders());
      const data = await res.json();
      setSimulationData(data);
    } catch (e) {
      console.error("Failed to load simulation:", e);
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

  // --- AI Metrics ---
  const loadAiMetricsData = async () => {
    try {
      const [benchmark, matrix, misclass] = await Promise.all([
        fetch("/api/vision/benchmark", authHeaders()).then(r => r.json()),
        fetch("/api/vision/confusion-matrix", authHeaders()).then(r => r.json()),
        fetch("/api/vision/misclassifications", authHeaders()).then(r => r.json()),
      ]);
      setModelBenchmark(benchmark);
      setConfusionMatrix(matrix);
      setMisclassifications(misclass);
    } catch (e) { console.error("Failed to load AI metrics:", e); }
  };

  // --- Experiments ---
  const loadExperimentsData = async () => {
    try {
      const [expList, results] = await Promise.all([
        fetch("/api/experiments", authHeaders()).then(r => r.json()),
        fetch("/api/experiments/adaptive_rewards_2024/results", authHeaders()).then(r => r.json()).catch(() => null),
      ]);
      setExperiments(expList);
      setExpResults(results);
    } catch (e) { console.error("Failed to load experiments:", e); }
  };

  // --- Social ---
  const loadSocialData = async () => {
    try {
      const [summary, infl, comms, team] = await Promise.all([
        fetch("/api/social/summary", authHeaders()).then(r => r.json()),
        fetch("/api/social/influencers", authHeaders()).then(r => r.json()),
        fetch("/api/social/communities", authHeaders()).then(r => r.json()),
        fetch("/api/social/team-vs-solo", authHeaders()).then(r => r.json()),
      ]);
      setSocialSummary(summary);
      setInfluencers(infl);
      setCommunities(comms);
      setTeamVsSolo(team);
    } catch (e) { console.error("Failed to load social data:", e); }
  };

  // --- Longitudinal ---
  const loadLongitudinalData = async () => {
    try {
      const [survival, decay, cohort] = await Promise.all([
        fetch("/api/longitudinal/survival", authHeaders()).then(r => r.json()),
        fetch("/api/longitudinal/engagement-decay", authHeaders()).then(r => r.json()),
        fetch("/api/longitudinal/cohort", authHeaders()).then(r => r.json()),
      ]);
      setSurvivalData(survival);
      setEngagementDecay(decay);
      setCohortTable(cohort);
    } catch (e) { console.error("Failed to load longitudinal:", e); }
  };

  // --- Statistics ---
  const loadStatsData = async () => {
    try {
      const res = await fetch("/api/experiments/adaptive_rewards_2024/full-results", authHeaders());
      const data = await res.json();
      setStatsData(data);
    } catch (e) { console.error("Failed to load stats:", e); }
  };

  // --- Effectiveness ---
  const loadEffectivenessData = async () => {
    try {
      const [interventions, weekly] = await Promise.all([
        fetch("/api/research/dashboard/intervention-effectiveness", authHeaders()).then(r => r.json()),
        fetch("/api/research/dashboard/effectiveness-summary", authHeaders()).then(r => r.json()).catch(() => null),
      ]);
      setEffectivenessData({ interventions, summary: weekly });
    } catch (e) { console.error("Failed to load effectiveness:", e); }
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
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Checking research database...</p>
        </div>
      </div>
    );
  }

  if (dbStatus === "unavailable") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md p-8">
          <div className="text-6xl mb-4">🔬</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Research Mode</h2>
          <p className="text-gray-500 text-sm mb-4">
            PostgreSQL database is not configured. Set <code className="bg-gray-100 px-1 rounded">DATABASE_URL</code> in your .env file to enable research analytics.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-left text-xs font-mono text-gray-600 mb-4">
            <p>DATABASE_URL=postgresql://user:pass@host:5432/dbname</p>
          </div>
          <button onClick={checkDbStatus} className="text-emerald-600 font-bold text-sm hover:underline">
            Check again
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "overview", label: "Tong quan", icon: <BarChart3 size={16} /> },
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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
              <BarChart3 className="text-emerald-600" />
              Research Dashboard
            </h1>
            <p className="text-sm text-gray-500">ISEF Research Platform - BMO Robot</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => exportData("events")}
              className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors"
            >
              <Download size={16} /> Export Events
            </button>
            <button
              onClick={() => exportData("interventions")}
              className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors"
            >
              <Download size={16} /> Export Interventions
            </button>
            <button
              onClick={loadOverviewData}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors"
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            </div>
          ) : activeTab === "overview" && data ? (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-6">Research Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-emerald-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Total Users</p>
                  <p className="text-3xl font-black text-emerald-800">{data.totalUsers}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-blue-600 uppercase mb-1">Total Events</p>
                  <p className="text-3xl font-black text-blue-800">{data.totalEvents.toLocaleString()}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-amber-600 uppercase mb-1">Active (7d)</p>
                  <p className="text-3xl font-black text-amber-800">{data.activeUsers7d}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-purple-600 uppercase mb-1">Avg Session</p>
                  <p className="text-3xl font-black text-purple-800">{Math.round(data.avgSessionDurationSeconds / 60)}m</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Personality Distribution */}
                <div>
                  <h3 className="font-bold text-gray-700 mb-3">Personality Mode Distribution</h3>
                  <div className="space-y-3">
                    {data.personalityDistribution.map((p) => {
                      const total = data.personalityDistribution.reduce((a, b) => a + parseInt(b.count), 0);
                      const pct = total > 0 ? (parseInt(p.count) / total) * 100 : 0;
                      const colors: Record<string, string> = {
                        friendly: "bg-emerald-500",
                        competitive: "bg-red-500",
                        mentor: "bg-blue-500",
                        playful: "bg-amber-500",
                      };
                      return (
                        <div key={p.personality_mode}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium capitalize">{p.personality_mode}</span>
                            <span className="text-gray-500">{p.count} ({pct.toFixed(1)}%)</span>
                          </div>
                          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${colors[p.personality_mode] || "bg-gray-400"} rounded-full transition-all`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {data.personalityDistribution.length === 0 && (
                      <p className="text-gray-400 text-sm italic">No personality assignments yet.</p>
                    )}
                  </div>
                </div>

                {/* Behavioral Profile Distribution */}
                <div>
                  <h3 className="font-bold text-gray-700 mb-3">Behavioral Profile Distribution</h3>
                  <div className="space-y-3">
                    {data.profileDistribution.map((p) => {
                      const total = data.profileDistribution.reduce((a, b) => a + parseInt(b.count), 0);
                      const pct = total > 0 ? (parseInt(p.count) / total) * 100 : 0;
                      const colors: Record<string, string> = {
                        competitive: "bg-red-500",
                        collector: "bg-purple-500",
                        casual: "bg-gray-400",
                        streak_driven: "bg-orange-500",
                        social: "bg-teal-500",
                      };
                      return (
                        <div key={p.profile_type}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium capitalize">{p.profile_type.replace("_", " ")}</span>
                            <span className="text-gray-500">{p.count} ({pct.toFixed(1)}%)</span>
                          </div>
                          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${colors[p.profile_type] || "bg-gray-400"} rounded-full transition-all`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {data.profileDistribution.length === 0 && (
                      <p className="text-gray-400 text-sm italic">No behavioral profiles yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "retention" ? (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-6">Retention Analysis</h2>
              {retentionData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="p-3 text-left font-bold text-gray-600">Date</th>
                        <th className="p-3 text-right font-bold text-gray-600">Created</th>
                        <th className="p-3 text-right font-bold text-gray-600">Retained (7d)</th>
                        <th className="p-3 text-right font-bold text-gray-600">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {retentionData.map((r, i) => {
                        const rate = r.created > 0 ? ((r.retained / r.created) * 100).toFixed(1) : "0";
                        return (
                          <tr key={i} className="border-b border-gray-50">
                            <td className="p-3 font-medium">{r.day}</td>
                            <td className="p-3 text-right">{r.created}</td>
                            <td className="p-3 text-right">{r.retained}</td>
                            <td className="p-3 text-right">
                              <span className={`font-bold ${parseFloat(rate) > 50 ? "text-emerald-600" : "text-red-500"}`}>
                                {rate}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8 italic">No retention data available yet.</p>
              )}
            </div>
          ) : activeTab === "interventions" ? (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-6">Intervention Effectiveness</h2>
              {interventionData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="p-3 text-left font-bold text-gray-600">Intervention Type</th>
                        <th className="p-3 text-right font-bold text-gray-600">Count</th>
                        <th className="p-3 text-right font-bold text-gray-600">Avg Effectiveness</th>
                        <th className="p-3 text-right font-bold text-gray-600">Verdict</th>
                      </tr>
                    </thead>
                    <tbody>
                      {interventionData.map((r: any, i) => {
                        const eff = parseFloat(String(r.avg_effectiveness || r.avg_dur || 0));
                        return (
                          <tr key={i} className="border-b border-gray-50">
                            <td className="p-3 font-medium capitalize">{r.intervention_type.replace("_", " ")}</td>
                            <td className="p-3 text-right">{r.count}</td>
                            <td className="p-3 text-right">
                              <span className={`font-bold ${eff > 20 ? "text-emerald-600" : eff > 0 ? "text-amber-600" : "text-red-500"}`}>
                                {eff > 0 ? "+" : ""}{eff.toFixed(1)}%
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                eff > 20 ? "bg-emerald-100 text-emerald-700" : eff > 0 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                              }`}>
                                {eff > 20 ? "HIGHLY EFFECTIVE" : eff > 0 ? "MODERATE" : "INEFFECTIVE"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8 italic">No intervention data yet. Interventions are tracked as users interact.</p>
              )}
            </div>
          ) : activeTab === "personality" ? (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-6">Personality Mode Comparison (HCI Experiment)</h2>
              <div className="bg-emerald-50 rounded-xl p-4 mb-6 text-sm">
                <p className="font-bold text-emerald-800">Hypothesis</p>
                <p className="text-emerald-700">Mentor + Friendly modes will produce higher retention than Competitive + Playful modes.</p>
              </div>
              {interventionData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="p-3 text-left font-bold text-gray-600">Personality Mode</th>
                        <th className="p-3 text-right font-bold text-gray-600">Users</th>
                        <th className="p-3 text-right font-bold text-gray-600">Avg Session (min)</th>
                        <th className="p-3 text-right font-bold text-gray-600">Avg Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {interventionData.map((r: any, i: number) => {
                        const colors: Record<string, string> = {
                          friendly: "text-emerald-600",
                          competitive: "text-red-600",
                          mentor: "text-blue-600",
                          playful: "text-amber-600",
                        };
                        return (
                          <tr key={i} className="border-b border-gray-50">
                            <td className="p-3 font-medium capitalize">
                              <span className={colors[r.personality_mode] || ""}>{r.personality_mode}</span>
                            </td>
                            <td className="p-3 text-right font-bold">{r.user_count}</td>
                            <td className="p-3 text-right">{r.avg_session_duration ? (r.avg_session_duration / 60).toFixed(1) : "N/A"}</td>
                            <td className="p-3 text-right">{r.avg_actions ? r.avg_actions.toFixed(1) : "N/A"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8 italic">No personality comparison data yet.</p>
              )}
            </div>
          ) : activeTab === "decay" ? (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-6">Engagement Decay Curve</h2>
              {decayData.length > 0 ? (
                <div>
                  <div className="h-64 flex items-end gap-1">
                    {decayData.map((d, i) => {
                      const maxScore = Math.max(...decayData.map((r: any) => r.avg_engagement || 0), 1);
                      const height = ((d.avg_engagement || 0) / maxScore) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full bg-gradient-to-t from-emerald-400 to-emerald-200 rounded-t-sm transition-all hover:from-emerald-500 hover:to-emerald-300"
                            style={{ height: `${Math.max(height, 2)}%` }}
                            title={`${d.avg_engagement?.toFixed(2)} (${d.user_count} users)`}
                          />
                          <span className="text-xs text-gray-400 transform -rotate-45 origin-center">{d.day}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-center mt-4 gap-6 text-xs text-gray-500">
                    <span>Y-axis: Average engagement score (0-1)</span>
                    <span>X-axis: Date</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8 italic">No engagement data yet. Data accumulates as users interact with the app.</p>
              )}
            </div>
          ) : activeTab === "simulation" ? (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-6">Digital Twin Predictions (Your Account)</h2>
              <p className="text-sm text-gray-500 mb-6">
                These predictions are computed using your behavioral data. Higher confidence = more reliable prediction.
              </p>
              {simulationData.length > 0 ? (
                <div className="space-y-4">
                  {simulationData.map((sim, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-800 capitalize">{sim.predictionType.replace("_", " ")}</h3>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          sim.confidence > 0.7 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {sim.confidence > 0.7 ? "HIGH CONFIDENCE" : "LOW CONFIDENCE"} ({sim.confidence})
                        </span>
                      </div>
                      <div className="flex gap-8 mb-2">
                        <div>
                          <p className="text-xs text-gray-500">Predicted Value</p>
                          <p className="text-2xl font-black text-gray-800">
                            {sim.predictedValue}{sim.predictionType === "dropout_risk" ? "%" : ""}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Horizon</p>
                          <p className="text-lg font-bold text-gray-600">{sim.horizonDays} days</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{sim.reasoning}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8 italic">No simulation data yet.</p>
              )}
            </div>
          ) : activeTab === "ai-metrics" ? (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Cpu className="text-emerald-600" /> AI Vision Model Benchmark
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Comparing AI models for waste classification: Gemini (cloud), MobileNetV2, EfficientNet-Lite, YOLOv8n (TFLite/ONNX).
              </p>
              <ModelBenchmarkCharts benchmark={modelBenchmark} confusionMatrix={confusionMatrix} />
            </div>
          ) : activeTab === "experiments" ? (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FlaskConical className="text-emerald-600" /> A/B Experiment Management
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Rigorous causal inference through randomized controlled experiments. Each experiment assigns users to treatment/control groups.
              </p>

              {/* Active Experiments */}
              <h3 className="font-bold text-gray-700 mb-3">Active Experiments</h3>
              {experiments.length > 0 ? (
                <div className="space-y-4 mb-8">
                  {experiments.map((exp: any) => (
                    <div key={exp.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-gray-800">{exp.name}</h4>
                          <p className="text-xs text-gray-500 mt-1">{exp.description}</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          exp.status === "active" ? "bg-emerald-100 text-emerald-700" :
                          exp.status === "paused" ? "bg-amber-100 text-amber-700" :
                          "bg-gray-200 text-gray-600"
                        }`}>
                          {exp.status?.toUpperCase()}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(exp.groups || []).map((g: any) => (
                          <div key={g.name} className="bg-white rounded-lg px-3 py-1.5 text-xs border border-gray-200">
                            <span className="font-bold capitalize">{g.name}</span>
                            <span className="text-gray-400 ml-1">({(g.ratio * 100).toFixed(0)}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 italic mb-8">No experiments configured.</p>
              )}

              {/* Experiment Results */}
              {expResults && !expResults.error ? (
                <>
                  <h3 className="font-bold text-gray-700 mb-3">Adaptive Rewards Experiment Results</h3>
                  <div className="bg-emerald-50 rounded-xl p-4 mb-6">
                    <div className="grid md:grid-cols-3 gap-4 text-center">
                      {expResults.groups?.map((g: any) => (
                        <div key={g.name}>
                          <p className="text-xs text-gray-500 uppercase">{g.name}</p>
                          <p className="text-2xl font-black text-emerald-800">{g.userCount}</p>
                          <p className="text-xs text-gray-500">users</p>
                        </div>
                      ))}
                    </div>
                    {expResults.statistics && (
                      <div className="mt-4 pt-4 border-t border-emerald-200 grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Effect Size (Cohen's d)</p>
                          <p className="font-bold text-emerald-800">{expResults.statistics.effect_size ?? "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Significance</p>
                          <p className="font-bold">{expResults.statistics.significant ? "Statistically Significant" : "Not yet significant"}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Retention by group */}
                  {expResults.retention?.length > 0 && (
                    <div className="overflow-x-auto mb-6">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="p-3 text-left font-bold text-gray-600">Group</th>
                            <th className="p-3 text-right font-bold text-gray-600">Assigned</th>
                            <th className="p-3 text-right font-bold text-gray-600">Active 7d</th>
                            <th className="p-3 text-right font-bold text-gray-600">Retention Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expResults.retention.map((r: any, i: number) => (
                            <tr key={i} className="border-b border-gray-50">
                              <td className="p-3 font-medium capitalize">{r.group_name}</td>
                              <td className="p-3 text-right">{r.total_assigned}</td>
                              <td className="p-3 text-right">{r.active_7d}</td>
                              <td className="p-3 text-right">
                                <span className={`font-bold ${(r.retention_rate_7d || 0) > 50 ? "text-emerald-600" : "text-red-500"}`}>
                                  {r.retention_rate_7d ?? 0}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500 mb-6">
                  Experiment results require active users in each group. Data populates as users are assigned.
                </div>
              )}

              {/* Metrics tracked */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="font-bold text-blue-800 mb-2">Tracked Metrics</h4>
                <div className="flex flex-wrap gap-2 text-xs">
                  {["retention_7d", "engagement_score", "streak_days", "session_duration", "chat_messages_count"].map(m => (
                    <span key={m} className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-mono">{m}</span>
                  ))}
                </div>
              </div>

              {/* Statistical Panel */}
              <div className="mt-6">
                <h3 className="font-bold text-gray-800 mb-3">Statistical Analysis</h3>
                <StatisticalPanel
                  experimentResults={expResults}
                  experimentName={expResults?.name || "Adaptive Rewards"}
                />
              </div>
            </div>
          ) : activeTab === "social" ? (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Network className="text-emerald-600" /> Social Network Analysis
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Peer influence tracking and community detection. Understanding how users interact with each other.
              </p>

              {/* Network Summary */}
              {socialSummary ? (
                <div className="grid md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-xs font-bold text-blue-600 uppercase">Active Users</p>
                    <p className="text-3xl font-black text-blue-800">{socialSummary.totalUsers}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-4">
                    <p className="text-xs font-bold text-emerald-600 uppercase">Total Interactions</p>
                    <p className="text-3xl font-black text-emerald-800">{socialSummary.totalInteractions}</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-4">
                    <p className="text-xs font-bold text-amber-600 uppercase">Avg Degree</p>
                    <p className="text-3xl font-black text-amber-800">{socialSummary.avgDegree}</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4">
                    <p className="text-xs font-bold text-purple-600 uppercase">Communities</p>
                    <p className="text-3xl font-black text-purple-800">{socialSummary.communityCount}</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 italic mb-8">No social data yet.</p>
              )}

              {/* Team vs Solo */}
              {teamVsSolo && (teamVsSolo.team > 0 || teamVsSolo.solo > 0) && (
                <div className="mb-8">
                  <h3 className="font-bold text-gray-700 mb-3">Team vs Solo Retention</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-emerald-50 rounded-xl p-4 text-center">
                      <p className="text-sm text-gray-500 mb-1">Team Players</p>
                      <p className="text-3xl font-black text-emerald-800">{teamVsSolo.team}%</p>
                      <p className="text-xs text-gray-400">7-day retention</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <p className="text-sm text-gray-500 mb-1">Solo Players</p>
                      <p className="text-3xl font-black text-gray-800">{teamVsSolo.solo}%</p>
                      <p className="text-xs text-gray-400">7-day retention</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Top Influencers */}
              {influencers.length > 0 && (
                <div className="mb-8">
                  <h3 className="font-bold text-gray-700 mb-3">Top Influencers (PageRank)</h3>
                  <div className="space-y-2">
                    {influencers.map((inf: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-gray-400 text-white" : i === 2 ? "bg-orange-400 text-white" : "bg-gray-200 text-gray-600"
                        }`}>{i + 1}</span>
                        <span className="font-medium text-sm">{inf.userId.slice(0, 8)}...</span>
                        <span className="text-xs text-gray-400 ml-auto">PR: {inf.pageRank?.toFixed(3)} | Degree: {inf.degree}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Community Clusters */}
              {communities.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-700 mb-3">Community Clusters</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="p-3 text-left font-bold text-gray-600">Community</th>
                          <th className="p-3 text-right font-bold text-gray-600">Size</th>
                          <th className="p-3 text-right font-bold text-gray-600">Avg Retention</th>
                          <th className="p-3 text-right font-bold text-gray-600">Avg Engagement</th>
                        </tr>
                      </thead>
                      <tbody>
                        {communities.map((c: any, i: number) => (
                          <tr key={i} className="border-b border-gray-50">
                            <td className="p-3 font-medium">Cluster {c.communityId || i + 1}</td>
                            <td className="p-3 text-right">{c.size}</td>
                            <td className="p-3 text-right text-emerald-600 font-medium">{c.avgRetention ?? 0}%</td>
                            <td className="p-3 text-right">{c.avgEngagement ? (c.avgEngagement / 60).toFixed(1) + "m" : "N/A"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {(socialSummary?.totalInteractions || 0) === 0 && (
                <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
                  <p className="font-bold mb-1">No social interactions yet</p>
                  <p>Profile views, leaderboard views, team joins, and shares are tracked as social interactions.</p>
                </div>
              )}
            </div>
          ) : activeTab === "longitudinal" ? (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <TrendingUp className="text-emerald-600" /> Longitudinal Analytics
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Week-by-week cohort analysis, engagement decay curves, and survival analysis.
              </p>

              {/* Kaplan-Meier Survival Curve */}
              {survivalData.length > 0 && (
                <div className="mb-8">
                  <h3 className="font-bold text-gray-700 mb-3">Kaplan-Meier Survival Curve</h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Probability of continued engagement over time. Higher curve = better retention.
                  </p>
                  <div className="h-48 flex items-end gap-1">
                    {survivalData.map((s: any, i: number) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-gradient-to-t from-blue-500 to-blue-200 rounded-t-sm transition-all hover:from-blue-600 hover:to-blue-300 cursor-pointer"
                          style={{ height: `${Math.max(s.survivalRate, 1)}%` }}
                          title={`${s.survivalRate}% (At risk: ${s.atRisk})`}
                        />
                        <span className="text-xs text-gray-400 text-center">{s.weekLabel}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 grid md:grid-cols-3 gap-4 text-center">
                    {survivalData.slice(-1).map((s: any) => (
                      <>
                        <div key="surv">
                          <p className="text-xs text-gray-500">Final Survival Rate</p>
                          <p className="text-2xl font-black text-blue-800">{s.survivalRate}%</p>
                        </div>
                        <div key="risk">
                          <p className="text-xs text-gray-500">Last Week At Risk</p>
                          <p className="text-2xl font-black text-gray-800">{s.atRisk}</p>
                        </div>
                        <div key="events">
                          <p className="text-xs text-gray-500">Total Churn Events</p>
                          <p className="text-2xl font-black text-red-500">{survivalData.reduce((acc: number, x: any) => acc + x.events, 0)}</p>
                        </div>
                      </>
                    ))}
                  </div>
                </div>
              )}

              {/* Engagement Decay Curve */}
              {engagementDecay.length > 0 && (
                <div className="mb-8">
                  <h3 className="font-bold text-gray-700 mb-3">Engagement Decay Over Time</h3>
                  <div className="h-48 flex items-end gap-1">
                    {engagementDecay.map((d: any, i: number) => {
                      const maxVal = Math.max(...engagementDecay.map((r: any) => r.avgEngagement || 0), 1);
                      const height = (d.avgEngagement / maxVal) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full bg-gradient-to-t from-emerald-500 to-emerald-200 rounded-t-sm transition-all hover:from-emerald-600 hover:to-emerald-300"
                            style={{ height: `${Math.max(height, 2)}%` }}
                            title={d.avgEngagement?.toFixed(1)}
                          />
                          <span className="text-xs text-gray-400">W{d.week}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cohort Retention Table */}
              {cohortTable && Object.keys(cohortTable).length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-700 mb-3">Cohort Retention Table</h3>
                  <p className="text-xs text-gray-500 mb-4">
                    % of users from each cohort still active each subsequent week.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="p-2 text-left font-bold text-gray-600">Cohort Week</th>
                          {Array.from({ length: 8 }, (_, i) => (
                            <th key={i} className="p-2 text-center font-bold text-gray-600">W{i + 1}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(cohortTable).slice(0, 8).map(([cohort, weeks]: [string, any]) => {
                          const maxUsers = Math.max(...Object.values(weeks as Record<string, number>), 1);
                          return (
                            <tr key={cohort} className="border-b border-gray-50">
                              <td className="p-2 font-medium">{cohort}</td>
                              {Array.from({ length: 8 }, (_, w) => {
                                const users = weeks[w + 1] || 0;
                                const pct = Math.round((users / maxUsers) * 100);
                                return (
                                  <td key={w} className="p-2 text-center">
                                    <span className={`font-medium ${pct > 70 ? "text-emerald-600" : pct > 40 ? "text-amber-600" : "text-red-500"}`}>
                                      {users > 0 ? `${pct}%` : "-"}
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {(survivalData.length === 0 && engagementDecay.length === 0 && Object.keys(cohortTable).length === 0) && (
                <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
                  <p className="font-bold mb-1">No longitudinal data yet</p>
                  <p>Data accumulates over weeks. Kaplan-Meier and cohort tables will populate as users interact over time.</p>
                </div>
              )}
            </div>
          ) : activeTab === "statistics" ? (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                <BarChart3 className="text-emerald-600" /> Statistical Analysis
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Research-grade statistical tests: Welch&apos;s t-test, ANOVA, effect sizes, power analysis, and normality tests.
              </p>
              <StatisticalPanel
                experimentResults={statsData}
                experimentName={statsData?.name || "Adaptive Rewards Experiment"}
              />
              {(!statsData || statsData.error) && (
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500 text-center">
                  Statistical results require active experiment data. Results populate as users are assigned to groups.
                </div>
              )}
            </div>
          ) : activeTab === "effectiveness" ? (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                <TrendingUp className="text-emerald-600" /> Effectiveness Summary
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Auto-generated effectiveness metrics for all interventions and AI systems.
              </p>
              {/* Effectiveness Summary Cards */}
              {effectivenessData?.summary ? (
                <div className="grid md:grid-cols-3 gap-4 mb-8">
                  {Object.entries(effectivenessData.summary).map(([metric, data]: [string, any]) => (
                    <div key={metric} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-1">{metric.replace(/_/g, " ")}</p>
                      <p className={`text-3xl font-black ${(data.change || 0) > 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {data.value !== undefined ? `${data.change > 0 ? "+" : ""}${typeof data.value === "number" ? data.value.toFixed(1) : data.value}${data.unit || "%"}` : "—"}
                      </p>
                      {data.pValue !== undefined && (
                        <p className="text-xs text-gray-400 mt-1">p {data.pValue < 0.001 ? "< 0.001" : data.pValue.toFixed(3)}</p>
                      )}
                      {data.change !== undefined && (
                        <p className={`text-xs font-bold mt-1 ${data.change > 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {data.change > 0 ? "+" : ""}{data.change.toFixed(1)}% vs control
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500 mb-8">
                  Effectiveness summary requires experiment data. Summary auto-generates as data accumulates.
                </div>
              )}
              {/* Intervention Effectiveness Table */}
              {effectivenessData?.interventions && effectivenessData.interventions.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-700 mb-3">Intervention Effectiveness by Type</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="p-3 text-left font-bold text-gray-600">Intervention</th>
                          <th className="p-3 text-right font-bold text-gray-600">Count</th>
                          <th className="p-3 text-right font-bold text-gray-600">Avg Score</th>
                          <th className="p-3 text-right font-bold text-gray-600">Score Std</th>
                          <th className="p-3 text-right font-bold text-gray-600">Verdict</th>
                        </tr>
                      </thead>
                      <tbody>
                        {effectivenessData.interventions.map((r: any, i: number) => {
                          const avg = parseFloat(r.avg_score || "0");
                          const std = parseFloat(r.score_std || "0");
                          return (
                            <tr key={i} className="border-b border-gray-50">
                              <td className="p-3 font-medium capitalize">{r.intervention_type?.replace(/_/g, " ")}</td>
                              <td className="p-3 text-right">{r.count}</td>
                              <td className="p-3 text-right font-bold text-emerald-600">{avg > 0 ? `+${avg.toFixed(1)}%` : `${avg.toFixed(1)}%`}</td>
                              <td className="p-3 text-right text-gray-500">{std.toFixed(2)}</td>
                              <td className="p-3 text-right">
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                  avg > 20 ? "bg-emerald-100 text-emerald-700" :
                                  avg > 0 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                                }`}>
                                  {avg > 20 ? "HIGHLY EFFECTIVE" : avg > 0 ? "MODERATE" : "INEFFECTIVE"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {(!effectivenessData?.interventions || effectivenessData.interventions.length === 0) && (
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500 text-center">
                  No intervention effectiveness data yet. Interventions are tracked as users interact.
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Research Attribution */}
        <div className="mt-6 text-center text-xs text-gray-400">
          <p>BMO Robot Research Platform - Data pipeline logs all user interactions for behavioral research.</p>
          <p>Export data for statistical analysis: regression, ANOVA, survival analysis, and behavioral clustering.</p>
        </div>
      </div>
    </div>
  );
}
