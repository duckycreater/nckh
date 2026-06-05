import React, { useState, useEffect } from "react";
import { CheckCircle2, Lock, Palette, Shield, UserCircle2 } from "lucide-react";
import { User } from "../types";
import { Badge, Button, Card, FieldLabel, Input, TabButton } from "../lib/ui";

interface SettingsProps {
  user: User;
  onUpdate: (user: Partial<User>) => void;
}

const AVATARS = [
  { id: "av1", name: "Mầm Xanh", emoji: "🌱" },
  { id: "av2", name: "Chiến Binh Nước", emoji: "💧" },
  { id: "av3", name: "Thủ Lĩnh Rừng", emoji: "🦁" },
];

const FRAMES = [
  { id: "fr1", name: "Khung Gỗ", borderClass: "border-4 border-amber-700", shadowClass: "" },
  { id: "fr2", name: "Khung Băng", borderClass: "border-4 border-cyan-400", shadowClass: "" },
  { id: "fr3", name: "Hào Quang Đất", borderClass: "border-4 border-emerald-500", shadowClass: "shadow-[0_0_12px_#10b981]" },
];

export function Settings({ user, onUpdate }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<"appearance" | "name" | "password">("appearance");
  const [savingPref, setSavingPref] = useState(false);
  const [prefMsg, setPrefMsg] = useState("");

  const [selectedAvatar, setSelectedAvatar] = useState(user.selectedAvatar || "");
  const [selectedFrame, setSelectedFrame] = useState(user.selectedFrame || "");

  const [newName, setNewName] = useState(user.name);
  const [namePass, setNamePass] = useState("");
  const [nameMsg, setNameMsg] = useState("");
  const [nameErr, setNameErr] = useState("");

  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passMsg, setPassMsg] = useState("");
  const [passErr, setPassErr] = useState("");

  const purchased = user.progress?.purchased || [];
  const hasPurchased = (id: string) => purchased.includes(id) || purchased.includes(Number(id));

  useEffect(() => {
    setSelectedAvatar(user.selectedAvatar || "");
    setSelectedFrame(user.selectedFrame || "");
  }, [user.selectedAvatar, user.selectedFrame]);

  const handleSaveAppearance = async () => {
    setSavingPref(true);
    setPrefMsg("");
    try {
      const res = await fetch("/api/update-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: user.account_id,
          selectedAvatar: selectedAvatar || null,
          selectedFrame: selectedFrame || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdate({ selectedAvatar: selectedAvatar || undefined, selectedFrame: selectedFrame || undefined });
        setPrefMsg("Đã lưu giao diện hồ sơ.");
      } else {
        setPrefMsg("Lưu thất bại.");
      }
    } catch {
      setPrefMsg("Lỗi kết nối.");
    } finally {
      setSavingPref(false);
      setTimeout(() => setPrefMsg(""), 2200);
    }
  };

  const getPasswordStrength = (pass: string) => {
    if (pass.length === 0) return { color: "bg-gray-200", label: "", width: "0%" };
    if (pass.length < 6) return { color: "bg-red-500", label: "Yếu", width: "33%" };
    if (pass.length < 10 || !/[A-Z]/.test(pass) || !/[0-9]/.test(pass)) return { color: "bg-yellow-500", label: "Trung bình", width: "66%" };
    return { color: "bg-green-500", label: "Mạnh", width: "100%" };
  };
  const strength = getPasswordStrength(newPass);

  const handleChangeName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameErr("");
    setNameMsg("");
    try {
      const res = await fetch("/api/change-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cn_nickname: user.account_id,
          cn_newname: newName,
          cn_password: namePass,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNameMsg("Cập nhật tên thành công.");
        setNamePass("");
        onUpdate({ name: data.newName });
      } else {
        setNameErr(data.message);
      }
    } catch {
      setNameErr("Lỗi kết nối.");
    }
  };

  const handleChangePass = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassErr("");
    setPassMsg("");
    if (newPass.length < 6) {
      setPassErr("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (newPass !== confirmPass) {
      setPassErr("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (oldPass === newPass) {
      setPassErr("Mật khẩu mới phải khác mật khẩu cũ.");
      return;
    }
    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cp_nickname: user.account_id,
          cp_old_pass: oldPass,
          cp_new_pass: newPass,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPassMsg("Đổi mật khẩu thành công.");
        setOldPass("");
        setNewPass("");
        setConfirmPass("");
      } else {
        setPassErr(data.message);
      }
    } catch {
      setPassErr("Lỗi kết nối.");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="overflow-hidden rounded-[30px] p-0">
        <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff,#f7faf8)] px-6 py-6 sm:px-8">
          <Badge tone="accent">Tài khoản</Badge>
          <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900">Cài đặt cá nhân</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Tinh chỉnh hồ sơ, tên hiển thị và bảo mật tài khoản trong một giao diện gọn gàng hơn.
          </p>
        </div>

        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="flex gap-2 rounded-[24px] bg-slate-100 p-1">
            {([
              { id: "appearance", label: "Hiển thị", icon: <Palette className="h-4 w-4" /> },
              { id: "name", label: "Tên", icon: <UserCircle2 className="h-4 w-4" /> },
              { id: "password", label: "Mật khẩu", icon: <Shield className="h-4 w-4" /> },
            ] as const).map((tab) => (
              <TabButton key={tab.id} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className="flex-1 justify-center gap-2 px-3 py-3">
                {tab.icon}
                <span>{tab.label}</span>
              </TabButton>
            ))}
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {activeTab === "appearance" && (
            <div className="space-y-8">
              <div className="rounded-[26px] border border-slate-100 bg-slate-50/80 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-lg font-black text-slate-900">Xem trước hồ sơ</p>
                    <p className="text-sm text-slate-500">Chọn avatar và khung đã mở khoá để làm mới diện mạo.</p>
                  </div>
                  <div className={`flex h-20 w-20 items-center justify-center rounded-full bg-white text-3xl shadow-sm ${FRAMES.find((f) => f.id === selectedFrame)?.borderClass || "border border-slate-200"} ${FRAMES.find((f) => f.id === selectedFrame)?.shadowClass || ""}`}>
                    {AVATARS.find((a) => a.id === selectedAvatar)?.emoji || user.name[0]}
                  </div>
                </div>
              </div>

              <div>
                <FieldLabel>Avatar hồ sơ</FieldLabel>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {AVATARS.map((av) => {
                    const owned = hasPurchased(av.id);
                    const active = selectedAvatar === av.id;
                    return (
                      <button
                        key={av.id}
                        disabled={!owned}
                        onClick={() => setSelectedAvatar(active ? "" : av.id)}
                        className={`relative rounded-[24px] border p-4 text-left transition-all ${
                          active
                            ? "border-emerald-400 bg-emerald-50 shadow-[var(--shadow-soft)]"
                            : owned
                            ? "border-slate-200 bg-white hover:border-emerald-200 hover:bg-slate-50"
                            : "border-slate-100 bg-slate-50 opacity-55 cursor-not-allowed"
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-3xl">{av.emoji}</span>
                          {!owned && <Badge>Chưa mở</Badge>}
                          {active && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                        </div>
                        <p className="font-bold text-slate-800">{av.name}</p>
                        <p className="mt-1 text-xs text-slate-500">Dùng cho hồ sơ và thẻ xếp hạng.</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <FieldLabel>Khung hồ sơ</FieldLabel>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {FRAMES.map((fr) => {
                    const owned = hasPurchased(fr.id);
                    const active = selectedFrame === fr.id;
                    return (
                      <button
                        key={fr.id}
                        disabled={!owned}
                        onClick={() => setSelectedFrame(active ? "" : fr.id)}
                        className={`relative rounded-[24px] border p-4 text-left transition-all ${
                          active
                            ? "border-emerald-400 bg-emerald-50 shadow-[var(--shadow-soft)]"
                            : owned
                            ? "border-slate-200 bg-white hover:border-emerald-200 hover:bg-slate-50"
                            : "border-slate-100 bg-slate-50 opacity-55 cursor-not-allowed"
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-700 ${fr.borderClass} ${fr.shadowClass}`}>
                            {user.name[0]}
                          </div>
                          {!owned && <Badge>Chưa mở</Badge>}
                          {active && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                        </div>
                        <p className="font-bold text-slate-800">{fr.name}</p>
                        <p className="mt-1 text-xs text-slate-500">Tạo điểm nhấn cho avatar khi hiển thị trên app.</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button onClick={handleSaveAppearance} loading={savingPref}>Lưu thay đổi</Button>
                {prefMsg && (
                  <span className={`text-sm font-bold ${prefMsg.includes("thất") || prefMsg.includes("Lỗi") ? "text-red-500" : "text-emerald-600"}`}>
                    {prefMsg}
                  </span>
                )}
              </div>
            </div>
          )}

          {activeTab === "name" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-black text-slate-900">Đổi tên hiển thị</h3>
                <p className="mt-2 text-sm text-slate-500">Tên hiện tại của bạn là <span className="font-bold text-slate-700">{user.name}</span>.</p>
              </div>

              {nameErr && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{nameErr}</div>}
              {nameMsg && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{nameMsg}</div>}

              <form onSubmit={handleChangeName} className="space-y-4">
                <div>
                  <FieldLabel>Tên hiển thị mới</FieldLabel>
                  <Input required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nhập tên hiển thị mới" />
                </div>
                <div>
                  <FieldLabel>Mật khẩu xác nhận</FieldLabel>
                  <Input type="password" required value={namePass} onChange={(e) => setNamePass(e.target.value)} placeholder="Nhập mật khẩu hiện tại" />
                </div>
                <Button type="submit">Cập nhật tên</Button>
              </form>
            </div>
          )}

          {activeTab === "password" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-black text-slate-900">Đổi mật khẩu</h3>
                <p className="mt-2 text-sm text-slate-500">Tăng độ an toàn cho tài khoản với mật khẩu mạnh hơn và dễ ghi nhớ.</p>
              </div>

              {passErr && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{passErr}</div>}
              {passMsg && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{passMsg}</div>}

              <form onSubmit={handleChangePass} className="space-y-4">
                <div>
                  <FieldLabel>Mật khẩu cũ</FieldLabel>
                  <Input type="password" required value={oldPass} onChange={(e) => setOldPass(e.target.value)} placeholder="Nhập mật khẩu cũ" />
                </div>
                <div>
                  <FieldLabel>Mật khẩu mới</FieldLabel>
                  <Input type="password" required value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Ít nhất 6 ký tự" />
                  {newPass.length > 0 && (
                    <div className="mt-2">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: strength.width }} />
                      </div>
                      <p className={`mt-1 text-xs font-bold ${strength.label === "Mạnh" ? "text-green-600" : strength.label === "Trung bình" ? "text-yellow-600" : "text-red-500"}`}>
                        {strength.label}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <FieldLabel>Xác nhận mật khẩu mới</FieldLabel>
                  <Input
                    type="password"
                    required
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className={confirmPass && newPass !== confirmPass ? "border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-500/10" : ""}
                  />
                  {confirmPass && newPass !== confirmPass && (
                    <p className="mt-1 text-xs font-bold text-red-500">Mật khẩu không khớp.</p>
                  )}
                </div>
                <div className="rounded-[24px] border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  <div className="mb-2 flex items-center gap-2 font-bold text-slate-700">
                    <Lock className="h-4 w-4" />
                    Gợi ý mật khẩu mạnh
                  </div>
                  Kết hợp chữ hoa, số và độ dài tối thiểu 10 ký tự để tăng độ an toàn.
                </div>
                <Button type="submit" variant="secondary">Đổi mật khẩu</Button>
              </form>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
