import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Gift, Plus, Trash, LogOut, BarChart3, Search, Shield, RefreshCw, FlaskConical, Eye, Trash2, Ban, Zap, Activity } from "lucide-react";
import { User, RewardItem } from "../types";
import { Badge, Button, Card, EmptyState, FieldLabel, Input, LoadingSpinner, SectionHeading, TabButton, TextArea } from "../lib/ui";

interface Props {
  user: User;
  onLogout: () => void;
}

interface AdminStats {
  total: number;
  admins: number;
  activeUsers: number;
  researchActive7d?: number;
  researchActive1d?: number;
  experimentCount?: number;
}

interface UserDetail {
  nick: string;
  name: string;
  account_id: string;
  points: number;
  role?: string;
  profile?: any;
  interventions?: any[];
  decay?: any;
}

export function AdminDashboard({ user, onLogout }: Props) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"overview" | "rewards" | "users" | "experiments">("overview");
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [experiments, setExperiments] = useState<any[]>([]);
  const [expLoading, setExpLoading] = useState(false);
  const [newExp, setNewExp] = useState({ id: "", name: "", description: "", groups: [{ name: "control", description: "No intervention", ratio: 0.25 }] });
  const [showNewExp, setShowNewExp] = useState(false);
  const [showAddReward, setShowAddReward] = useState(false);
  const [newReward, setNewReward] = useState({
    name: "", desc: "", cost: 1000, imageUrl: "",
    ingredients: "Quà tặng,E-Voucher",
    color: "from-amber-400 to-orange-500",
    bgClass: "bg-amber-50", borderClass: "border-amber-200",
  });

  const token = localStorage.getItem("auth_token");
  const authHeaders = () => ({ headers: { Authorization: `Bearer ${token}` } });

  useEffect(() => {
    loadStats();
    fetchRewards();
    fetchUsers();
    fetchExperiments();
  }, []);

  const loadStats = async () => {
    try {
      const res = await fetch("/api/admin/stats", authHeaders());
      if (res.ok) setStats(await res.json());
    } catch {}
  };

  const fetchRewards = async () => {
    setLoading(true);
    setLoadingError(null);
    try {
      const res = await fetch("/api/rewards");
      if (!res.ok) throw new Error("Không thể tải danh sách quà");
      setRewards(await res.json());
    } catch (e: unknown) {
      setLoadingError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users", authHeaders());
      if (res.ok) setUsers(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchExperiments = async () => {
    setExpLoading(true);
    try {
      const res = await fetch("/api/experiments", authHeaders());
      if (res.ok) setExperiments(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setExpLoading(false);
    }
  };

  const fetchUserDetail = async (u: User) => {
    setUserDetailLoading(true);
    setSelectedUser(null);
    try {
      const accountId = u.account_id;
      const [profileRes, decayRes, interventionsRes] = await Promise.all([
        fetch(`/api/profile/${accountId}`, authHeaders()),
        fetch(`/api/decay/${accountId}`, authHeaders()),
        fetch(`/api/interventions/${accountId}`, authHeaders()),
      ]);
      const profile = profileRes.ok ? await profileRes.json() : null;
      const decay = decayRes.ok ? await decayRes.json() : null;
      const interventions = interventionsRes.ok ? await interventionsRes.json() : [];
      setSelectedUser({ ...u, profile, decay, interventions });
    } catch {
      setSelectedUser({ ...u, profile: null, decay: null, interventions: [] });
    } finally {
      setUserDetailLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("image", file);
    setUploading(true);
    try {
      const res = await fetch("/api/upload", { ...authHeaders(), method: "POST", body: formData });
      const data = await res.json();
      if (data.url) setNewReward((prev) => ({ ...prev, imageUrl: data.url }));
      else alert("Upload failed: " + (data.error || "Unknown error"));
    } catch (error) {
      console.error("Failed to upload image", error);
      alert("Lỗi upload ảnh");
    }
    setUploading(false);
  };

  const handleAddReward = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: RewardItem = {
        id: Date.now().toString(),
        name: newReward.name,
        desc: newReward.desc,
        cost: Number(newReward.cost),
        imageUrl: newReward.imageUrl,
        ingredients: newReward.ingredients.split(",").map((s) => s.trim()),
        color: newReward.color,
        bgClass: newReward.bgClass,
        borderClass: newReward.borderClass,
      };
      await fetch("/api/rewards", { ...authHeaders(), method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      setShowAddReward(false);
      fetchRewards();
    } catch (error) {
      console.error("Failed to add reward", error);
    }
  };

  const handleDeleteReward = async (id: string | number) => {
    if (!confirm("Bạn có chắc muốn xóa quà này?")) return;
    await fetch(`/api/rewards/${id}`, { ...authHeaders(), method: "DELETE" });
    fetchRewards();
  };

  const handleRoleChange = async (nick: string, newRole: string) => {
    await fetch(`/api/admin/users/${nick}/role`, { ...authHeaders(), method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: newRole }) });
    fetchUsers();
  };

  const handlePointsAdjust = async (nick: string, delta: number, reason: string) => {
    await fetch(`/api/admin/users/${nick}/adjust-points`, { ...authHeaders(), method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ delta, reason }) });
    fetchUsers();
    if (selectedUser?.nick === nick) {
      const updated = users.find((u) => u.nick === nick);
      if (updated) fetchUserDetail(updated);
    }
  };

  const handleSuspend = async (nick: string, suspended: boolean) => {
    await fetch(`/api/admin/users/${nick}/suspend`, { ...authHeaders(), method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ suspended }) });
    fetchUsers();
    setSelectedUser(null);
  };

  const handleResetProgress = async (nick: string) => {
    if (!confirm(`CẢNH BÁO: Reset toàn bộ tiến độ của "${nick}"? Hành động này không thể hoàn tác!`)) return;
    await fetch(`/api/admin/users/${nick}/reset-progress?confirm=true`, { ...authHeaders(), method: "POST" });
    fetchUsers();
    setSelectedUser(null);
  };

  const [syncingSheets, setSyncingSheets] = useState(false);
  const handleSyncSheets = async () => {
    setSyncingSheets(true);
    try {
      const res = await fetch("/api/admin/sync-sheets", {
        ...authHeaders(),
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId: "1xqrjBMynOYuqGbvmBbuEHXFWZT0ZpwQE6Uy2N7tkr-Q" }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Đã sync ${data.totalImported} người dùng từ Google Sheets!`);
        fetchUsers();
        loadStats();
      } else {
        alert("Sync thất bại: " + (data.error || data.message));
      }
    } catch {
      alert("Sync thất bại: lỗi kết nối");
    }
    setSyncingSheets(false);
  };

  const handleTriggerDecay = async (accountId: string) => {
    await fetch(`/api/admin/decay/${accountId}/detect`, { ...authHeaders(), method: "POST" });
    if (selectedUser) fetchUserDetail(selectedUser);
  };

  const handleCreateExp = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/experiments", {
      ...authHeaders(), method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newExp, metrics: ["engagement", "retention"] }),
    });
    setShowNewExp(false);
    setNewExp({ id: "", name: "", description: "", groups: [{ name: "control", description: "No intervention", ratio: 0.25 }] });
    fetchExperiments();
  };

  const handleExpAction = async (expId: string, action: "pause" | "activate" | "delete") => {
    await fetch(`/api/experiments/${expId}/${action}`, { ...authHeaders(), method: "POST" });
    fetchExperiments();
  };

  const filteredUsers = users.filter((u) =>
    (u.name || "").toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.nick || "").toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.account_id || "").toLowerCase().includes(userSearch.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="rounded-[32px] border-0 bg-[linear-gradient(140deg,#0f172a,#13322c_55%,#0f8f68)] p-6 text-white shadow-[var(--shadow-strong)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Badge tone="success" className="bg-white/10 text-white border-white/10">Admin control center</Badge>
              <h1 className="mt-4 text-3xl font-black tracking-tight">Dashboard quản trị</h1>
              <p className="mt-2 text-sm leading-6 text-white/75">Xin chào, {user.name}. Quản lý người dùng, quà tặng, thử nghiệm và dữ liệu nghiên cứu trong một giao diện gọn gàng hơn.</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => navigate("/research")} variant="ghost" className="bg-white/10 text-white border-white/10 hover:bg-white/20">
                <BarChart3 size={16} />
                Mở Research
              </Button>
              <Button onClick={onLogout} variant="danger">
                <LogOut size={16} />
                Đăng xuất
              </Button>
            </div>
          </div>
        </Card>

        <div className="flex flex-wrap gap-2">
          {[
            { id: "overview", icon: Activity, label: "Tổng quan" },
            { id: "rewards", icon: Gift, label: "Quà tặng" },
            { id: "users", icon: Users, label: "Người chơi" },
            { id: "experiments", icon: FlaskConical, label: "Experiments" },
          ].map(({ id, icon: Icon, label }) => (
            <Button key={id} onClick={() => setActiveTab(id as any)} variant={activeTab === id ? "secondary" : "ghost"}>
              <Icon size={16} />
              {label}
            </Button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Tổng người dùng", value: stats?.total || "—", tone: "accent" as const, icon: Users },
              { label: "Tài khoản admin", value: stats?.admins || "—", tone: "warning" as const, icon: Shield },
              { label: "Hoạt động 7 ngày", value: stats?.activeUsers || "—", tone: "success" as const, icon: Activity },
              { label: "Research active 7d", value: stats?.researchActive7d || "—", tone: "default" as const, icon: BarChart3 },
            ].map(({ label, value, tone, icon: Icon }) => (
              <Card key={label} className="rounded-[28px] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <Badge tone={tone}>{label}</Badge>
                  <div className="rounded-full bg-slate-100 p-2 text-slate-500"><Icon size={18} /></div>
                </div>
                <p className="text-4xl font-black text-slate-900">{value}</p>
              </Card>
            ))}
          </div>
        )}

        {activeTab === "rewards" && (
          <Card className="rounded-[32px] p-6">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <SectionHeading title="Danh sách quà tặng" subtitle="Quản lý kho quà, hình ảnh và chi phí quy đổi." />
              <Button onClick={() => setShowAddReward(!showAddReward)}>
                <Plus size={16} />
                {showAddReward ? "Ẩn biểu mẫu" : "Thêm quà mới"}
              </Button>
            </div>

            {showAddReward && (
              <form onSubmit={handleAddReward} className="mb-6 grid gap-4 rounded-[28px] border border-slate-100 bg-slate-50 p-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <FieldLabel>Tên quà tặng</FieldLabel>
                  <Input required value={newReward.name} onChange={(e) => setNewReward({ ...newReward, name: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Mô tả</FieldLabel>
                  <TextArea required value={newReward.desc} onChange={(e) => setNewReward({ ...newReward, desc: e.target.value })} rows={3} />
                </div>
                <div>
                  <FieldLabel>Giá điểm</FieldLabel>
                  <Input required type="number" value={String(newReward.cost)} onChange={(e) => setNewReward({ ...newReward, cost: Number(e.target.value) })} />
                </div>
                <div>
                  <FieldLabel>Ảnh quà</FieldLabel>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" disabled={uploading} />
                  {uploading && <p className="mt-2 text-xs font-bold text-blue-500">Đang upload...</p>}
                  {newReward.imageUrl && <img src={newReward.imageUrl} alt="preview" className="mt-3 h-14 w-14 rounded-xl border object-cover" />}
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Thành phần</FieldLabel>
                  <Input value={newReward.ingredients} onChange={(e) => setNewReward({ ...newReward, ingredients: e.target.value })} />
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <Button type="submit">Lưu quà tặng</Button>
                </div>
              </form>
            )}

            {loading ? <LoadingSpinner message="Đang tải quà tặng..." /> : loadingError ? <EmptyState title="Không thể tải quà tặng" subtitle={loadingError} /> : (
              <div className="grid gap-4 md:grid-cols-2">
                {rewards.map((r) => (
                  <div key={r.id} className="flex items-center gap-4 rounded-[24px] border border-slate-100 bg-slate-50 p-4">
                    <img src={r.imageUrl} alt={r.name} className="h-16 w-16 rounded-xl object-cover shadow-sm" />
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate font-bold text-slate-900">{r.name}</h4>
                      <p className="mt-1 line-clamp-1 text-xs text-slate-500">{r.desc}</p>
                      <p className="mt-1 text-sm font-black text-amber-600">{r.cost} EXP</p>
                    </div>
                    <Button onClick={() => handleDeleteReward(r.id)} variant="danger" size="sm">
                      <Trash size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {activeTab === "users" && (
          <Card className="rounded-[32px] p-6">
            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <SectionHeading title={`Danh sách người chơi (${filteredUsers.length})`} subtitle="Xem hồ sơ, điều chỉnh quyền, điểm và theo dõi trạng thái decay." />
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[260px] flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <Input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Tìm tài khoản, tên..." className="pl-9" />
                </div>
                <Button onClick={() => { fetchUsers(); loadStats(); }} variant="ghost"><RefreshCw size={16} /> Làm mới</Button>
                <Button onClick={handleSyncSheets} disabled={syncingSheets}><RefreshCw size={14} className={syncingSheets ? "animate-spin" : ""} />{syncingSheets ? "Đang sync..." : "Sync Sheets"}</Button>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
              <div className="overflow-hidden rounded-[28px] border border-slate-100">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500">
                      <tr>
                        <th className="p-3 font-bold">Tài khoản</th>
                        <th className="p-3 font-bold">Tên</th>
                        <th className="p-3 font-bold">EXP</th>
                        <th className="p-3 font-bold">Role</th>
                        <th className="p-3 font-bold">Xem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => (
                        <tr key={u.account_id} onClick={() => fetchUserDetail(u)} className={`cursor-pointer border-t border-slate-100 transition hover:bg-slate-50 ${selectedUser?.account_id === u.account_id ? "bg-emerald-50" : "bg-white"}`}>
                          <td className="p-3 font-medium text-slate-700">{u.nick}</td>
                          <td className="p-3 font-medium text-slate-900">{u.name}</td>
                          <td className="p-3 font-black text-amber-600">{u.points}</td>
                          <td className="p-3">
                            <Badge tone={u.role === "admin" ? "accent" : u.role === "suspended" ? "danger" : "default"}>{u.role || "user"}</Badge>
                          </td>
                          <td className="p-3">
                            <Button onClick={(e) => { e.stopPropagation(); fetchUserDetail(u); }} variant="ghost" size="sm"><Eye size={14} /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <Card className="rounded-[28px] bg-slate-50 p-5">
                {!selectedUser && !userDetailLoading && <EmptyState title="Chọn một người chơi" subtitle="Nhấn vào một hàng để xem chi tiết hồ sơ và thao tác nhanh." />}
                {userDetailLoading && <LoadingSpinner message="Đang tải hồ sơ người chơi..." />}
                {selectedUser && !userDetailLoading && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-black text-slate-900">{selectedUser.name}</h3>
                        <p className="text-sm text-slate-500">@{selectedUser.nick}</p>
                      </div>
                      <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-slate-600">×</button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-[22px] bg-white p-4"><p className="text-xs text-slate-400">Tài khoản</p><p className="font-bold text-slate-900">{selectedUser.account_id}</p></div>
                      <div className="rounded-[22px] bg-white p-4"><p className="text-xs text-slate-400">EXP</p><p className="font-bold text-amber-600">{selectedUser.points}</p></div>
                    </div>

                    {selectedUser.profile && selectedUser.profile.scores && (
                      <div className="rounded-[24px] bg-emerald-50 p-4">
                        <p className="mb-3 flex items-center gap-1 text-sm font-bold text-emerald-700"><Activity size={14} /> Behavioral Profile</p>
                        <div className="space-y-2 text-xs">
                          {Object.entries(selectedUser.profile.scores).map(([k, v]) => (
                            <div key={k} className="flex items-center justify-between gap-3">
                              <span className="capitalize text-slate-600">{k.replace("_", " ")}</span>
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/70"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${(v as number) * 100}%` }} /></div>
                                <span className="w-8 text-right font-bold">{Math.round((v as number) * 100)}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedUser.decay && (
                      <div className="rounded-[24px] bg-amber-50 p-4">
                        <p className="mb-2 text-sm font-bold text-amber-700">Novelty Decay</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><span className="text-slate-500">Engagement:</span> <span className="font-bold">{Math.round((selectedUser.decay.engagementScore || 0) * 100)}%</span></div>
                          <div><span className="text-slate-500">Severity:</span> <span className="font-bold">{selectedUser.decay.decaySeverity || "none"}</span></div>
                          <div><span className="text-slate-500">Streak:</span> <span className="font-bold">{selectedUser.decay.streakStability?.toFixed(2) || "—"}</span></div>
                          <div><span className="text-slate-500">Days since login:</span> <span className="font-bold">{selectedUser.decay.daysSinceLogin || "—"}</span></div>
                        </div>
                        <Button onClick={() => handleTriggerDecay(selectedUser.account_id)} size="sm" variant="soft" className="mt-3">Trigger detection</Button>
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-sm font-bold text-slate-700">Hành động nhanh</p>
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => handlePointsAdjust(selectedUser.nick, 100, "Admin bonus")} size="sm" variant="soft"><Zap size={12} /> +100 EXP</Button>
                        <Button onClick={() => handlePointsAdjust(selectedUser.nick, -100, "Admin deduction")} size="sm" variant="danger"><Zap size={12} /> -100 EXP</Button>
                        <Button onClick={() => handleRoleChange(selectedUser.nick, selectedUser.role === "admin" ? "user" : "admin")} size="sm" variant="ghost"><Shield size={12} /> {selectedUser.role === "admin" ? "Remove admin" : "Make admin"}</Button>
                        <Button onClick={() => handleSuspend(selectedUser.nick, selectedUser.role !== "suspended")} size="sm" variant="ghost"><Ban size={12} /> {selectedUser.role === "suspended" ? "Unsuspend" : "Suspend"}</Button>
                        <Button onClick={() => handleResetProgress(selectedUser.nick)} size="sm" variant="danger"><Trash2 size={12} /> Reset progress</Button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </Card>
        )}

        {activeTab === "experiments" && (
          <Card className="rounded-[32px] p-6">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <SectionHeading title={`A/B Experiments (${experiments.length})`} subtitle="Tạo, bật, tạm dừng và quản lý các thử nghiệm hành vi." />
              <Button onClick={() => setShowNewExp(!showNewExp)}><Plus size={16} />{showNewExp ? "Ẩn biểu mẫu" : "Tạo experiment"}</Button>
            </div>

            {showNewExp && (
              <form onSubmit={handleCreateExp} className="mb-6 space-y-3 rounded-[28px] border border-slate-100 bg-slate-50 p-5">
                <div className="grid gap-3 md:grid-cols-2">
                  <Input required placeholder="Experiment ID (vd: rewards_v2)" value={newExp.id} onChange={(e) => setNewExp({ ...newExp, id: e.target.value })} />
                  <Input required placeholder="Tên experiment" value={newExp.name} onChange={(e) => setNewExp({ ...newExp, name: e.target.value })} />
                </div>
                <TextArea placeholder="Mô tả" value={newExp.description} onChange={(e) => setNewExp({ ...newExp, description: e.target.value })} rows={3} />
                <div className="flex gap-2">
                  <Input placeholder="Control ratio" type="number" step="0.05" min="0" max="1" defaultValue="0.25" className="max-w-[160px]" />
                  <Button type="submit">Tạo</Button>
                </div>
              </form>
            )}

            {expLoading ? <LoadingSpinner message="Đang tải experiments..." /> : experiments.length === 0 ? <EmptyState title="Chưa có experiment nào" subtitle="Tạo experiment đầu tiên để bắt đầu đo lường." /> : (
              <div className="space-y-3">
                {experiments.map((exp) => (
                  <div key={exp.id} className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900">{exp.name || exp.id}</h4>
                        <p className="mt-1 text-xs text-slate-500">{exp.description}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(exp.groups || []).map((g: any) => (
                            <Badge key={g.name} tone={g.name.includes("control") ? "default" : "accent"}>{g.name} ({Math.round(g.ratio * 100)}%)</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={exp.status === "active" ? "success" : exp.status === "paused" ? "warning" : "default"}>{exp.status}</Badge>
                        {exp.status === "active" ? (
                          <Button onClick={() => handleExpAction(exp.id, "pause")} size="sm" variant="soft">Pause</Button>
                        ) : (
                          <Button onClick={() => handleExpAction(exp.id, "activate")} size="sm">Activate</Button>
                        )}
                        <Button onClick={() => handleExpAction(exp.id, "delete")} size="sm" variant="danger">Delete</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
