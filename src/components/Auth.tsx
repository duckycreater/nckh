import React, { useState } from "react";
import { User } from "../types";

interface AuthProps {
  onLogin: (user: User) => void;
}

type ViewState = "login" | "register" | "changepass";

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

  // Register states
  const [regName, setRegName] = useState("");
  const [regNick, setRegNick] = useState("");
  const [regPass, setRegPass] = useState("");

  // Change Password states
  const [cpNick, setCpNick] = useState("");
  const [cpOldPass, setCpOldPass] = useState("");
  const [cpNewPass, setCpNewPass] = useState("");

  const switchView = (newView: ViewState) => {
    setView(newView);
    setMessage(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
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
        // Store session token
        if (data.token) {
          localStorage.setItem("auth_token", data.token);
        }
        // Fetch full progress after login
        try {
          const progressRes = await fetch(`/api/user/${data.account_id}`);
          const progressData = await progressRes.json();
          onLogin({
            nick: data.account_id,
            name: data.nickname,
            account_id: data.account_id,
            points: data.points,
            role: data.role,
            selectedAvatar: data.selectedAvatar,
            selectedFrame: data.selectedFrame,
            progress: progressData.progress || null,
          });
        } catch {
          onLogin({
            nick: data.account_id,
            name: data.nickname,
            account_id: data.account_id,
            points: data.points,
            role: data.role,
            selectedAvatar: data.selectedAvatar,
            selectedFrame: data.selectedFrame,
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

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-[420px] bg-white/95 p-[30px] rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.6)] border-t-[6px] border-[#4CAF50] text-center relative max-h-[90vh] overflow-y-auto">
        {view === "login" && (
          <div className="animate-[fadeIn_0.4s_ease-out]">
            <h2 className="text-[#2E7D32] mt-0 mb-6 uppercase tracking-[1px] text-2xl font-bold">
              ♻️ TRA CỨU ĐIỂM
            </h2>
            <form onSubmit={handleLogin} className="text-left space-y-[15px]">
              <div>
                <label className="font-bold text-[#444] text-[13px] block mb-[5px]">
                  Tài khoản
                </label>
                <input
                  type="text"
                  required
                  value={loginNick}
                  onChange={(e) => setLoginNick(e.target.value)}
                  className="w-full p-3 border-2 border-[#e0e0e0] rounded-lg text-[15px] bg-[#fafafa] transition-colors focus:border-[#4CAF50] focus:bg-white outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-[#444] text-[13px] block mb-[5px]">
                  Mật khẩu
                </label>
                <input
                  type="password"
                  required
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="w-full p-3 border-2 border-[#e0e0e0] rounded-lg text-[15px] bg-[#fafafa] transition-colors focus:border-[#4CAF50] focus:bg-white outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full p-3 bg-[#4CAF50] text-white border-none rounded-lg font-bold text-[16px] cursor-pointer mt-[10px] shadow-[0_4px_6px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-[2px] hover:shadow-[0_6px_12px_rgba(0,0,0,0.15)] disabled:bg-[#ccc] disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              >
                ĐĂNG NHẬP
              </button>
            </form>
            <div className="mt-[15px] text-[14px] text-[#666]">
              Chưa có tài khoản?{" "}
              <button
                onClick={() => switchView("register")}
                className="text-[#2E7D32] font-bold underline-offset-2 hover:underline cursor-pointer"
              >
                Đăng ký ngay
              </button>
              <br />
              <button
                onClick={() => switchView("changepass")}
                className="text-[12px] text-[#757575] block mt-[8px] mx-auto hover:underline cursor-pointer"
              >
                Đổi mật khẩu?
              </button>
            </div>
          </div>
        )}

        {view === "register" && (
          <div className="animate-[fadeIn_0.4s_ease-out]">
            <h2 className="text-[#2E7D32] mt-0 mb-6 uppercase tracking-[1px] text-2xl font-bold">
              📝 ĐĂNG KÝ MỚI
            </h2>
            <form
              onSubmit={handleRegister}
              className="text-left space-y-[15px]"
            >
              <div>
                <label className="font-bold text-[#444] text-[13px] block mb-[5px]">
                  Họ và Tên hiển thị
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full p-3 border-2 border-[#e0e0e0] rounded-lg text-[15px] bg-[#fafafa] transition-colors focus:border-[#4CAF50] focus:bg-white outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-[#444] text-[13px] block mb-[5px]">
                  Tài khoản
                </label>
                <input
                  type="text"
                  required
                  value={regNick}
                  onChange={(e) => setRegNick(e.target.value)}
                  className="w-full p-3 border-2 border-[#e0e0e0] rounded-lg text-[15px] bg-[#fafafa] transition-colors focus:border-[#4CAF50] focus:bg-white outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-[#444] text-[13px] block mb-[5px]">
                  Mật khẩu
                </label>
                <input
                  type="password"
                  required
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                  className="w-full p-3 border-2 border-[#e0e0e0] rounded-lg text-[15px] bg-[#fafafa] transition-colors focus:border-[#4CAF50] focus:bg-white outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full p-3 bg-[#FF9800] text-white border-none rounded-lg font-bold text-[16px] cursor-pointer mt-[10px] shadow-[0_4px_6px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-[2px] hover:shadow-[0_6px_12px_rgba(0,0,0,0.15)] disabled:bg-[#ccc] disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              >
                ĐĂNG KÝ
              </button>
            </form>
            <div className="mt-[15px] text-[14px] text-[#666]">
              Đã có tài khoản?{" "}
              <button
                onClick={() => switchView("login")}
                className="text-[#2E7D32] font-bold underline-offset-2 hover:underline cursor-pointer"
              >
                Quay lại đăng nhập
              </button>
            </div>
          </div>
        )}

        {view === "changepass" && (
          <div className="animate-[fadeIn_0.4s_ease-out]">
            <h2 className="text-[#2E7D32] mt-0 mb-6 uppercase tracking-[1px] text-2xl font-bold">
              🔐 ĐỔI MẬT KHẨU
            </h2>
            <form
              onSubmit={handleChangePass}
              className="text-left space-y-[15px]"
            >
              <div>
                <label className="font-bold text-[#444] text-[13px] block mb-[5px]">
                  Tài khoản
                </label>
                <input
                  type="text"
                  required
                  value={cpNick}
                  onChange={(e) => setCpNick(e.target.value)}
                  className="w-full p-3 border-2 border-[#e0e0e0] rounded-lg text-[15px] bg-[#fafafa] transition-colors focus:border-[#4CAF50] focus:bg-white outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-[#444] text-[13px] block mb-[5px]">
                  Mật khẩu cũ
                </label>
                <input
                  type="password"
                  required
                  value={cpOldPass}
                  onChange={(e) => setCpOldPass(e.target.value)}
                  className="w-full p-3 border-2 border-[#e0e0e0] rounded-lg text-[15px] bg-[#fafafa] transition-colors focus:border-[#4CAF50] focus:bg-white outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-[#444] text-[13px] block mb-[5px]">
                  Mật khẩu MỚI
                </label>
                <input
                  type="password"
                  required
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
                LƯU THAY ĐỔI
              </button>
            </form>
            <div className="mt-[15px] text-[14px] text-[#666]">
              <button
                onClick={() => switchView("login")}
                className="text-[#2E7D32] font-bold cursor-pointer hover:underline"
              >
                ⬅ Quay lại
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
