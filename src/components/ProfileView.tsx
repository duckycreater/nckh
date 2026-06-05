import React, { useEffect, useState, useRef } from "react";
import { User } from "../types";
import { ArrowLeft, Pencil, X, Save, RefreshCw, Camera, Trash2, Shield, Star, Zap, Award, Flame, ImagePlus } from "lucide-react";
import { Badge, Button, Card, ErrorRetry, FieldLabel, Input, ModalShell, Skeleton, TabButton } from "../lib/ui";
import { RewardHistory } from "./RewardHistory";

const EMOJI_AVATARS = [
  { id: "av1", emoji: "🌱", name: "Mầm Xanh", color: "bg-emerald-100 text-emerald-600", bg: "from-emerald-400 to-teal-500" },
  { id: "av2", emoji: "💧", name: "Chiến Binh Nước", color: "bg-blue-100 text-blue-600", bg: "from-blue-400 to-cyan-500" },
  { id: "av3", emoji: "🦁", name: "Thủ Lĩnh Rừng", color: "bg-amber-100 text-amber-600", bg: "from-amber-400 to-orange-500" },
];

const FRAMES = [
  { id: "fr1", name: "Khung Gỗ", style: "ring-4 ring-amber-700", desc: "Bền vững như gỗ" },
  { id: "fr2", name: "Khung Băng", style: "ring-4 ring-cyan-400", desc: "Tinh khiết như băng" },
  { id: "fr3", name: "Hào Quang Đất", style: "ring-4 ring-emerald-500 shadow-[0_0_16px_#10b981]", desc: "Huy hoàng như đất" },
];

interface Props {
  nickname: string;
  onClose: () => void;
}

