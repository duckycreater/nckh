import React, { useState } from "react";
import { User } from "../types";
import { ShieldCheck } from "lucide-react";

interface AuthProps {
  onLogin: (user: User) => void;
}

type ViewState = "login" | "register" | "changepass" | "forgot";

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
  const [regNick, setRegNick] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");

  // Change Password states
  const [cpNick, setCpNick] = useState("");
  const [cpOldPass, setCpOldPass] = useState("");
  const [cpNewPass, setCpNewPass] = useState("");

  // Forgot Password states
  const [fpEmail, setFpEmail] = useState("");

  // Check for remember token on mount
  React.useEffect(() => {
    const rememberToken = localStorage.getItem("remember_token");
    const rememberedNick = localStorage.getItem("remembered_nick");
    if (rememberToken && rememberedNick) {
      setLoginNick(rememberedNick);
      setRememberMe(true);
      setShowWelcomeBack(true);
    }
  }, []);

  const switchView = (newView: ViewState) => {
    setView(newView);
    setMessage(null);
  };

  const getPasswordStrength = (pass: string) => {
    if (pass.length === 0) return { color: "bg-gray-200", label: "", width: "0%" };
    if (pass.length < 6) return { color: "bg-red-500", label: "Yếu", width: "33%" };
    if (pass.length < 10 || !/[A-Z]/.test(pass) || !/[0-9]/.test(pass))
      return { color: "bg-yellow-500", label: "Trung bình", width: "66%" };
    return { color: "bg-green-500", label: "Mạnh", width: "100%" };
  };

  const strength = getPasswordStrength(regPass);

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
          const progressRes = await fetch("/api/user/" + data.account_id);
          const progressData = await progressRes.json();
          onLogin({
            nick: data.account_id,
            name: data.nickname,
            account_id: data.account_id,
            points: data.points,
            role: data.role,
            selectedAvatar: progressData.selectedAvatar ?? data.selectedAvatar,
            selectedFrame: progressData.selectedFrame ?? data.selectedFrame,
            customAvatarUrl: progressData.customAvatarUrl ?? data.customAvatarUrl,
            progress: progressData.progress || null,
          });
        } catch (e) {
          console.warn("[Auth] Failed to fetch user progress:", e);
          onLogin({
            nick: data.account_id,
            name: data.nickname,
            account_id: data.account_id,
            points: data.points,
            role: data.role,
            selectedAvatar: data.selectedAvatar,
            selectedFrame: data.selectedFrame,
            customAvatarUrl: data.customAvatarUrl,
          });
        }
      } else {
        setMessage({ text: data.message, type: "error" });
      }
    } catch {
      setMessage({ text: "Lỗi kết nối.", type: "error" });
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPass.length < 6) {
      setMessage({ text: "Mật khẩu phải có ít nhất 6 ký tự.", type: "error" });
      return;
    }
    if (regEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) {
      setMessage({ text: "Email không hợp lệ.", type: "error" });
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
          setRegNick("");
          setRegEmail("");
          setRegPass("");
          setMessage(null);
        }, 2000);
      } else {
        setMessage({ text: data.message, type: "error" });
      }
    } catch {
      setMessage({ text: "Lỗi kết nối.", type: "error" });
    }
    setLoading(false);
  };

  const handleChangePass = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cp_nickname: cpNick,
          cp_old_pass: cpOldPass,
          cp_new_pass: cpNewPass,
        }),
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
      setMessage({ text: "Lỗi kết nối.", type: "error" });
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fpEmail) {
      setMessage({ text: "Vui lòng nhập email hoặc tài khoản.", type: "error" });
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
        setMessage({ text: "Đã gửi liên kết khôi phục đến email của bạn.", type: "success" });
        setFpEmail("");
        setTimeout(() => setView("login"), 3000);
      } else {
        setMessage({ text: data.message || "Không tìm thấy tài khoản với email này.", type: "error" });
      }
    } catch {
      setMessage({ text: "Lỗi kết nối.", type: "error" });
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-[420px] bg-white/95 p-[30px] rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.6)] border-t-[6px] border-[#4CAF50] text-center relative max-h-[90vh] overflow-y-auto">
        {view === "login" && (
          <div className="animate-[fadeIn_0.4s_ease-out]">
            <h2 className="text-[#2E7D32] mt-0 mb-6 uppercase tracking-[1px] text-2xl font-bold">
              TRA CU UN DIEM
            </h2>

            {showWelcomeBack && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 font-medium">
                <ShieldCheck size={16} className="shrink-0" />
                <span>Chào mừng trở lại! Đăng nhập để tiếp tục.</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="text-left space-y-[15px]">
              <div>
                <label htmlFor="login-nick" className="font-bold text-[#374151] text-[13px] block mb-[5px]">
                  Tai khoan
                </label>
                <input
                  id="login-nick"
                  type="text"
                  required
                  autoComplete="username"
                  value={loginNick}
                  onChange={(e) => setLoginNick(e.target.value)}
                  className="w-full p-3 border-2 border-[#e0e0e0] rounded-lg text-[15px] bg-[#fafafa] transition-colors focus:border-[#4CAF50] focus:bg-white outline-none"
                />
              </div>
              <div>
                <label htmlFor="login-pass" className="font-bold text-[#374151] text-[13px] block mb-[5px]">
                  Mat khau
                </label>
                <input
                  id="login-pass"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="w-full p-3 border-2 border-[#e0e0e0] rounded-lg text-[15px] bg-[#fafafa] transition-colors focus:border-[#4CAF50] focus:bg-white outline-none"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-[#4B5563] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 accent-[#4CAF50] cursor-pointer"
                  />
                  Ghi nho dang nhap
                </label>
                <button
                  type="button"
                  onClick={() => switchView("forgot")}
                  className="text-sm text-[#4CAF50] font-semibold hover:underline cursor-pointer"
                >
                  Quen mat khau?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full p-3 bg-[#4CAF50] text-white border-none rounded-lg font-bold text-[16px] cursor-pointer mt-[10px] shadow-[0_4px_6px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-[2px] hover:shadow-[0_6px_12px_rgba(0,0,0,0.15)] disabled:bg-[#ccc] disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              >
                DANG NHAP
              </button>
            </form>
            <div className="mt-[15px] text-[14px] text-[#4B5563]">
              Chua co tai khoan?{" "}
              <button
                onClick={() => switchView("register")}
                className="text-[#2E7D32] font-bold underline-offset-2 hover:underline cursor-pointer"
              >
                Dang ky ngay
              </button>
              <br />
              <button
                onClick={() => switchView("changepass")}
                className="text-[12px] text-[#6B7280] block mt-[8px] mx-auto hover:underline cursor-pointer"
              >
                Doi mat khau?
              </button>
            </div>
          </div>
        )}

        {view === "register" && (
          <div className="animate-[fadeIn_0.4s_ease-out]">
            <h2 className="text-[#2E7D32] mt-0 mb-6 uppercase tracking-[1px] text-2xl font-bold">
              DANG KY MOI
            </h2>
            <form
              onSubmit={handleRegister}
              className="text-left space-y-[15px]"
            >
              <div>
                <label htmlFor="reg-name" className="font-bold text-[#374151] text-[13px] block mb-[5px]">
                  Ho va Ten hien thi
                </label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  aria-required="true"
                  aria-describedby="reg-name-hint"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="VD: Nguyen Van A"
                  className="w-full p-3 border-2 border-[#e0e0e0] rounded-lg text-[15px] bg-[#fafafa] transition-colors focus:border-[#4CAF50] focus:bg-white outline-none"
                />
                <p id="reg-name-hint" className="text-[11px] text-[#6B7280] mt-1">Ten nay se hien thi tren ho so cua ban.</p>
              </div>
              <div>
                <label htmlFor="reg-nick" className="font-bold text-[#374151] text-[13px] block mb-[5px]">
                  Tai khoan
                </label>
                <input
                  id="reg-nick"
                  type="text"
                  required
                  aria-required="true"
                  aria-describedby="reg-nick-hint"
                  value={regNick}
                  onChange={(e) => setRegNick(e.target.value)}
                  placeholder="VD: nguyenvana"
                  className="w-full p-3 border-2 border-[#e0e0e0] rounded-lg text-[15px] bg-[#fafafa] transition-colors focus:border-[#4CAF50] focus:bg-white outline-none"
                />
                <p id="reg-nick-hint" className="text-[11px] text-[#6B7280] mt-1">Dung de dang nhap. Khong the thay doi sau nay.</p>
              </div>
              <div>
                <label htmlFor="reg-email" className="font-bold text-[#374151] text-[13px] block mb-[5px]">
                  Email <span className="text-[#9CA3AF] font-normal">(tuychon)</span>
                </label>
                <input
                  id="reg-email"
                  type="email"
                  aria-required="false"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="VD: nguyenvana@email.com"
                  className="w-full p-3 border-2 border-[#e0e0e0] rounded-lg text-[15px] bg-[#fafafa] transition-colors focus:border-[#4CAF50] focus:bg-white outline-none"
                />
                <p className="text-[11px] text-[#6B7280] mt-1">Dung de khoi phuc tai khoan neu quen mat khau.</p>
              </div>
              <div>
                <label htmlFor="reg-pass" className="font-bold text-[#374151] text-[13px] block mb-[5px]">
                  Mat khau
                </label>
                <input
                  id="reg-pass"
                  type="password"
                  required
                  aria-required="true"
                  aria-describedby="reg-pass-strength"
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                  className="w-full p-3 border-2 border-[#e0e0e0] rounded-lg text-[15px] bg-[#fafafa] transition-colors focus:border-[#4CAF50] focus:bg-white outline-none"
                />
                {regPass.length > 0 && (
                  <div id="reg-pass-strength" className="mt-1.5">
                    <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strength.color} transition-all duration-300`}
                        style={{ width: strength.width }}
                      />
                    </div>
                    <p className={`text-xs mt-0.5 ${
                      strength.label === "Manh" ? "text-green-600" :
                      strength.label === "Trung binh" ? "text-yellow-600" :
                      "text-red-500"
                    }`}>
                      {strength.label}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-gray-100 space-y-3">
                <div className="text-center text-xs text-[#6B7280] font-medium">Hoac dang ky voi</div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-[#e0e0e0] rounded-lg bg-white text-[#374151] text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-[#e0e0e0] rounded-lg bg-white text-[#374151] text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full p-3 bg-[#FF9800] text-white border-none rounded-lg font-bold text-[16px] cursor-pointer mt-[10px] shadow-[0_4px_6px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-[2px] hover:shadow-[0_6px_12px_rgba(0,0,0,0.15)] disabled:bg-[#ccc] disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              >
                DANG KY
              </button>
            </form>
            <div className="mt-[15px] text-[14px] text-[#4B5563]">
              Da co tai khoan?{" "}
              <button
                onClick={() => switchView("login")}
                className="text-[#2E7D32] font-bold underline-offset-2 hover:underline cursor-pointer"
              >
                Quay lai dang nhap
              </button>
            </div>
          </div>
        )}

        {view === "changepass" && (
          <div className="animate-[fadeIn_0.4s_ease-out]">
            <h2 className="text-[#2E7D32] mt-0 mb-6 uppercase tracking-[1px] text-2xl font-bold">
              Doi Mat Khau
            </h2>
            <form
              onSubmit={handleChangePass}
              className="text-left space-y-[15px]"
            >
              <div>
                <label htmlFor="cp-nick" className="font-bold text-[#374151] text-[13px] block mb-[5px]">
                  Tai khoan
                </label>
                <input
                  id="cp-nick"
                  type="text"
                  required
                  autoComplete="username"
                  value={cpNick}
                  onChange={(e) => setCpNick(e.target.value)}
                  className="w-full p-3 border-2 border-[#e0e0e0] rounded-lg text-[15px] bg-[#fafafa] transition-colors focus:border-[#4CAF50] focus:bg-white outline-none"
                />
              </div>
              <div>
                <label htmlFor="cp-old-pass" className="font-bold text-[#374151] text-[13px] block mb-[5px]">
                  Mat khau cu
                </label>
                <input
                  id="cp-old-pass"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={cpOldPass}
                  onChange={(e) => setCpOldPass(e.target.value)}
                  className="w-full p-3 border-2 border-[#e0e0e0] rounded-lg text-[15px] bg-[#fafafa] transition-colors focus:border-[#4CAF50] focus:bg-white outline-none"
                />
              </div>
              <div>
                <label htmlFor="cp-new-pass" className="font-bold text-[#374151] text-[13px] block mb-[5px]">
                  Mat khau Moi
                </label>
                <input
                  id="cp-new-pass"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={cpNewPass}
                  onChange={(e) => setCpNewPass(e.target.value)}
                  className="w-full p-3 border-2 border-[#e0e0e0] rounded-lg text-[15px] bg-[#fafafa] transition-colors focus:border-[#4CAF50] focus:bg-white outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full p-3 bg-[#2196F3] text-white border-none rounded-lg font-bold text-[16px] cursor-pointer mt-[10px] shadow-[0_4px_6px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-[2px] hover:shadow-[0_6px_12px_rgba(0,0,0,0.15)] disabled:bg-[#ccc] disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              >
                Luu Thay Doi
              </button>
            </form>
            <div className="mt-[15px] text-[14px] text-[#4B5563]">
              <button
                onClick={() => switchView("login")}
                className="text-[#2E7D32] font-bold cursor-pointer hover:underline"
              >
                Quay lai
              </button>
            </div>
          </div>
        )}

        {view === "forgot" && (
          <div className="animate-[fadeIn_0.4s_ease-out]">
            <h2 className="text-[#2E7D32] mt-0 mb-6 uppercase tracking-[1px] text-2xl font-bold">
              Khoi Phuc Mat Khau
            </h2>
            <p className="text-sm text-[#6B7280] mb-6 text-left">
              Nhap email hoac tai khoan da dang ky. Chung toi se gui lien ket khoi phuc den email cua ban.
            </p>
            <form
              onSubmit={handleForgotPassword}
              className="text-left space-y-[15px]"
            >
              <div>
                <label htmlFor="fp-email" className="font-bold text-[#374151] text-[13px] block mb-[5px]">
                  Email hoac Tai khoan
                </label>
                <input
                  id="fp-email"
                  type="text"
                  required
                  aria-required="true"
                  value={fpEmail}
                  onChange={(e) => setFpEmail(e.target.value)}
                  placeholder="VD: nguyenvana@email.com"
                  className="w-full p-3 border-2 border-[#e0e0e0] rounded-lg text-[15px] bg-[#fafafa] transition-colors focus:border-[#4CAF50] focus:bg-white outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full p-3 bg-[#4CAF50] text-white border-none rounded-lg font-bold text-[16px] cursor-pointer shadow-[0_4px_6px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-[2px] hover:shadow-[0_6px_12px_rgba(0,0,0,0.15)] disabled:bg-[#ccc] disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              >
                Gui Lien Ket Khoi Phuc
              </button>
            </form>
            <div className="mt-[15px] text-[14px] text-[#4B5563]">
              <button
                onClick={() => switchView("login")}
                className="text-[#2E7D32] font-bold cursor-pointer hover:underline"
              >
                Quay lai dang nhap
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="mt-[15px] mx-auto w-[30px] h-[30px] border-[4px] border-[#f3f3f3] border-t-[#4CAF50] rounded-full animate-spin"></div>
        )}

        {message && !loading && (
          <div
            className={`mt-[15px] font-bold ${message.type === "success" ? "text-[#2E7D32]" : "text-[#d32f2f]"}`}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
