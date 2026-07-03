import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { User } from "../types";
import { changeLanguage, getCurrentLanguage, LANGUAGES, LanguageCode } from "../lib/i18n";
import { Globe, Shield } from "lucide-react";
import { useTheme } from "../App";
import { ContributeToDataset } from "./ContributeToDataset";

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

const ALL_PURCHASE_IDS = ["av1", "av2", "av3", "fr1", "fr2", "fr3"];

const SETTINGS_TABS = [
  { id: "appearance", label: "Giao diện" },
  { id: "name", label: "Tên hiển thị" },
  { id: "password", label: "Mật khẩu" },
  { id: "language", label: "Ngôn ngữ" },
  { id: "privacy", label: "Dữ liệu & Quyền riêng tư" },
] as const;

export function Settings({ user, onUpdate }: SettingsProps) {
  const { t } = useTranslation();
  const { theme, toggle } = useTheme();
  const [activeTab, setActiveTab] = useState<"appearance" | "name" | "password" | "language" | "privacy">("appearance");
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
        onUpdate({ selectedAvatar: selectedAvatar || undefined, selectedFrame: selectedFrame || undefined, customAvatarUrl: undefined });
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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Tab navigation */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setActiveTab("appearance")}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === "appearance"
              ? "bg-white text-emerald-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {t("settings.display")}
        </button>
        <button
          onClick={() => setActiveTab("name")}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === "name"
              ? "bg-white text-emerald-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {t("settings.displayName")}
        </button>
        <button
          onClick={() => setActiveTab("password")}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === "password"
              ? "bg-white text-emerald-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {t("settings.password")}
        </button>
        <button
          onClick={() => setActiveTab("language")}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "language"
              ? "bg-white text-emerald-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Globe size={15} />
          <span>Ngôn ngữ</span>
        </button>
        <button
          onClick={() => setActiveTab("privacy")}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1 ${
            activeTab === "privacy"
              ? "bg-white text-emerald-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Shield size={15} />
          <span>Quyền riêng tư</span>
        </button>
      </div>

      {/* Appearance tab */}
      {activeTab === "appearance" && (
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Avatar</h3>
            <p className="text-xs text-gray-500 mb-3">Chọn avatar để hiển thị trên hồ sơ. Mua tại Cửa Hàng Điểm Thưởng.</p>
            <div className="grid grid-cols-3 gap-3">
              {AVATARS.map((av) => {
                const owned = hasPurchased(av.id);
                const active = selectedAvatar === av.id;
                return (
                  <button
                    key={av.id}
                    disabled={!owned}
                    onClick={() => setSelectedAvatar(active ? "" : av.id)}
                    className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                      active
                        ? "border-emerald-500 bg-emerald-50"
                        : owned
                        ? "border-gray-200 bg-gray-50 hover:border-gray-300"
                        : "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    {!owned && (
                      <span className="absolute top-1 right-1 text-[10px] bg-gray-200 text-gray-600 px-1.5 rounded font-bold">🔒</span>
                    )}
                    {active && (
                      <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">✓</span>
                    )}
                    <span className="text-3xl">{av.emoji}</span>
                    <span className="text-xs font-bold text-gray-700 text-center">{av.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Khung hồ sơ</h3>
            <p className="text-xs text-gray-500 mb-3">Chọn khung để trang trí hồ sơ. Mua tại Cửa Hàng Điểm Thưởng.</p>
            <div className="grid grid-cols-3 gap-3">
              {FRAMES.map((fr) => {
                const owned = hasPurchased(fr.id);
                const active = selectedFrame === fr.id;
                return (
                  <button
                    key={fr.id}
                    disabled={!owned}
                    onClick={() => setSelectedFrame(active ? "" : fr.id)}
                    className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                      active
                        ? "border-emerald-500 bg-emerald-50"
                        : owned
                        ? "border-gray-200 bg-gray-50 hover:border-gray-300"
                        : "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    {!owned && (
                      <span className="absolute top-1 right-1 text-[10px] bg-gray-200 text-gray-600 px-1.5 rounded font-bold">🔒</span>
                    )}
                    {active && (
                      <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">✓</span>
                    )}
                    <div className={`w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl ${fr.borderClass} ${fr.shadowClass}`}>
                      <span className="font-black text-gray-600">{user.name[0]}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-700 text-center">{fr.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dark mode toggle */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Chế độ giao diện</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Chọn chế độ sáng hoặc tối cho ứng dụng.</p>
            <button
              onClick={toggle}
              className="relative flex items-center gap-3 w-full p-4 rounded-2xl border-2 transition-all bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            >
              <span className="text-2xl">{theme === "dark" ? "🌙" : "☀️"}</span>
              <div className="text-left flex-1">
                <div className="font-bold text-gray-900 dark:text-gray-100">
                  {theme === "dark" ? "Chế độ Tối" : "Chế độ Sáng"}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {theme === "dark" ? "Giao diện tối, giảm mỏi mắt" : "Giao diện sáng mặc định"}
                </div>
              </div>
              <div className={`relative w-12 h-6 rounded-full transition-colors ${theme === "dark" ? "bg-emerald-500" : "bg-gray-300"}`}>
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${theme === "dark" ? "translate-x-6" : "translate-x-0.5"}`}
                />
              </div>
            </button>
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
              <span className={`text-sm font-bold ${prefMsg.includes("thất") || prefMsg.includes("Lỗi") ? "text-red-500" : "text-emerald-600"}`}>
                {prefMsg}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Name tab */}
      {activeTab === "name" && (
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Đổi tên hiển thị</h3>
          {nameErr && (
            <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded">{nameErr}</p>
          )}
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
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Đổi mật khẩu</h3>
          {passErr && (
            <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded">{passErr}</p>
          )}
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
                placeholder="Mật khẩu mới (ít nhất 6 ký tự)"
                className="w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-emerald-600"
              />
              {newPass.length > 0 && (
                <div className="mt-1.5">
                  <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: strength.width }} />
                  </div>
                  <p className={`text-xs mt-0.5 ${strength.label === "Mạnh" ? "text-green-600" : strength.label === "Trung bình" ? "text-yellow-600" : "text-red-500"}`}>
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

      {/* Language tab */}
      {activeTab === "language" && (
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
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
                  <span className="text-2xl">{language.flag}</span>
                  <div className="text-left">
                    <div className="font-bold text-gray-900">{language.label}</div>
                  </div>
                  {lang === language.code && (
                    <span className="ml-auto bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    {/* Privacy & Data tab */}
      {activeTab === "privacy" && (
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <PrivacyTabContent user={user} />
        </div>
      )}
    </div>
  );
}

function PrivacyTabContent({ user }: { user: User }) {
  const { t } = useTranslation();
  const [consent, setConsent] = useState<boolean>(false);
  const [stats, setStats] = useState<{ totalImages: number; imagesInRelease: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [showPrivacyDashboard, setShowPrivacyDashboard] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/dataset/status?nickname=${encodeURIComponent(user.account_id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!mounted || !data) return;
        setConsent(data.consentGiven === true);
        setStats({ totalImages: data.totalImages || 0, imagesInRelease: data.imagesInRelease || 0 });
        try {
          localStorage.setItem("bmo_dataset_consent", data.consentGiven ? "true" : "false");
        } catch {}
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
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-blue-50 p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="text-sm font-bold text-emerald-900 mb-1">🌍 Đóng góp cho Khoa học Mở</h4>
            <p className="text-xs text-emerald-800/80">
              Cho phép ảnh phân loại rác của bạn được đưa vào TDN-Waste-World — dataset mở phục vụ nghiên cứu toàn cầu.
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
                <div className="text-[10px] uppercase tracking-wider text-gray-600">Ảnh đã đóng góp</div>
              </div>
              <div className="bg-white/70 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-blue-700">{stats?.imagesInRelease || 0}</div>
                <div className="text-[10px] uppercase tracking-wider text-gray-600">Đã công khai</div>
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
        <h4 className="text-sm font-bold text-gray-900">🛡️ Cam kết của chúng tôi</h4>
        <ul className="text-xs text-gray-600 space-y-1.5 ml-4 list-disc">
          <li>Ảnh được xóa EXIF (GPS, model camera, timestamp) trước khi upload</li>
          <li>Bạn có thể thu hồi đồng ý bất kỳ lúc nào — dữ liệu sẽ bị ẩn khỏi các bản phát hành tương lai</li>
          <li>Mọi dataset phát hành đều dùng license CC-BY-4.0 (mã nguồn mở, ghi công)</li>
          <li>Người dùng dưới 13 tuổi: phải được phụ huynh đồng ý trước khi bật tính năng này</li>
          <li><strong>Federated Learning (Phase 2):</strong> ảnh KHÔNG BAO GIỜ rời khỏi thiết bị của bạn. Chỉ model updates (đã mã hóa + thêm nhiễu) mới được gửi về server.</li>
        </ul>
      </div>

      {/* Phase 2: Federated Learning transparency */}
      <button
        onClick={() => setShowPrivacyDashboard(true)}
        className="w-full rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-left text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300 dark:hover:bg-indigo-950/50"
      >
        🔍 Xem Trung tâm Quyền riêng tư →
        <span className="block text-[10px] font-normal opacity-70">
          BMO đã học gì từ bạn? Model version? DP ε/δ?
        </span>
      </button>

      {showContributeModal && (
        <ContributeToDataset
          nickname={user.account_id}
          isOpen={showContributeModal}
          onClose={() => setShowContributeModal(false)}
        />
      )}

      {showPrivacyDashboard && (
        <PrivacyDashboardWrapper
          userId={user.account_id}
          isOpen={showPrivacyDashboard}
          onClose={() => setShowPrivacyDashboard(false)}
        />
      )}
    </>
  );
}

function PrivacyDashboardWrapper({ userId, isOpen, onClose }: {
  userId: string; isOpen: boolean; onClose: () => void;
}) {
  const [Comp, setComp] = useState<React.ComponentType<any> | null>(null);
  useEffect(() => {
    let mounted = true;
    import("./PrivacyDashboard").then((m) => {
      if (mounted) setComp(() => m.PrivacyDashboard);
    });
    return () => { mounted = false; };
  }, []);
  if (!Comp) return null;
  return <Comp userId={userId} isOpen={isOpen} onClose={onClose} />;
}
