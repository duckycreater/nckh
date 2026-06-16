import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Gift, Plus, Trash, LogOut, BarChart3, Search, Shield, RefreshCw, FlaskConical, Eye, Trash2, Ban, Zap, Activity, BookOpen, Database, FileSpreadsheet, Server } from "lucide-react";
import { User, RewardItem } from "../types";
import { Badge, Button, Card, EmptyState, FieldLabel, Input, LoadingSpinner, ModalHeader, ModalShell, SectionHeading, TabButton, TextArea } from "../lib/ui";
import { showToast } from "../lib/toast";
import { QuizBuilder } from "./admin/QuizBuilder";
import { QuizConfigPanel } from "./admin/QuizConfigPanel";
import { SheetsSyncPanel } from "./admin/SheetsSyncPanel";
import { ResearchPanel } from "./admin/ResearchPanel";
import { SystemPanel } from "./admin/SystemPanel";

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
  const [activeTab, setActiveTab] = useState<"overview" | "rewards" | "users" | "experiments" | "quiz" | "sheets" | "research" | "system">("overview");
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
  const adminApiKey = (import.meta as any).env?.VITE_ADMIN_API_KEY || "";
  const authHeaders = () => ({
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "x-admin-key": adminApiKey,
    },
  });

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
      if (data.url) {
        setNewReward((prev) => ({ ...prev, imageUrl: data.url }));
        showToast("Ảnh đã sẵn sàng", "Bạn có thể tiếp tục tạo phần thưởng.", "success");
      } else {
        showToast("Upload chưa thành công", data.error || "Vui lòng thử lại với một hình khác.", "warning");
      }
    } catch (error) {
      console.error("Failed to upload image", error);
      showToast("Lỗi upload ảnh", "Không thể tải ảnh lên ở thời điểm hiện tại.", "warning");
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
        ingredients: newReward.ingredients.split(",").map((s) => s.trim()).filter(Boolean),
        color: newReward.color,
        bgClass: newReward.bgClass,
        borderClass: newReward.borderClass,
      };
      const res = await fetch("/api/rewards", { ...authHeaders(), method: "POST", headers: { ...authHeaders().headers, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Không thể lưu phần thưởng");
      }
      setShowAddReward(false);
      await fetchRewards();
      showToast("Đã thêm phần thưởng", "Danh sách quà đã được cập nhật.", "success");
    } catch (error) {
      console.error("Failed to add reward", error);
      showToast("Không thể thêm phần thưởng", error instanceof Error ? error.message : "Vui lòng kiểm tra dữ liệu rồi thử lại.", "warning");
    }
  };

  const handleDeleteReward = async (id: string | number) => {
    await fetch(`/api/rewards/${id}`, { ...authHeaders(), method: "DELETE" });
    fetchRewards();
    showToast("Đã xóa phần thưởng", "Mục đã được loại khỏi danh sách.", "success");
  };

  const handleRoleChange = async (nick: string, newRole: string) => {
    await fetch(`/api/admin/users/${nick}/role`, { ...authHeaders(), method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: newRole }) });
    fetchUsers();
    showToast("Vai trò đã được cập nhật", `Người dùng ${nick} đã chuyển sang ${newRole}.`, "success");
  };

  const handlePointsAdjust = async (nick: string, delta: number, reason: string) => {
    await fetch(`/api/admin/users/${nick}/adjust-points`, { ...authHeaders(), method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ delta, reason }) });
    fetchUsers();
    if (selectedUser?.nick === nick) {
      const updated = users.find((u) => u.nick === nick);
      if (updated) fetchUserDetail(updated);
    }
    showToast("Điểm đã được điều chỉnh", `${nick} vừa được cập nhật ${delta > 0 ? `+${delta}` : delta} điểm.`, "success");
  };

  const handleSuspend = async (nick: string, suspended: boolean) => {
    await fetch(`/api/admin/users/${nick}/suspend`, { ...authHeaders(), method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ suspended }) });
    fetchUsers();
    setSelectedUser(null);
    showToast(suspended ? "Đã tạm khóa người dùng" : "Đã mở lại quyền truy cập", nick, "warning");
  };

  const handleResetProgress = async (nick: string) => {
    await fetch(`/api/admin/users/${nick}/reset-progress?confirm=true`, { ...authHeaders(), method: "POST" });
    fetchUsers();
    setSelectedUser(null);
    showToast("Đã reset tiến độ", `Toàn bộ tiến độ của ${nick} đã được làm mới.`, "warning");
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
        showToast("Đồng bộ thành công", `Đã sync ${data.totalImported} người dùng từ Google Sheets.`, "success");
        fetchUsers();
        loadStats();
      } else {
        showToast("Sync thất bại", data.error || data.message, "warning");
      }
    } catch {
      showToast("Sync thất bại", "Không thể kết nối tới dịch vụ đồng bộ.", "warning");
    }
    setSyncingSheets(false);
  };

  const handleTriggerDecay = async (accountId: string) => {
    await fetch(`/api/admin/decay/${accountId}/detect`, { ...authHeaders(), method: "POST" });
    if (selectedUser) fetchUserDetail(selectedUser);
    showToast("Đã kích hoạt kiểm tra suy giảm", accountId, "info");
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
    showToast("Đã tạo thí nghiệm", "Nhóm nghiên cứu đã được cập nhật danh sách mới.", "success");
  };

  const handleExpAction = async (expId: string, action: "pause" | "activate" | "delete") => {
    await fetch(`/api/experiments/${expId}/${action}`, { ...authHeaders(), method: "POST" });
    fetchExperiments();
    showToast("Trạng thái thí nghiệm đã thay đổi", `${expId}: ${action}`, "info");
  };

  const filteredUsers = users.filter((u) =>
    (u.name || "").toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.nick || "").toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.account_id || "").toLowerCase().includes(userSearch.toLowerCase()),
  );

  const tabs = [
    { id: "overview", label: "Tổng quan", icon: <BarChart3 className="h-4 w-4" /> },
    { id: "rewards", label: "Phần thưởng", icon: <Gift className="h-4 w-4" /> },
    { id: "users", label: "Người dùng", icon: <Users className="h-4 w-4" /> },
    { id: "experiments", label: "Thí nghiệm", icon: <FlaskConical className="h-4 w-4" /> },
    { id: "quiz", label: "Quiz", icon: <BookOpen className="h-4 w-4" /> },
    { id: "sheets", label: "Sheets Sync", icon: <FileSpreadsheet className="h-4 w-4" /> },
    { id: "research", label: "Research", icon: <Database className="h-4 w-4" /> },
    { id: "system", label: "Hệ thống", icon: <Server className="h-4 w-4" /> },
  ] as const;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)] text-white font-black shadow-[var(--shadow-glow)]">
              B
            </div>
            <div>
              <h1 className="text-lg font-black text-[var(--text-primary)]">Dashboard quản trị</h1>
              <p className="text-xs text-[var(--text-muted)]">{user.name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/research")}>
              <Activity className="h-4 w-4" /> Research
            </Button>
            <Button variant="ghost" size="sm" onClick={onLogout}>
              <LogOut className="h-4 w-4" /> Đăng xuất
            </Button>
          </div>
        </div>

        {/* ── Nav tabs ── */}
        <Card className="rounded-2xl p-1.5">
          <div className="grid grid-cols-4 gap-1 sm:grid-cols-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span className="hidden sm:inline">{tab.icon}</span>}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </Card>

      {activeTab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Tổng người dùng", value: stats?.total ?? users.length, tone: "success" as const },
                { label: "Quản trị viên", value: stats?.admins ?? 0, tone: "accent" as const },
                { label: "Hoạt động gần đây", value: stats?.activeUsers ?? 0, tone: "warning" as const },
                { label: "Thí nghiệm", value: stats?.experimentCount ?? experiments.length, tone: "default" as const },
              ].map((item) => (
                <Card key={item.label} className="rounded-[26px] p-5">
                  <Badge tone={item.tone}>{item.label}</Badge>
                  <p className="mt-4 text-3xl font-black text-slate-900">{item.value}</p>
                  <p className="mt-2 text-sm text-slate-500">Số liệu được đồng bộ từ các API quản trị hiện có.</p>
                </Card>
              ))}
            </div>

            <Card className="rounded-[28px] p-6">
              <SectionHeading
                eyebrow="Điều phối"
                title="Thao tác nhanh"
                subtitle="Các lệnh thường dùng để làm mới dữ liệu, cập nhật rewards và đồng bộ nguồn ngoài."
              />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Button onClick={fetchRewards} variant="secondary"><RefreshCw className="h-4 w-4" /> Làm mới phần thưởng</Button>
                <Button onClick={fetchUsers} variant="ghost"><Users className="h-4 w-4" /> Làm mới người dùng</Button>
                <Button onClick={handleSyncSheets} loading={syncingSheets}><Zap className="h-4 w-4" /> Đồng bộ Google Sheets</Button>
                <Button onClick={() => setShowAddReward(true)} variant="ghost"><Plus className="h-4 w-4" /> Thêm phần thưởng</Button>
              </div>
            </Card>
          </div>

          <Card className="rounded-[28px] p-6">
            <SectionHeading
              eyebrow="Tín hiệu hệ thống"
              title="Bức tranh hoạt động"
              subtitle="Tóm lược nhanh những gì đang diễn ra để bạn nắm được mức độ sẵn sàng của hệ thống."
            />
            <div className="mt-5 space-y-3">
              {[
                "Phần user, admin và research đang dùng chung design language mới.",
                "Toast đã thay thế dần cho các phản hồi dạng alert cũ.",
                "Luồng đồng bộ và cập nhật quyền có thể kiểm soát ngay từ dashboard này.",
              ].map((item) => (
                <div key={item} className="rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "rewards" && (
        <Card className="rounded-[28px] p-6">
          <SectionHeading
            eyebrow="Rewards"
            title="Kho phần thưởng"
            subtitle="Quản lý danh sách quà, hình ảnh và mức điểm đổi theo cách trực quan hơn."
            action={<Button onClick={() => setShowAddReward(true)}><Plus className="h-4 w-4" /> Thêm quà</Button>}
          />
          {loading ? (
            <LoadingSpinner message="Đang tải kho phần thưởng" />
          ) : loadingError ? (
            <EmptyState title="Không thể tải phần thưởng" subtitle={loadingError} action={{ label: "Thử lại", onClick: fetchRewards }} />
          ) : rewards.length === 0 ? (
            <EmptyState title="Chưa có phần thưởng nào" subtitle="Hãy thêm mục mới để người dùng có thêm động lực tích điểm." action={{ label: "Thêm phần thưởng", onClick: () => setShowAddReward(true) }} />
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {rewards.map((reward) => (
                <Card key={reward.id} className="rounded-[26px] overflow-hidden p-0">
                  <div className="h-40 bg-slate-100">
                    {reward.imageUrl ? <img src={reward.imageUrl} alt={reward.name} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-black text-slate-900">{reward.name}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-500">{reward.desc}</p>
                      </div>
                      <Badge tone="warning">{reward.cost} điểm</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" className="flex-1" onClick={() => handleDeleteReward(reward.id)}><Trash className="h-4 w-4" /> Xóa</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === "users" && (
        <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
          <Card className="rounded-[28px] p-6">
            <SectionHeading eyebrow="People" title="Danh sách người dùng" subtitle="Tìm nhanh, chọn hồ sơ và thực hiện các thay đổi quan trọng gọn gàng hơn." />
            <div className="mt-5 rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <Search className="h-4 w-4 text-slate-400" />
                <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Tìm theo tên, nick hoặc account id" className="w-full bg-transparent text-sm text-slate-700 outline-none" />
              </div>
            </div>
            <div className="thin-scrollbar mt-4 max-h-[34rem] space-y-3 overflow-y-auto pr-1">
              {filteredUsers.map((u) => (
                <button key={u.account_id} onClick={() => fetchUserDetail(u)} className="w-full rounded-[22px] border border-slate-100 bg-white px-4 py-4 text-left transition hover:border-emerald-200 hover:bg-emerald-50/40">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-900">{u.name}</p>
                      <p className="mt-1 text-sm text-slate-500">@{u.account_id}</p>
                    </div>
                    <Badge tone={u.role === "admin" ? "accent" : "default"}>{u.role || "user"}</Badge>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="rounded-[28px] p-6">
            {userDetailLoading ? (
              <LoadingSpinner message="Đang tải hồ sơ người dùng" />
            ) : !selectedUser ? (
              <EmptyState title="Chưa chọn người dùng" subtitle="Chọn một hồ sơ từ danh sách bên trái để xem chi tiết và thao tác." />
            ) : (
              <div className="space-y-5">
                <SectionHeading eyebrow="Chi tiết" title={selectedUser.name} subtitle={`@${selectedUser.account_id} · ${selectedUser.points} điểm`} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button variant="secondary" onClick={() => handleRoleChange(selectedUser.nick, selectedUser.role === "admin" ? "user" : "admin")}>
                    <Shield className="h-4 w-4" /> Đổi vai trò
                  </Button>
                  <Button variant="ghost" onClick={() => handleTriggerDecay(selectedUser.account_id)}><Activity className="h-4 w-4" /> Kiểm tra suy giảm</Button>
                  <Button variant="soft" onClick={() => handlePointsAdjust(selectedUser.nick, 20, "Thưởng thủ công")}>+20 điểm</Button>
                  <Button variant="soft" onClick={() => handlePointsAdjust(selectedUser.nick, -20, "Điều chỉnh thủ công")}>-20 điểm</Button>
                  <Button variant="ghost" onClick={() => handleSuspend(selectedUser.nick, true)}><Ban className="h-4 w-4" /> Tạm khóa</Button>
                  <Button variant="danger" onClick={() => handleResetProgress(selectedUser.nick)}><Trash2 className="h-4 w-4" /> Reset tiến độ</Button>
                </div>
                <Card className="rounded-[24px] bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-700">Thông tin hồ sơ và dữ liệu nghiên cứu đang được giữ nguyên theo các endpoint hiện có.</p>
                </Card>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === "experiments" && (
        <Card className="rounded-[28px] p-6">
          <SectionHeading
            eyebrow="Experiments"
            title="Điều phối thí nghiệm"
            subtitle="Theo dõi, tạo mới và quản lý trạng thái các kịch bản nghiên cứu đang chạy."
            action={<Button onClick={() => setShowNewExp(true)}><Plus className="h-4 w-4" /> Tạo thí nghiệm</Button>}
          />
          {expLoading ? (
            <LoadingSpinner message="Đang tải danh sách thí nghiệm" />
          ) : experiments.length === 0 ? (
            <EmptyState title="Chưa có thí nghiệm nào" subtitle="Tạo thí nghiệm mới để bắt đầu theo dõi kết quả." action={{ label: "Tạo thí nghiệm", onClick: () => setShowNewExp(true) }} />
          ) : (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {experiments.map((exp) => (
                <Card key={exp.id} className="rounded-[26px] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black text-slate-900">{exp.name || exp.id}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{exp.description || "Không có mô tả chi tiết."}</p>
                    </div>
                    <Badge tone="accent">{exp.status || "active"}</Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="ghost" onClick={() => handleExpAction(exp.id, "pause")}>Tạm dừng</Button>
                    <Button variant="ghost" onClick={() => handleExpAction(exp.id, "activate")}>Kích hoạt</Button>
                    <Button variant="danger" onClick={() => handleExpAction(exp.id, "delete")}>Xóa</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === "quiz" && (
        <div className="space-y-4">
          <QuizConfigPanel />
          <QuizBuilder />
        </div>
      )}

      {activeTab === "sheets" && <SheetsSyncPanel />}

      {activeTab === "research" && <ResearchPanel />}

      {activeTab === "system" && <SystemPanel />}

      {showAddReward && (
        <ModalShell onClose={() => setShowAddReward(false)} className="max-w-2xl overflow-hidden p-0" title="Thêm phần thưởng">
          <ModalHeader
            title="Thêm phần thưởng mới"
            subtitle="Tạo thêm phần quà hấp dẫn với mô tả rõ ràng và hình ảnh minh họa nhất quán hơn."
            badge={<Badge tone="warning">Rewards</Badge>}
            onClose={() => setShowAddReward(false)}
          />
          <form onSubmit={handleAddReward} className="space-y-4 p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Tên phần thưởng</FieldLabel>
                <Input value={newReward.name} onChange={(e) => setNewReward((prev) => ({ ...prev, name: e.target.value }))} />
              </div>
              <div>
                <FieldLabel>Chi phí</FieldLabel>
                <Input type="number" value={newReward.cost} onChange={(e) => setNewReward((prev) => ({ ...prev, cost: Number(e.target.value) }))} />
              </div>
            </div>
            <div>
              <FieldLabel>Mô tả</FieldLabel>
              <TextArea rows={4} value={newReward.desc} onChange={(e) => setNewReward((prev) => ({ ...prev, desc: e.target.value }))} />
            </div>
            <div>
              <FieldLabel>Ảnh phần thưởng</FieldLabel>
              <input type="file" accept="image/*" onChange={handleImageUpload} />
              {uploading && <p className="mt-2 text-sm text-slate-500">Đang tải ảnh lên...</p>}
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setShowAddReward(false)}>Hủy</Button>
              <Button type="submit">Lưu phần thưởng</Button>
            </div>
          </form>
        </ModalShell>
      )}

      {showNewExp && (
        <ModalShell onClose={() => setShowNewExp(false)} className="max-w-2xl overflow-hidden p-0" title="Tạo thí nghiệm">
          <ModalHeader
            title="Tạo thí nghiệm mới"
            subtitle="Thiết lập nhanh một thí nghiệm mới để bắt đầu theo dõi tác động và retention."
            badge={<Badge tone="accent">Research ops</Badge>}
            onClose={() => setShowNewExp(false)}
          />
          <form onSubmit={handleCreateExp} className="space-y-4 p-5 sm:p-6">
            <div>
              <FieldLabel>ID thí nghiệm</FieldLabel>
              <Input value={newExp.id} onChange={(e) => setNewExp((prev) => ({ ...prev, id: e.target.value }))} />
            </div>
            <div>
              <FieldLabel>Tên hiển thị</FieldLabel>
              <Input value={newExp.name} onChange={(e) => setNewExp((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div>
              <FieldLabel>Mô tả</FieldLabel>
              <TextArea rows={4} value={newExp.description} onChange={(e) => setNewExp((prev) => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setShowNewExp(false)}>Hủy</Button>
              <Button type="submit">Tạo thí nghiệm</Button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
