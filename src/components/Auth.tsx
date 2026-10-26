import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { User } from "../types";
import { Leaf, LockKeyhole, ScanLine, ShieldCheck, Sparkles } from "lucide-react";

interface AuthProps {
  onLogin: (user: User) => void;
}

type ViewState = "login" | "register" | "changepass" | "forgot" | "reset";

export function Auth({ onLogin }: AuthProps) {
  const [view, setView] = useState<ViewState>("login");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "error" | "success";
  } | null>(null);

  // Login states
  const [loginNick, setLoginNick] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);

  // Register states
  const [regName, setRegName] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regClassGrade, setRegClassGrade] = useState("");
  const [regNick, setRegNick] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");

  // Change Password states
  const [cpNick, setCpNick] = useState("");
  const [cpOldPass, setCpOldPass] = useState("");
  const [cpNewPass, setCpNewPass] = useState("");

  // Forgot Password states
  const [fpEmail, setFpEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");

  const { t, i18n } = useTranslation();
  const isVietnamese = i18n.resolvedLanguage?.startsWith("vi") ?? true;
  const productCopy = isVietnamese
    ? {
        title: "Nhận diện rác. Phản hồi ngay. Ghi nhận rõ ràng.",
        description:
          "BMO kết nối camera, mô hình nhận diện và hệ thống điểm để hướng dẫn học sinh phân loại rác.",
        features: [
          "Nhận diện loại rác từ camera hoặc hình ảnh",
          "Hướng dẫn bỏ đúng thùng và phản hồi tức thì",
          "Lưu lịch sử, điểm số và tiến bộ cá nhân",
        ],
        privacy: "Kết quả được ghi nhận theo tài khoản và thời gian thực.",
      }
    : {
        title: "Recognize waste. Respond instantly. Keep a clear record.",
        description:
          "BMO connects a camera, a recognition model and a points system to guide students through waste sorting.",
        features: [
          "Recognize waste from a camera or uploaded image",
          "Show the correct bin and give immediate feedback",
          "Keep personal history, points and progress",
        ],
        privacy: "Results are recorded by account and timestamp.",
      };

  // Check for remember token on mount
  React.useEffect(() => {
    const rememberToken = localStorage.getItem("remember_token");
    const rememberedNick = localStorage.getItem("remembered_nick");
    if (rememberToken && rememberedNick) {
      setLoginNick(rememberedNick);
      setRememberMe(true);
      setShowWelcomeBack(true);
    }
    const token = new URLSearchParams(window.location.search).get("reset_token");
    if (token) {
      setResetToken(token);
      setView("reset");
    }
  }, []);

  const switchView = (newView: ViewState) => {
    setView(newView);
    setMessage(null);
  };

  const getPasswordStrength = (pass: string, t: (key: string) => string) => {
    if (pass.length === 0) return { color: "bg-gray-200", label: "", width: "0%" };
    if (pass.length < 8)
      return { color: "bg-red-500", label: t("auth.strengthWeak"), width: "33%" };
    if (pass.length < 10 || !/[A-Z]/.test(pass) || !/[0-9]/.test(pass))
      return { color: "bg-yellow-500", label: t("auth.strengthMedium"), width: "66%" };
    return { color: "bg-green-500", label: t("auth.strengthStrong"), width: "100%" };
  };

  const strength = getPasswordStrength(regPass, t);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setShowWelcomeBack(false);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login_nickname: loginNick,
          login_password: loginPass,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.token) {
          localStorage.setItem("auth_token", data.token);
        }
        if (rememberMe) {
          localStorage.setItem("remember_token", "1");
          localStorage.setItem("remembered_nick", loginNick);
        } else {
          localStorage.removeItem("remember_token");
          localStorage.removeItem("remembered_nick");
        }
        try {
          const progressRes = await fetch("/api/user/" + data.account_id, {
            headers: { Authorization: `Bearer ${data.token}` },
          });
          const progressData = await progressRes.json();
          onLogin({
            nick: data.account_id,
            name: data.nickname,
            account_id: data.account_id,
            points: data.points,
            totalExpEarned: progressData.totalExpEarned ?? data.totalExpEarned ?? data.points,
            role: data.role,
            email: data.email ?? progressData.email,
            fullName: data.full_name ?? progressData.full_name ?? progressData.fullName,
            classGrade: data.class_grade ?? progressData.class_grade ?? progressData.classGrade,
            selectedAvatar: progressData.selectedAvatar ?? data.selectedAvatar,
            selectedFrame: progressData.selectedFrame ?? data.selectedFrame,
            customAvatarUrl: progressData.customAvatarUrl ?? data.customAvatarUrl,
            progress: progressData.progress || null,
            lastWheelClaimDate:
              progressData.lastWheelClaimDate ?? data.lastWheelClaimDate ?? undefined,
            claimedStreakGifts: progressData.claimedStreakGifts ?? data.claimedStreakGifts ?? [],
          });
        } catch (e) {
          console.warn("[Auth] Failed to fetch user progress:", e);
          onLogin({
            nick: data.account_id,
            name: data.nickname,
            account_id: data.account_id,
            points: data.points,
            totalExpEarned: data.totalExpEarned ?? data.points,
            role: data.role,
            email: data.email,
            fullName: data.full_name,
            classGrade: data.class_grade,
            selectedAvatar: data.selectedAvatar,
            selectedFrame: data.selectedFrame,
            customAvatarUrl: data.customAvatarUrl,
            lastWheelClaimDate: data.lastWheelClaimDate ?? undefined,
            claimedStreakGifts: data.claimedStreakGifts ?? [],
          });
        }
      } else {
        setMessage({ text: data.message, type: "error" });
      }
    } catch {
      setMessage({ text: t("auth.connectionError"), type: "error" });
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPass.length < 8) {
      setMessage({ text: t("auth.passwordMinChars"), type: "error" });
      return;
    }
    if (regEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) {
      setMessage({ text: t("auth.invalidEmail"), type: "error" });
      return;
    }
    if (!regName.trim()) {
      setMessage({ text: t("auth.displayNameHint"), type: "error" });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reg_name: regName,
          reg_full_name: regFullName,
          reg_class_grade: regClassGrade,
          reg_nickname: regNick,
          reg_password: regPass,
          reg_email: regEmail,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: data.message, type: "success" });
        setTimeout(() => {
          setView("login");
          setLoginNick(regNick);
          setRegName("");
          setRegFullName("");
          setRegClassGrade("");
          setRegNick("");
          setRegEmail("");
          setRegPass("");
          setMessage(null);
        }, 2000);
      } else {
        setMessage({ text: data.message, type: "error" });
      }
    } catch {
      setMessage({ text: t("auth.connectionError"), type: "error" });
    }
    setLoading(false);
  };

  const handleChangePass = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    let temporaryToken = "";
    try {
      const loginResponse = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login_nickname: cpNick,
          login_password: cpOldPass,
        }),
      });
      const loginData = await loginResponse.json();
      if (!loginResponse.ok || !loginData.success || !loginData.token) {
        setMessage({ text: loginData.message || t("auth.accountNotFound"), type: "error" });
        setLoading(false);
        return;
      }
      temporaryToken = loginData.token;

      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${temporaryToken}`,
        },
        body: JSON.stringify({ cp_old_pass: cpOldPass, cp_new_pass: cpNewPass }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: data.message, type: "success" });
        setCpNick("");
        setCpOldPass("");
        setCpNewPass("");
      } else {
        setMessage({ text: data.message, type: "error" });
      }
    } catch {
      setMessage({ text: t("auth.connectionError"), type: "error" });
    } finally {
      if (temporaryToken) {
        void fetch("/api/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${temporaryToken}` },
        });
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fpEmail) {
      setMessage({ text: t("auth.fillAccount"), type: "error" });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: fpEmail }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: t("auth.resetLinkSent"), type: "success" });
        setFpEmail("");
        setTimeout(() => setView("login"), 3000);
      } else {
        setMessage({ text: data.message || t("auth.accountNotFound"), type: "error" });
      }
    } catch {
      setMessage({ text: t("auth.connectionError"), type: "error" });
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetPassword !== resetPasswordConfirm) {
      setMessage({ text: t("settings.passwordMismatch"), type: "error" });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, newPassword: resetPassword }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setMessage({ text: data.message || t("auth.connectionError"), type: "error" });
      } else {
        setMessage({ text: data.message, type: "success" });
        setResetPassword("");
        setResetPasswordConfirm("");
        window.history.replaceState({}, "", window.location.pathname);
        setTimeout(() => {
          setView("login");
          setMessage(null);
        }, 2000);
      }
    } catch {
      setMessage({ text: t("auth.connectionError"), type: "error" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-5 sm:px-8 lg:py-8">
      <div className="mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-6xl overflow-hidden rounded-[14px] border border-[var(--border-strong)] bg-[var(--surface)] lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[minmax(0,1.08fr)_minmax(390px,0.72fr)]">
        <section className="relative hidden overflow-hidden bg-[var(--graphite)] px-10 py-12 text-white lg:flex lg:min-h-[690px] lg:flex-col lg:justify-center">
          <div className="scan-grid pointer-events-none absolute inset-0 opacity-50" />
          <div className="pointer-events-none absolute bottom-10 right-10 grid w-60 grid-cols-3 gap-2 opacity-80">
            {(["plastic", "paper", "glass", "metal", "organic", "hazard"] as const).map((category, index) => (
              <div key={category} data-material={category} className={`material-pattern material-${category} h-20 rounded-[8px] border border-white/15 ${index === 0 || index === 5 ? "col-span-2" : ""}`} />
            ))}
          </div>
          <div className="relative z-10 flex h-full flex-col justify-center">
            <div className="mb-8 flex items-center gap-3">
              <div className="material-pattern material-organic flex h-11 w-11 items-center justify-center rounded-[8px] border border-white/20" data-material="organic">
                <Leaf size={26} aria-hidden="true" />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight">BMO Material Lab</p>
              </div>
            </div>
            <h1 className="max-w-xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] xl:text-5xl">
              {productCopy.title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#bdc7c1]">
              {productCopy.description}
            </p>

            <div className="mt-8 grid max-w-lg gap-3">
              {productCopy.features.map((feature, index) => {
                const FeatureIcon = [ScanLine, ShieldCheck, Sparkles][index];
                return (
                  <div key={feature} className="flex items-center gap-3 text-sm font-medium text-[#d9dfdb]">
                    <span className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-white/15 bg-white/[0.04] text-[var(--signal)]">
                      <FeatureIcon size={18} aria-hidden="true" />
                    </span>
                    <span>{feature}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-9 flex items-center gap-2 text-xs text-[#8f9d95]">
              <LockKeyhole size={15} aria-hidden="true" />
              <span>{productCopy.privacy}</span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-h-[calc(100vh-2.5rem)] w-full max-w-[470px] overflow-y-auto bg-[var(--surface)] p-6 text-center sm:p-9 lg:max-h-[calc(100vh-4rem)]">
          <div className="mb-6 flex items-center justify-center gap-3 lg:hidden">
            <div className="material-pattern material-organic flex h-10 w-10 items-center justify-center rounded-[8px] text-white" data-material="organic">
              <Leaf size={22} aria-hidden="true" />
            </div>
            <div className="text-left">
              <p className="font-semibold leading-tight text-[var(--graphite)]">BMO Material Lab</p>
            </div>
          </div>
          {view === "login" && (
            <div className="animate-[fadeIn_0.4s_ease-out]">
              <h2 className="mt-0 text-2xl font-semibold tracking-[-0.025em] text-[var(--graphite)]">
                {t("auth.lookupScore")}
              </h2>
              <p className="mb-6 mt-2 text-sm leading-6 text-slate-500">
                {isVietnamese
                  ? "Tiếp tục hành trình phân loại rác và theo dõi tác động của bạn."
                  : "Continue your waste-sorting journey and track your impact."}
              </p>

              {showWelcomeBack && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 font-medium">
                  <ShieldCheck size={16} className="shrink-0" />
                  <span>{t("auth.welcomeBack")}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="text-left space-y-[15px]">
                <div>
                  <label
                    htmlFor="login-nick"
                    className="font-bold text-[var(--text-secondary)] text-[13px] block mb-[5px]"
                  >
                    {t("auth.account")}
                  </label>
                  <input
                    id="login-nick"
                    type="text"
                    required
                    autoComplete="username"
                    value={loginNick}
                    onChange={(e) => setLoginNick(e.target.value)}
                    className="w-full p-3 border-2 border-[var(--border-subtle)] rounded-lg text-[15px] bg-[var(--surface-muted)] transition-colors focus:border-[var(--text-muted)] focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="login-pass"
                    className="font-bold text-[var(--text-secondary)] text-[13px] block mb-[5px]"
                  >
                    {t("auth.password")}
                  </label>
                  <input
                    id="login-pass"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    className="w-full p-3 border-2 border-[var(--border-subtle)] rounded-lg text-[15px] bg-[var(--surface-muted)] transition-colors focus:border-[var(--text-muted)] focus:bg-white outline-none"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 accent-[var(--text-muted)] cursor-pointer"
                    />
                    {t("auth.rememberLogin")}
                  </label>
                  <button
                    type="button"
                    onClick={() => switchView("forgot")}
                    className="text-sm text-[var(--text-muted)] font-semibold hover:underline cursor-pointer"
                  >
                    {t("auth.forgotPassword")}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full p-3 bg-[var(--text-muted)] text-white border-none rounded-lg font-bold text-[16px] cursor-pointer mt-[10px] shadow-[0_4px_6px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-[2px] hover:shadow-[0_6px_12px_rgba(0,0,0,0.15)] disabled:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                >
                  {t("auth.login")}
                </button>
              </form>
              <div className="mt-[15px] text-[14px] text-[var(--text-secondary)]">
                {t("auth.noAccount")}{" "}
                <button
                  onClick={() => switchView("register")}
                  className="text-[var(--primary-strong)] font-bold underline-offset-2 hover:underline cursor-pointer"
                >
                  {t("auth.registerNow")}
                </button>
                <br />
                <button
                  onClick={() => switchView("changepass")}
                  className="text-[12px] text-[var(--text-muted)] block mt-[8px] mx-auto hover:underline cursor-pointer"
                >
                  {t("auth.changePassword")}
                </button>
              </div>
            </div>
          )}

          {view === "register" && (
            <div className="animate-[fadeIn_0.4s_ease-out]">
              <h2 className="text-[var(--primary-strong)] mt-0 mb-6 uppercase tracking-[1px] text-2xl font-bold">
                {t("auth.registerTitle")}
              </h2>
              <form onSubmit={handleRegister} className="text-left space-y-[15px]">
                <div>
                  <label
                    htmlFor="reg-name"
                    className="font-bold text-[var(--text-secondary)] text-[13px] block mb-[5px]"
                  >
                    {t("auth.displayName")}
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    required
                    aria-required="true"
                    aria-describedby="reg-name-hint"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder={t("auth.displayNamePlaceholder")}
                    className="w-full p-3 border-2 border-[var(--border-subtle)] rounded-lg text-[15px] bg-[var(--surface-muted)] transition-colors focus:border-[var(--text-muted)] focus:bg-white outline-none"
                  />
                  <p id="reg-name-hint" className="text-[11px] text-[var(--text-muted)] mt-1">
                    {t("auth.displayNameHint")}
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="reg-full-name"
                    className="font-bold text-[var(--text-secondary)] text-[13px] block mb-[5px]"
                  >
                    {t("auth.fullName")}
                  </label>
                  <input
                    id="reg-full-name"
                    type="text"
                    aria-required="false"
                    aria-describedby="reg-full-name-hint"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder={t("auth.fullNamePlaceholder")}
                    className="w-full p-3 border-2 border-[var(--border-subtle)] rounded-lg text-[15px] bg-[var(--surface-muted)] transition-colors focus:border-[var(--text-muted)] focus:bg-white outline-none"
                  />
                  <p id="reg-full-name-hint" className="text-[11px] text-[var(--text-muted)] mt-1">
                    {t("auth.fullNameHint")}
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="reg-class"
                    className="font-bold text-[var(--text-secondary)] text-[13px] block mb-[5px]"
                  >
                    {t("auth.classGrade")}
                  </label>
                  <select
                    id="reg-class"
                    aria-required="false"
                    aria-describedby="reg-class-hint"
                    value={regClassGrade}
                    onChange={(e) => setRegClassGrade(e.target.value)}
                    className="w-full p-3 border-2 border-[var(--border-subtle)] rounded-lg text-[15px] bg-[var(--surface-muted)] transition-colors focus:border-[var(--text-muted)] focus:bg-white outline-none appearance-none cursor-pointer"
                  >
                    <option value="">{t("auth.classGradePlaceholder")}</option>
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={String(i + 1)}>
                        Lớp {i + 1}
                      </option>
                    ))}
                  </select>
                  <p id="reg-class-hint" className="text-[11px] text-[var(--text-muted)] mt-1">
                    {t("auth.classGradeHint")}
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="reg-nick"
                    className="font-bold text-[var(--text-secondary)] text-[13px] block mb-[5px]"
                  >
                    {t("auth.username")}
                  </label>
                  <input
                    id="reg-nick"
                    type="text"
                    required
                    aria-required="true"
                    aria-describedby="reg-nick-hint"
                    value={regNick}
                    onChange={(e) => setRegNick(e.target.value)}
                    placeholder={t("auth.usernamePlaceholder")}
                    className="w-full p-3 border-2 border-[var(--border-subtle)] rounded-lg text-[15px] bg-[var(--surface-muted)] transition-colors focus:border-[var(--text-muted)] focus:bg-white outline-none"
                  />
                  <p id="reg-nick-hint" className="text-[11px] text-[var(--text-muted)] mt-1">
                    {t("auth.usernameHint")}
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="reg-email"
                    className="font-bold text-[var(--text-secondary)] text-[13px] block mb-[5px]"
                  >
                    {t("auth.emailOptional")}
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    aria-required="false"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder={t("auth.emailPlaceholder")}
                    className="w-full p-3 border-2 border-[var(--border-subtle)] rounded-lg text-[15px] bg-[var(--surface-muted)] transition-colors focus:border-[var(--text-muted)] focus:bg-white outline-none"
                  />
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">{t("auth.emailHint")}</p>
                </div>
                <div>
                  <label
                    htmlFor="reg-pass"
                    className="font-bold text-[var(--text-secondary)] text-[13px] block mb-[5px]"
                  >
                    {t("auth.password")}
                  </label>
                  <input
                    id="reg-pass"
                    type="password"
                    required
                    minLength={8}
                    maxLength={128}
                    aria-required="true"
                    aria-describedby="reg-pass-strength"
                    value={regPass}
                    onChange={(e) => setRegPass(e.target.value)}
                    className="w-full p-3 border-2 border-[var(--border-subtle)] rounded-lg text-[15px] bg-[var(--surface-muted)] transition-colors focus:border-[var(--text-muted)] focus:bg-white outline-none"
                  />
                  {regPass.length > 0 && (
                    <div id="reg-pass-strength" className="mt-1.5">
                      <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${strength.color} transition-all duration-300`}
                          style={{ width: strength.width }}
                        />
                      </div>
                      <p
                        className={`text-xs mt-0.5 ${
                          strength.label === t("auth.strengthStrong")
                            ? "text-green-600"
                            : strength.label === t("auth.strengthMedium")
                              ? "text-yellow-600"
                              : "text-red-500"
                        }`}
                      >
                        {strength.label}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full p-3 bg-[var(--primary)] text-white border-none rounded-lg font-bold text-[16px] cursor-pointer mt-[10px] shadow-[0_4px_6px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-[2px] hover:shadow-[0_6px_12px_rgba(0,0,0,0.15)] disabled:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                >
                  {t("auth.register")}
                </button>
              </form>
              <div className="mt-[15px] text-[14px] text-[var(--text-secondary)]">
                {t("auth.hasAccount")}{" "}
                <button
                  onClick={() => switchView("login")}
                  className="text-[var(--primary-strong)] font-bold underline-offset-2 hover:underline cursor-pointer"
                >
                  {t("auth.backToLogin")}
                </button>
              </div>
            </div>
          )}

          {view === "changepass" && (
            <div className="animate-[fadeIn_0.4s_ease-out]">
              <h2 className="text-[var(--primary-strong)] mt-0 mb-6 uppercase tracking-[1px] text-2xl font-bold">
                {t("auth.changePassword")}
              </h2>
              <form onSubmit={handleChangePass} className="text-left space-y-[15px]">
                <div>
                  <label
                    htmlFor="cp-nick"
                    className="font-bold text-[var(--text-secondary)] text-[13px] block mb-[5px]"
                  >
                    {t("auth.account")}
                  </label>
                  <input
                    id="cp-nick"
                    type="text"
                    required
                    autoComplete="username"
                    value={cpNick}
                    onChange={(e) => setCpNick(e.target.value)}
                    className="w-full p-3 border-2 border-[var(--border-subtle)] rounded-lg text-[15px] bg-[var(--surface-muted)] transition-colors focus:border-[var(--text-muted)] focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cp-old-pass"
                    className="font-bold text-[var(--text-secondary)] text-[13px] block mb-[5px]"
                  >
                    {t("settings.oldPassword")}
                  </label>
                  <input
                    id="cp-old-pass"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={cpOldPass}
                    onChange={(e) => setCpOldPass(e.target.value)}
                    className="w-full p-3 border-2 border-[var(--border-subtle)] rounded-lg text-[15px] bg-[var(--surface-muted)] transition-colors focus:border-[var(--text-muted)] focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cp-new-pass"
                    className="font-bold text-[var(--text-secondary)] text-[13px] block mb-[5px]"
                  >
                    {t("settings.newPassword")}
                  </label>
                  <input
                    id="cp-new-pass"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={cpNewPass}
                    onChange={(e) => setCpNewPass(e.target.value)}
                    className="w-full p-3 border-2 border-[var(--border-subtle)] rounded-lg text-[15px] bg-[var(--surface-muted)] transition-colors focus:border-[var(--text-muted)] focus:bg-white outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full p-3 bg-[var(--accent)] text-white border-none rounded-lg font-bold text-[16px] cursor-pointer mt-[10px] shadow-[0_4px_6px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-[2px] hover:shadow-[0_6px_12px_rgba(0,0,0,0.15)] disabled:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                >
                  {t("common.save")}
                </button>
              </form>
              <div className="mt-[15px] text-[14px] text-[var(--text-secondary)]">
                <button
                  onClick={() => switchView("login")}
                  className="text-[var(--primary-strong)] font-bold cursor-pointer hover:underline"
                >
                  {t("common.back")}
                </button>
              </div>
            </div>
          )}

          {view === "forgot" && (
            <div className="animate-[fadeIn_0.4s_ease-out]">
              <h2 className="text-[var(--primary-strong)] mt-0 mb-6 uppercase tracking-[1px] text-2xl font-bold">
                {t("auth.resetTitle")}
              </h2>
              <p className="text-sm text-[var(--text-muted)] mb-6 text-left">
                {t("auth.resetSubtitle")}
              </p>
              <form onSubmit={handleForgotPassword} className="text-left space-y-[15px]">
                <div>
                  <label
                    htmlFor="fp-email"
                    className="font-bold text-[var(--text-secondary)] text-[13px] block mb-[5px]"
                  >
                    {t("auth.emailOrUsername")}
                  </label>
                  <input
                    id="fp-email"
                    type="text"
                    required
                    aria-required="true"
                    value={fpEmail}
                    onChange={(e) => setFpEmail(e.target.value)}
                    placeholder={t("auth.emailOrUsernamePlaceholder")}
                    className="w-full p-3 border-2 border-[var(--border-subtle)] rounded-lg text-[15px] bg-[var(--surface-muted)] transition-colors focus:border-[var(--text-muted)] focus:bg-white outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full p-3 bg-[var(--text-muted)] text-white border-none rounded-lg font-bold text-[16px] cursor-pointer shadow-[0_4px_6px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-[2px] hover:shadow-[0_6px_12px_rgba(0,0,0,0.15)] disabled:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                >
                  {t("auth.sendResetLink")}
                </button>
              </form>
              <div className="mt-[15px] text-[14px] text-[var(--text-secondary)]">
                <button
                  onClick={() => switchView("login")}
                  className="text-[var(--primary-strong)] font-bold cursor-pointer hover:underline"
                >
                  {t("auth.backToLogin2")}
                </button>
              </div>
            </div>
          )}

          {view === "reset" && (
            <div className="animate-[fadeIn_0.4s_ease-out]">
              <h2 className="text-[var(--primary-strong)] mt-0 mb-6 uppercase tracking-[1px] text-2xl font-bold">
                {t("auth.resetTitle")}
              </h2>
              <form onSubmit={handleResetPassword} className="text-left space-y-[15px]">
                <div>
                  <label
                    htmlFor="reset-new-password"
                    className="font-bold text-[var(--text-secondary)] text-[13px] block mb-[5px]"
                  >
                    {t("settings.newPassword")}
                  </label>
                  <input
                    id="reset-new-password"
                    type="password"
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    value={resetPassword}
                    onChange={(event) => setResetPassword(event.target.value)}
                    className="w-full p-3 border-2 border-[var(--border-subtle)] rounded-lg text-[15px] bg-[var(--surface-muted)] transition-colors focus:border-[var(--text-muted)] focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="reset-confirm-password"
                    className="font-bold text-[var(--text-secondary)] text-[13px] block mb-[5px]"
                  >
                    {t("settings.confirmPassword")}
                  </label>
                  <input
                    id="reset-confirm-password"
                    type="password"
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    value={resetPasswordConfirm}
                    onChange={(event) => setResetPasswordConfirm(event.target.value)}
                    className="w-full p-3 border-2 border-[var(--border-subtle)] rounded-lg text-[15px] bg-[var(--surface-muted)] transition-colors focus:border-[var(--text-muted)] focus:bg-white outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !resetToken}
                  className="w-full p-3 bg-[var(--text-muted)] text-white border-none rounded-lg font-bold text-[16px] cursor-pointer shadow-[0_4px_6px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-[2px] hover:shadow-[0_6px_12px_rgba(0,0,0,0.15)] disabled:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                >
                  {t("common.save")}
                </button>
              </form>
              <div className="mt-[15px] text-[14px] text-[var(--text-secondary)]">
                <button
                  onClick={() => switchView("login")}
                  className="text-[var(--primary-strong)] font-bold cursor-pointer hover:underline"
                >
                  {t("auth.backToLogin2")}
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="mt-[15px] mx-auto w-[30px] h-[30px] border-[4px] border-[var(--surface-soft)] border-t-[var(--text-muted)] rounded-full animate-spin"></div>
          )}

          {message && !loading && (
            <div
              className={`mt-[15px] font-bold ${message.type === "success" ? "text-[var(--primary-strong)]" : "text-[var(--danger)]"}`}
            >
              {message.text}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