function getAuthHeaders(): RequestInit {
  const token = localStorage.getItem("auth_token");
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

export function ProfileView({ nickname, onClose }: Props) {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editFrame, setEditFrame] = useState("");
  const [editCustomUrl, setEditCustomUrl] = useState("");
  const [editPass, setEditPass] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingMsg, setSavingMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"overview" | "history">("overview");

  const loadProfile = () => {
    setLoading(true);
    setError(null);
    fetch(`/api/user/${nickname}`)
      .then((res) => {
        if (!res.ok) throw new Error("Không thể tải hồ sơ");
        return res.json();
      })
      .then((data) => {
        setProfile(data);
        setEditName(data.name || "");
        setEditAvatar(data.selectedAvatar || "");
        setEditFrame(data.selectedFrame || "");
        setEditCustomUrl(data.customAvatarUrl || "");
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadProfile();
  }, [nickname]);

  const openEdit = () => {
    if (!profile) return;
    setEditName(profile.name || "");
    setEditAvatar(profile.selectedAvatar || "");
    setEditFrame(profile.selectedFrame || "");
    setEditCustomUrl(profile.customAvatarUrl || "");
    setUploadPreview(null);
    setUploadError(null);
    setSavingMsg(null);
    setEditPass("");
    setShowEdit(true);
  };

  const closeEdit = () => {
    setShowEdit(false);
    setSavingMsg(null);
    setUploadError(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      setUploadError("Chỉ chấp nhận JPG, PNG, GIF, WEBP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Ảnh tối đa 5MB");
      return;
    }

    setUploadError(null);
    setUploading(true);

    const url = URL.createObjectURL(file);
    setUploadPreview(url);
    setEditAvatar("");

    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetch("/api/avatar/upload", { method: "POST", ...getAuthHeaders(), body: formData });
      const data = await res.json();
      URL.revokeObjectURL(url);
      setUploadPreview(null);
      if (data.success) {
        setEditCustomUrl(data.url);
        setUploadError(null);
      } else {
        setUploadError(data.message || "Upload thất bại");
        setEditCustomUrl("");
      }
    } catch {
      URL.revokeObjectURL(url);
      setUploadPreview(null);
      setUploadError("Lỗi kết nối khi upload");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveCustom = () => {
    setEditCustomUrl("");
    setUploadPreview(null);
    setUploadError(null);
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      setSavingMsg({ ok: false, text: "Tên không được để trống" });
      return;
    }
    if (!editPass) {
      setSavingMsg({ ok: false, text: "Nhập mật khẩu để xác nhận" });
      return;
    }
    setSaving(true);
    setSavingMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname,
          name: editName.trim(),
          selectedAvatar: editCustomUrl ? "" : editAvatar || undefined,
          selectedFrame: editFrame || undefined,
          customAvatarUrl: editCustomUrl || undefined,
          pass: editPass,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSavingMsg({ ok: true, text: "Lưu thành công!" });
        setTimeout(() => {
          closeEdit();
          loadProfile();
        }, 900);
      } else {
        setSavingMsg({ ok: false, text: data.message || "Lưu thất bại" });
      }
    } catch {
      setSavingMsg({ ok: false, text: "Lỗi kết nối" });
    }
    setSaving(false);
  };

  const activeAvatar = profile ? EMOJI_AVATARS.find((a) => a.id === profile.selectedAvatar) : null;
  const activeFrame = profile ? FRAMES.find((f) => f.id === profile.selectedFrame) : null;

  let displayUrl: string | null = null;
  let displayEmoji = profile?.name?.[0] || "?";
  if (profile?.customAvatarUrl) {
    displayUrl = profile.customAvatarUrl;
    displayEmoji = "";
  } else if (activeAvatar) {
    displayEmoji = activeAvatar.emoji;
    displayUrl = null;
  }

  const editPreviewUrl = uploadPreview || editCustomUrl || null;
  const editPreviewEmoji = editAvatar
    ? EMOJI_AVATARS.find((a) => a.id === editAvatar)?.emoji || ""
    : !editCustomUrl && !uploadPreview
      ? profile?.name?.[0] || "?"
      : "";

  if (loading) {
    return (
      <div className="absolute inset-0 z-40 bg-slate-50 p-4 pt-16">
        <div className="mx-auto max-w-2xl space-y-4">
          <Skeleton className="h-10 w-28 rounded-full" />
          <div className="flex flex-col items-center gap-3 pt-4">
            <Skeleton className="h-28 w-28 rounded-full" />
            <Skeleton className="h-7 w-40 rounded-lg" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
            <Skeleton className="col-span-2 h-24 rounded-2xl" />
            <Skeleton className="col-span-2 h-24 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="absolute inset-0 z-40 bg-white p-4 pt-20 text-center">
        <div className="mx-auto max-w-lg">
          <ErrorRetry message={error || "Người chơi không tồn tại"} onRetry={loadProfile} />
          <Button onClick={onClose} variant="ghost" className="mt-4">Quay lại</Button>
        </div>
      </div>
    );
  }

  const level = Math.floor(profile.points / 200) + 1;
  const title = profile.points > 200 ? "Hiệp sĩ môi trường" : profile.points > 50 ? "Người bảo vệ" : "Mầm non";
  const streak = profile.progress?.streakDays || 1;
  const streakMult = Math.min(1 + (streak - 1) * 0.1, 2);
  const progressToNextLevel = Math.min((profile.points % 200) / 2, 100);

  return (
    <div className="absolute inset-0 z-40 overflow-y-auto bg-slate-50">
      <div className="mx-auto max-w-3xl pb-20">
        <div className="relative overflow-hidden rounded-b-[32px] bg-[linear-gradient(135deg,#0f8f68,#10b981_58%,#38bdf8)] px-4 pb-8 pt-4 text-white shadow-[var(--shadow-medium)] sm:px-6">
          <div className="mb-10 flex items-center justify-between gap-3">
            <Button onClick={onClose} variant="ghost" className="border-white/20 bg-white/12 text-white hover:bg-white/20">
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </Button>
            <Button onClick={openEdit} variant="ghost" className="border-white/20 bg-white/12 text-white hover:bg-white/20">
              <Pencil className="h-4 w-4" />
              Chỉnh sửa
            </Button>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="relative">
              {displayUrl ? (
                <img src={displayUrl} alt={profile.name} className={`h-28 w-28 rounded-full object-cover ring-4 ring-white shadow-xl ${activeFrame?.style || ""}`} />
              ) : (
                <div className={`flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br text-5xl font-black text-white ring-4 ring-white shadow-xl ${activeAvatar?.bg || "from-emerald-100 to-teal-100"} ${activeFrame?.style || ""}`}>
                  {displayEmoji}
                </div>
              )}
              {profile.customAvatarUrl && <Badge tone="accent" className="absolute -bottom-1 -right-1">Tùy chỉnh</Badge>}
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight">{profile.name}</h2>
            <p className="mt-1 text-sm text-white/80">@{profile.account_id}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <Badge tone="success" className="bg-white/12 border-white/15 text-white">Cấp {level} · {title}</Badge>
              <Badge tone="warning" className="bg-white/12 border-white/15 text-white">🔥 {streak} ngày streak</Badge>
            </div>
          </div>
        </div>

        <div className="-mt-6 space-y-4 px-4 sm:px-6">
          <Card className="rounded-[28px] p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Cống hiến</span>
              <span className="text-lg font-black text-emerald-600">{profile.points} <span className="text-sm text-emerald-400">/ {level * 200}</span></span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-700" style={{ width: `${progressToNextLevel}%` }} />
            </div>
            <p className="mt-2 text-right text-[11px] text-slate-400">{Math.max(0, level * 200 - profile.points)} EXP đến cấp tiếp theo</p>
          </Card>

          <div className="grid grid-cols-3 gap-3">
            <Card className="rounded-[24px] p-4 text-center">
              <Flame className="mx-auto mb-2 text-orange-400" size={22} />
              <p className="text-xl font-black text-slate-800">{streak}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Streak</p>
              {streak > 1 && <p className="mt-1 text-[10px] font-black text-orange-400">×{streakMult.toFixed(1)} EXP</p>}
            </Card>
            <Card className="rounded-[24px] p-4 text-center">
              <Award className="mx-auto mb-2 text-blue-400" size={22} />
              <p className="text-xl font-black text-slate-800">{level}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Cấp độ</p>
            </Card>
            <Card className="rounded-[24px] p-4 text-center">
              <Star className="mx-auto mb-2 text-purple-400" size={22} />
              <p className="text-xl font-black text-slate-800">{profile.progress?.flashcardsRead?.length || 0}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Thẻ</p>
            </Card>
          </div>

          <Card className="rounded-[28px] p-2">
            <div className="flex gap-2 rounded-[24px] bg-slate-100 p-1">
              {[{ id: "overview", label: "Tổng quan" }, { id: "history", label: "Lịch sử điểm" }].map((tab) => (
                <TabButton key={tab.id} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className="flex-1 justify-center py-3">
                  {tab.label}
                </TabButton>
              ))}
            </div>
          </Card>

          {activeTab === "overview" && (
            <div className="space-y-4">
              <Card className="rounded-[28px] p-5">
                <h3 className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Hoạt động</h3>
                <div className="space-y-3">
                  {[
                    { label: "Thử thách đã hoàn thành", value: profile.progress?.challengesCompleted?.length || 0, icon: <Zap size={16} className="text-yellow-500" /> },
                    { label: "Quà đã đổi", value: profile.progress?.crafted?.length || 0, icon: <Award size={16} className="text-amber-500" /> },
                    { label: "Số lần check-in", value: profile.progress?.checkins?.length || 0, icon: <Shield size={16} className="text-blue-500" /> },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-white p-2 shadow-sm">{item.icon}</div>
                        <span className="text-sm font-medium text-slate-600">{item.label}</span>
                      </div>
                      <span className="text-lg font-black text-slate-800">{item.value}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="rounded-[28px] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Giao diện</h3>
                  <Button onClick={openEdit} variant="ghost" size="sm">Chỉnh sửa</Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[24px] bg-slate-50 p-4">
                    <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Avatar</p>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-lg font-black ${activeAvatar?.bg || "from-emerald-100 to-teal-100"} ${activeAvatar ? "text-white" : "text-emerald-600"}`}>
                        {displayEmoji}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{activeAvatar?.name || "Mặc định"}</p>
                        <p className="text-xs text-slate-400">Hiển thị hồ sơ và xếp hạng</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[24px] bg-slate-50 p-4">
                    <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Khung</p>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-500 ${activeFrame?.style || ""}`}>🖼</div>
                      <div>
                        <p className="font-bold text-slate-800">{activeFrame?.name || "Không khung"}</p>
                        <p className="text-xs text-slate-400">{activeFrame?.desc || "Kiểu hiển thị mặc định"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="rounded-[28px] border-0 bg-[linear-gradient(140deg,#eef2ff,#f8faff)] p-5">
                <h3 className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-indigo-400">Bộ sưu tập</h3>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-4xl font-black text-indigo-600">{profile.progress?.flashcardsRead?.length || 0}<span className="ml-1 text-lg text-indigo-300">/300</span></p>
                    <p className="mt-1 text-sm text-slate-500">Số lượng thẻ bạn đã mở khoá.</p>
                  </div>
                  <div className="w-32 overflow-hidden rounded-full bg-indigo-100 h-2.5">
                    <div className="h-full rounded-full bg-indigo-400" style={{ width: `${((profile.progress?.flashcardsRead?.length || 0) / 300) * 100}%` }} />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === "history" && <RewardHistory userId={nickname} currentBalance={profile.points} />}
        </div>
      </div>

      {showEdit && (
        <ModalShell onClose={closeEdit} className="max-h-[92vh] max-w-md overflow-y-auto p-0">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/92 px-5 py-4 backdrop-blur-sm">
            <h2 className="text-xl font-black text-slate-800">Chỉnh sửa hồ sơ</h2>
            <button onClick={closeEdit} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-6 p-5">
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                {editPreviewUrl ? (
                  <img src={editPreviewUrl} alt="Preview" className={`h-24 w-24 rounded-full object-cover ring-4 ring-emerald-400 shadow-lg ${FRAMES.find((f) => f.id === editFrame)?.style || ""}`} />
                ) : editPreviewEmoji ? (
                  <div className={`flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br text-4xl font-black text-white shadow-lg ring-4 ring-emerald-400 ${EMOJI_AVATARS.find((a) => a.id === editAvatar)?.bg || "from-emerald-100 to-teal-100"} ${FRAMES.find((f) => f.id === editFrame)?.style || ""}`}>
                    {editPreviewEmoji}
                  </div>
                ) : (
                  <div className={`flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 text-4xl font-black text-slate-400 shadow-lg ring-4 ring-slate-200 ${FRAMES.find((f) => f.id === editFrame)?.style || ""}`}>
                    ?
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                    <RefreshCw size={24} className="animate-spin text-white" />
                  </div>
                )}
                <label htmlFor="avatar-upload" className="absolute -bottom-1 -right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition hover:bg-emerald-600">
                  <Camera size={16} />
                </label>
                <input ref={fileInputRef} id="avatar-upload" type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleFileChange} disabled={uploading} className="hidden" />
              </div>

              <div className="flex gap-2">
                <Button onClick={() => fileInputRef.current?.click()} variant="ghost" size="sm">
                  <ImagePlus className="h-4 w-4" />
                  Tải ảnh lên
                </Button>
                {editCustomUrl && (
                  <Button onClick={handleRemoveCustom} variant="danger" size="sm">
                    <Trash2 className="h-4 w-4" />
                    Xoá ảnh
                  </Button>
                )}
              </div>

              {uploadError && <p className="mt-3 text-xs font-bold text-red-500">{uploadError}</p>}
              <p className="mt-1 text-[11px] text-slate-400">JPG, PNG, GIF, WEBP · Tối đa 5MB</p>
            </div>

            <div>
              <FieldLabel>Tên hiển thị</FieldLabel>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={30} placeholder="Nhập tên mới..." />
            </div>

            <div>
              <FieldLabel>Avatar emoji</FieldLabel>
              <div className="flex gap-3">
                {EMOJI_AVATARS.map((av) => (
                  <button
                    key={av.id}
                    onClick={() => {
                      setEditAvatar(editAvatar === av.id ? "" : av.id);
                      setEditCustomUrl("");
                      setUploadPreview(null);
                    }}
                    className={`flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-xl font-black shadow-sm transition-all ${editAvatar === av.id && !editCustomUrl ? `${av.color} scale-105 ring-2 ring-emerald-500 ring-offset-1` : "bg-slate-100 text-slate-400 opacity-60 hover:bg-slate-200 hover:opacity-100"}`}
                  >
                    {av.emoji}
                    <span className="text-[8px] font-bold leading-none">{av.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Khung avatar</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setEditFrame("")} className={`rounded-2xl border-2 p-3 text-left transition-all ${!editFrame ? "border-slate-400 bg-slate-100" : "border-slate-100 bg-white"}`}>
                  <p className="text-xs font-bold text-slate-700">Không khung</p>
                  <p className="text-[10px] text-slate-400">Mặc định</p>
                </button>
                {FRAMES.map((fr) => (
                  <button key={fr.id} onClick={() => setEditFrame(editFrame === fr.id ? "" : fr.id)} className={`rounded-2xl border-2 p-3 text-left transition-all ${editFrame === fr.id ? "border-emerald-400 bg-emerald-50" : "border-slate-100 bg-white hover:border-slate-300"}`}>
                    <p className="text-xs font-bold text-slate-700">{fr.name}</p>
                    <p className="text-[10px] text-slate-400">{fr.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Mật khẩu xác nhận</FieldLabel>
              <Input type="password" value={editPass} onChange={(e) => setEditPass(e.target.value)} placeholder="Nhập mật khẩu tài khoản..." />
            </div>

            {savingMsg && (
              <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${savingMsg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-600"}`}>
                {savingMsg.text}
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={handleSave} loading={saving} className="flex-1" size="lg">
                {!saving && <Save size={18} />}
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
              <Button onClick={closeEdit} variant="ghost" size="lg">Huỷ</Button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
