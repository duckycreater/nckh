import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { User } from "../types";
import { changeLanguage, getCurrentLanguage, LANGUAGES, LanguageCode } from "../lib/i18n";
import {
  ArrowRight,
  Bot,
  Check,
  FlaskConical,
  Globe,
  LockKeyhole,
  Search,
  Shield,
  X,
} from "lucide-react";
import { ContributeToDataset } from "./ContributeToDataset";
import { PrivacyBudgetMeter } from "./PrivacyBudgetMeter";
import { AuditTimeline } from "./AuditTimeline";
import { getAuthHeaders, getAuthToken } from "../lib/auth";
import { PROFILE_AVATARS, PROFILE_FRAMES } from "../lib/bmoAssets";
import type { PrivacyDashboardProps } from "./PrivacyDashboard";
import { MaterialFingerprint } from "./MaterialVisual";
import type { WasteCategory } from "../../shared/materialCards";
import { TabButton, Tabs } from "../lib/ui";

interface SettingsProps {
  user: User;
  onUpdate: (user: Partial<User>) => void;
}

export function Settings({ user, onUpdate }: SettingsProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<
    "appearance" | "name" | "password" | "robot" | "language" | "privacy"
  >("appearance");
  const [lang, setLang] = useState<LanguageCode>(getCurrentLanguage());
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
  const [robotPin, setRobotPin] = useState("");
  const [robotPinConfirm, setRobotPinConfirm] = useState("");
  const [robotPinMsg, setRobotPinMsg] = useState("");
  const [robotPinErr, setRobotPinErr] = useState("");
  const [savingRobotPin, setSavingRobotPin] = useState(false);

  const purchased = user.progress?.purchased || [];
  const hasPurchased = (id: string) => purchased.includes(id) || purchased.includes(Number(id));
  const materialCycle: WasteCategory[] = [
    "plastic",
    "paper",
    "glass",
    "metal",
    "organic",
    "hazard",
  ];

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
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          nickname: user.account_id,
          selectedAvatar: selectedAvatar || null,
          selectedFrame: selectedFrame || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdate({
          selectedAvatar: selectedAvatar || undefined,
          selectedFrame: selectedFrame || undefined,
          customAvatarUrl: undefined,
        });
        setPrefMsg("Đã lưu!");
      } else {
        setPrefMsg("Lưu thất bại.");
      }
    } catch {
      setPrefMsg("Lỗi kết nối.");
    } finally {
      setSavingPref(false);
      setTimeout(() => setPrefMsg(""), 2000);
    }
  };

  const getPasswordStrength = (pass: string) => {
    if (pass.length === 0) return { color: "bg-gray-200", label: "", width: "0%" };
    if (pass.length < 8) return { color: "bg-red-500", label: "Yếu", width: "33%" };
    if (pass.length < 10 || !/[A-Z]/.test(pass) || !/[0-9]/.test(pass))
      return { color: "bg-yellow-500", label: "Trung bình", width: "66%" };
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
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
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
    if (newPass.length < 8 || newPass.length > 128) {
      setPassErr("Mật khẩu mới phải dài từ 8 đến 128 ký tự.");
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
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
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

  const handleRobotPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setRobotPinErr("");
    setRobotPinMsg("");
    if (!/^\d{6}$/.test(robotPin)) {
      setRobotPinErr("PIN robot phải gồm đúng 6 chữ số.");
      return;
    }
    if (/^(\d)\1{5}$/.test(robotPin)) {
      setRobotPinErr("Không dùng cùng một chữ số lặp lại 6 lần.");
      return;
    }
    if (robotPin !== robotPinConfirm) {
      setRobotPinErr("PIN xác nhận không khớp.");
      return;
    }
    setSavingRobotPin(true);
    try {
      const response = await fetch("/api/me/robot-pin", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ pin: robotPin }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Không thể lưu PIN robot.");
      setRobotPin("");
      setRobotPinConfirm("");
      setRobotPinMsg("Đã đặt PIN robot. PIN không được hiển thị hoặc lưu trong nhật ký.");
    } catch (error) {
      setRobotPinErr(error instanceof Error ? error.message : "Lỗi kết nối.");
    } finally {
      setSavingRobotPin(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Tab navigation */}
      <Tabs className="thin-scrollbar">
        <TabButton active={activeTab === "appearance"} onClick={() => setActiveTab("appearance")}>
          {t("settings.display")}
        </TabButton>
        <TabButton active={activeTab === "name"} onClick={() => setActiveTab("name")}>
          {t("settings.displayName")}
        </TabButton>
        <TabButton active={activeTab === "password"} onClick={() => setActiveTab("password")}>
          {t("settings.password")}
        </TabButton>
        <TabButton
          active={activeTab === "robot"}
          onClick={() => setActiveTab("robot")}
          className="flex items-center justify-center gap-1.5"
        >
          <Bot size={15} />
          <span>PIN robot</span>
        </TabButton>
        <TabButton
          active={activeTab === "language"}
          onClick={() => setActiveTab("language")}
          className="flex items-center justify-center gap-1.5"
        >
          <Globe size={15} />
          <span>Ngôn ngữ</span>
        </TabButton>
        <TabButton
          active={activeTab === "privacy"}
          onClick={() => setActiveTab("privacy")}
          className="flex items-center justify-center gap-1.5"
        >
          <Shield size={15} />
          <span>Quyền riêng tư</span>
        </TabButton>
      </Tabs>

      {/* Appearance tab */}
      {activeTab === "appearance" && (
        <div className="space-y-6 rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface)] p-4 sm:p-6 md:p-8">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Avatar</h3>
            <p className="text-xs text-gray-500 mb-3">
              Chọn avatar để hiển thị trên hồ sơ. Mua tại Cửa Hàng Điểm Thưởng.
            </p>
            <div className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3">
              {PROFILE_AVATARS.map((av, index) => {
                const owned = hasPurchased(av.id);
                const active = selectedAvatar === av.id;
                return (
                  <button
                    key={av.id}
                    disabled={!owned}
                    onClick={() => setSelectedAvatar(active ? "" : av.id)}
                    className={`relative flex flex-col items-center gap-2 rounded-[10px] border p-4 transition-colors ${
                      active
                        ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                        : owned
                          ? "border-gray-200 bg-gray-50 hover:border-gray-300"
                          : "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    {!owned && (
                      <span className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-[6px] bg-gray-200 text-gray-600">
                        <LockKeyhole size={12} aria-label="Chưa sở hữu" />
                      </span>
                    )}
                    {active && (
                      <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-[6px] bg-[var(--primary)] text-white">
                        <Check size={13} aria-label="Đang chọn" />
                      </span>
                    )}
                    <span
                      data-material={materialCycle[index % materialCycle.length]}
                      className={`material-pattern material-${materialCycle[index % materialCycle.length]} h-16 w-16 overflow-hidden rounded-[8px] border border-[var(--border-subtle)] p-1 text-white`}
                    >
                      <MaterialFingerprint
                        category={materialCycle[index % materialCycle.length]}
                        seed={av.id}
                      />
                    </span>
                    <span className="text-xs font-bold text-gray-700 text-center">{av.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Khung hồ sơ</h3>
            <p className="text-xs text-gray-500 mb-3">
              Chọn khung để trang trí hồ sơ. Mua tại Cửa Hàng Điểm Thưởng.
            </p>
            <div className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3">
              {PROFILE_FRAMES.map((fr) => {
                const owned = hasPurchased(fr.id);
                const active = selectedFrame === fr.id;
                return (
                  <button
                    key={fr.id}
                    disabled={!owned}
                    onClick={() => setSelectedFrame(active ? "" : fr.id)}
                    className={`relative flex flex-col items-center gap-2 rounded-[10px] border p-4 transition-colors ${
                      active
                        ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                        : owned
                          ? "border-gray-200 bg-gray-50 hover:border-gray-300"
                          : "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    {!owned && (
                      <span className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-[6px] bg-gray-200 text-gray-600">
                        <LockKeyhole size={12} aria-label="Chưa sở hữu" />
                      </span>
                    )}
                    {active && (
                      <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-[6px] bg-[var(--primary)] text-white">
                        <Check size={13} aria-label="Đang chọn" />
                      </span>
                    )}
                    <div
                      className={`w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-2xl ${fr.previewClass}`}
                    >
                      <span className="font-black text-gray-600">{user.name[0]}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-700 text-center">{fr.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveAppearance}
              disabled={savingPref}
              className="px-6 py-2.5 bg-emerald-600 dark:bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-500 disabled:opacity-60 transition-colors"
            >
              {savingPref ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
            {prefMsg && (
              <span
                className={`text-sm font-bold ${prefMsg.includes("thất") || prefMsg.includes("Lỗi") ? "text-red-500" : "text-emerald-600"}`}
              >
                {prefMsg}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Name tab */}
      {activeTab === "name" && (
        <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface)] p-6 md:p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Đổi tên hiển thị</h3>
          {nameErr && <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded">{nameErr}</p>}
          {nameMsg && (
            <p className="text-green-600 text-sm mb-4 bg-green-50 p-3 rounded">{nameMsg}</p>
          )}
          <form onSubmit={handleChangeName} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên hiện tại: <span className="font-bold">{user.name}</span>
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Tên hiển thị mới"
                className="w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <input
                type="password"
                required
                value={namePass}
                onChange={(e) => setNamePass(e.target.value)}
                placeholder="Mật khẩu xác nhận"
                className="w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-500"
            >
              Cập nhật Tên
            </button>
          </form>
        </div>
      )}

      {/* Password tab */}
      {activeTab === "password" && (
        <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface)] p-6 md:p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Đổi mật khẩu</h3>
          {passErr && <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded">{passErr}</p>}
          {passMsg && (
            <p className="text-green-600 text-sm mb-4 bg-green-50 p-3 rounded">{passMsg}</p>
          )}
          <form onSubmit={handleChangePass} className="space-y-4">
            <div>
              <input
                type="password"
                required
                value={oldPass}
                onChange={(e) => setOldPass(e.target.value)}
                placeholder="Mật khẩu cũ"
                className="w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <input
                type="password"
                required
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Mật khẩu mới (ít nhất 8 ký tự)"
                className="w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-emerald-600"
              />
              {newPass.length > 0 && (
                <div className="mt-1.5">
                  <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${strength.color} transition-all duration-300`}
                      style={{ width: strength.width }}
                    />
                  </div>
                  <p
                    className={`text-xs mt-0.5 ${strength.label === "Mạnh" ? "text-green-600" : strength.label === "Trung bình" ? "text-yellow-600" : "text-red-500"}`}
                  >
                    {strength.label}
                  </p>
                </div>
              )}
            </div>
            <div>
              <input
                type="password"
                required
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="Xác nhận mật khẩu mới"
                className={`w-full rounded-md py-2 px-3 text-gray-900 ring-1 ring-inset focus:ring-2 focus:ring-emerald-600 ${confirmPass && newPass !== confirmPass ? "ring-red-500 bg-red-50" : "ring-gray-300"}`}
              />
              {confirmPass && newPass !== confirmPass && (
                <p className="text-xs text-red-500 mt-0.5">Mật khẩu không khớp</p>
              )}
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800"
            >
              Đổi Mật Khẩu
            </button>
          </form>
        </div>
      )}

      {activeTab === "robot" && (
        <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface)] p-6 md:p-8">
          <div className="mb-6 flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[9px] bg-[var(--primary-soft)] text-[var(--primary)]">
              <Bot size={20} />
            </span>
            <div>
              <h3 className="text-xl font-bold text-gray-900">PIN xác nhận tại BMO</h3>
              <p className="mt-1 text-sm text-gray-500">
                Dùng ID tài khoản <strong>{user.account_id}</strong> và PIN này khi robot không đọc
                được phù hiệu.
              </p>
            </div>
          </div>
          {robotPinErr && (
            <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">{robotPinErr}</p>
          )}
          {robotPinMsg && (
            <p className="mb-4 rounded bg-emerald-50 p-3 text-sm text-emerald-700">{robotPinMsg}</p>
          )}
          <form onSubmit={handleRobotPin} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">PIN mới gồm 6 số</span>
              <input
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={6}
                required
                value={robotPin}
                onChange={(event) => setRobotPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full rounded-md border-0 px-3 py-2 font-mono tracking-[0.35em] text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-emerald-600"
                type="password"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Nhập lại PIN</span>
              <input
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={6}
                required
                value={robotPinConfirm}
                onChange={(event) =>
                  setRobotPinConfirm(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="w-full rounded-md border-0 px-3 py-2 font-mono tracking-[0.35em] text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-emerald-600"
                type="password"
              />
            </label>
            <p className="text-xs text-gray-500">
              Robot khóa nhập trong 15 phút sau 5 lần sai. PIN được băm trên server và không nằm
              trong evidence.
            </p>
            <button
              type="submit"
              disabled={savingRobotPin}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {savingRobotPin ? "Đang lưu..." : "Đặt hoặc đổi PIN"}
            </button>
          </form>
        </div>
      )}

      {/* Language tab */}
      {activeTab === "language" && (
        <div className="space-y-6 rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface)] p-6 md:p-8">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Ngôn ngữ</h3>
            <p className="text-xs text-gray-500 mb-4">Chọn ngôn ngữ hiển thị cho ứng dụng.</p>
            <div className="space-y-2">
              {LANGUAGES.map((language) => (
                <button
                  key={language.code}
                  onClick={() => {
                    changeLanguage(language.code);
                    setLang(language.code);
                  }}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    lang === language.code
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  <span className="font-telemetry grid h-9 w-11 place-items-center rounded-[6px] border border-[var(--border-subtle)] bg-[var(--surface)] text-[11px] font-semibold uppercase text-[var(--text-muted)]">
                    {language.code}
                  </span>
                  <div className="text-left">
                    <div className="font-bold text-gray-900">{language.label}</div>
                  </div>
                  {lang === language.code && (
                    <span className="ml-auto grid h-7 w-7 place-items-center rounded-[6px] bg-[var(--primary)] text-white">
                      <Check size={14} aria-label="Đang sử dụng" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Privacy & Data tab */}
      {activeTab === "privacy" && (
        <div className="space-y-6 rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface)] p-6 md:p-8">
          <PrivacyTabContent user={user} />
        </div>
      )}
    </div>
  );
}

function PrivacyTabContent({ user }: { user: User }) {
  const [consent, setConsent] = useState<boolean>(false);
  const [stats, setStats] = useState<{ totalImages: number; imagesInRelease: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [showPrivacyDashboard, setShowPrivacyDashboard] = useState(false);

  useEffect(() => {
    let mounted = true;
    const token = getAuthToken();
    fetch("/api/dataset/status", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!mounted || !data) return;
        setConsent(data.consentGiven === true);
        setStats({
          totalImages: data.totalImages || 0,
          imagesInRelease: data.imagesInRelease || 0,
        });
        try {
          localStorage.setItem("bmo_dataset_consent", data.consentGiven ? "true" : "false");
        } catch (e) {
          // localStorage may be full or disabled - non-critical
          console.info("[Settings] Could not persist dataset consent:", e);
        }
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [user.account_id]);

  return (
    <>
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Shield size={18} className="text-emerald-600" />
          Quyền riêng tư & Dữ liệu
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Kiểm soát dữ liệu cá nhân của bạn và đóng góp cho nghiên cứu khoa học mở.
        </p>
      </div>

      {/* Dataset contribution card */}
      <div className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="mb-1 flex items-center gap-2 text-sm font-bold text-emerald-900">
              <FlaskConical size={16} /> Đóng góp cho Khoa học Mở
            </h4>
            <p className="text-xs text-emerald-800/80">
              Cho phép ảnh phân loại rác của bạn được đưa vào TDN-Waste-World — dataset mở phục vụ
              nghiên cứu toàn cầu.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-xs text-gray-500">Đang tải...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-white/70 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-emerald-700">{stats?.totalImages || 0}</div>
                <div className="text-[10px] uppercase tracking-wider text-gray-600">
                  Ảnh đã đóng góp
                </div>
              </div>
              <div className="bg-white/70 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-blue-700">{stats?.imagesInRelease || 0}</div>
                <div className="text-[10px] uppercase tracking-wider text-gray-600">
                  Đã công khai
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between bg-white/70 rounded-lg p-3">
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900">
                  {consent ? "✓ Đang đóng góp" : "Chưa đóng góp"}
                </div>
                <div className="text-[10px] text-gray-600">
                  Ảnh được ẩn danh (xóa EXIF) trước khi xuất bản
                </div>
              </div>
              <button
                onClick={() => setShowContributeModal(true)}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700"
              >
                {consent ? "Quản lý" : "Tìm hiểu thêm"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Privacy guarantees */}
      <div className="space-y-2">
        <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900">
          <Shield size={16} className="text-[var(--primary)]" /> Cam kết của chúng tôi
        </h4>
        <ul className="text-xs text-gray-600 space-y-1.5 ml-4 list-disc">
          <li>Ảnh được xóa EXIF (GPS, model camera, timestamp) trước khi upload</li>
          <li>
            Bạn có thể thu hồi đồng ý bất kỳ lúc nào — dữ liệu sẽ bị ẩn khỏi các bản phát hành tương
            lai
          </li>
          <li>Mọi dataset phát hành đều dùng license CC-BY-4.0 (mã nguồn mở, ghi công)</li>
          <li>Người dùng dưới 13 tuổi: phải được phụ huynh đồng ý trước khi bật tính năng này</li>
          <li>
            <strong>Federated Learning:</strong> ảnh KHÔNG BAO GIỜ rời khỏi thiết bị của bạn. Chỉ
            model updates (đã mã hóa + thêm nhiễu) mới được gửi về server.
          </li>
        </ul>
      </div>

      {/* Federated Learning transparency */}
      <button
        onClick={() => setShowPrivacyDashboard(true)}
        className="flex w-full items-center gap-3 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 text-left text-sm font-semibold text-[var(--graphite)] transition-colors hover:border-[var(--border-strong)]"
      >
        <Search size={17} className="text-[var(--primary)]" />
        <span className="flex-1">
          Xem Trung tâm Quyền riêng tư
          <span className="block text-[10px] font-normal opacity-70">
            BMO đã học gì từ bạn? Model version? DP ε/δ?
          </span>
        </span>
        <ArrowRight size={16} />
      </button>

      {/* Privacy budget meter + audit trail (visible, not modal) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <PrivacyBudgetMeter />
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h4 className="text-sm font-bold text-slate-900 mb-2">Nhật ký sự kiện riêng tư</h4>
          <AuditTimeline />
        </div>
      </div>

      {showContributeModal && (
        <ContributeToDataset
          nickname={user.account_id}
          isOpen={showContributeModal}
          onClose={() => setShowContributeModal(false)}
        />
      )}

      {showPrivacyDashboard && (
        <PrivacyDashboardWrapper onClose={() => setShowPrivacyDashboard(false)} />
      )}
    </>
  );
}

function PrivacyDashboardWrapper({ onClose }: { onClose: () => void }) {
  const [Comp, setComp] = useState<React.ComponentType<PrivacyDashboardProps> | null>(null);
  useEffect(() => {
    let mounted = true;
    import("./PrivacyDashboard").then((m) => {
      if (mounted) setComp(() => m.PrivacyDashboard);
    });
    return () => {
      mounted = false;
    };
  }, []);
  if (!Comp) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Trung tâm quyền riêng tư"
      className="fixed inset-0 z-[120] overflow-y-auto bg-slate-950/70 p-4"
    >
      <div className="mx-auto max-w-5xl pt-8 sm:pt-14">
        <div className="mb-3 flex justify-end">
          <button
            onClick={onClose}
            aria-label="Đóng trung tâm quyền riêng tư"
            className="rounded-[8px] border border-[var(--border-subtle)] bg-white p-2 text-slate-700 transition hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <Comp />
      </div>
    </div>
  );
}
