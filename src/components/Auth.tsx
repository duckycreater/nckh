import React, { useState } from "react";
import { ArrowRight, KeyRound, LogIn, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { User } from "../types";
import { Badge, Button, Card, FieldLabel, Input } from "../lib/ui";

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

  const [loginNick, setLoginNick] = useState("");
  const [loginPass, setLoginPass] = useState("");

  const [regName, setRegName] = useState("");
  const [regNick, setRegNick] = useState("");
  const [regPass, setRegPass] = useState("");

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
        if (data.token) {
          localStorage.setItem("auth_token", data.token);
        }
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
        }, 1800);
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

  const title = view === "login" ? "Đăng nhập để tiếp tục" : view === "register" ? "Tạo tài khoản mới" : "Khôi phục quyền truy cập";
  const subtitle = view === "login"
    ? "Theo dõi điểm thưởng, hồ sơ và hành trình phân loại rác của bạn trong một trải nghiệm mượt mà hơn."
    : view === "register"
    ? "Tạo tài khoản mới trong vài giây để bắt đầu tích điểm và mở khoá phần thưởng."
    : "Đổi mật khẩu để giữ an toàn cho tài khoản và quay lại ngay.";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,143,104,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(85,105,255,0.12),transparent_24%)]" />

      <div className="relative z-10 grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="hidden min-h-[640px] overflow-hidden bg-slate-950 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="relative h-full overflow-hidden rounded-[28px] bg-[linear-gradient(145deg,#0f1720,#122b26_45%,#123d31)] p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(110,231,183,0.18),transparent_26%)]" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="space-y-5">
                <Badge tone="success" className="bg-white/10 text-white border-white/10">Nền tảng phân loại rác thông minh</Badge>
                <div className="space-y-3">
                  <h1 className="max-w-lg text-4xl font-black leading-tight tracking-tight">Trải nghiệm xanh tinh tế, rõ ràng và đáng tin cậy hơn cho mọi người dùng.</h1>
                  <p className="max-w-xl text-base leading-7 text-slate-200/82">
                    Theo dõi hành trình học tập, phân loại rác, tích điểm và quản lý hồ sơ trong một giao diện gọn gàng, hiện đại, dễ dùng ngay từ lần đầu tiên.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { icon: <Sparkles className="h-5 w-5" />, title: "Mượt hơn", desc: "Ít rối mắt, rõ hành động chính, phản hồi trạng thái tốt hơn." },
                  { icon: <ShieldCheck className="h-5 w-5" />, title: "Tin cậy hơn", desc: "Luồng tài khoản, mật khẩu, profile và avatar trực quan hơn." },
                  { icon: <ArrowRight className="h-5 w-5" />, title: "Nhanh hơn", desc: "Vào đúng nơi bạn cần, giảm thao tác thừa ở các flow chính." },
                ].map((item) => (
                  <div key={item.title} className="rounded-[24px] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                    <div className="mb-3 inline-flex rounded-full bg-white/10 p-2 text-emerald-200">{item.icon}</div>
                    <p className="font-black text-white">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-200/75">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="glass-panel mx-auto w-full max-w-[460px] overflow-hidden rounded-[32px] p-0">
          <div className="border-b border-slate-100 px-6 pb-4 pt-6 sm:px-8">
            <Badge tone="accent">BMO Robot</Badge>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
          </div>

          <div className="px-6 py-6 sm:px-8 sm:py-7">
            <div className="mb-6 flex gap-2 rounded-[20px] bg-slate-100 p-1">
              {[
                { id: "login", label: "Đăng nhập" },
                { id: "register", label: "Đăng ký" },
                { id: "changepass", label: "Mật khẩu" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => switchView(tab.id as ViewState)}
                  className={`flex-1 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all ${
                    view === tab.id ? "bg-white text-emerald-700 shadow-[var(--shadow-soft)]" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {view === "login" && (
              <form onSubmit={handleLogin} className="animate-[fadeIn_0.35s_ease-out] space-y-4">
                <div>
                  <FieldLabel>Tài khoản</FieldLabel>
                  <Input required value={loginNick} onChange={(e) => setLoginNick(e.target.value)} placeholder="Nhập tài khoản của bạn" />
                </div>
                <div>
                  <FieldLabel>Mật khẩu</FieldLabel>
                  <Input type="password" required value={loginPass} onChange={(e) => setLoginPass(e.target.value)} placeholder="Nhập mật khẩu" />
                </div>
                <Button type="submit" loading={loading} size="lg" className="w-full">
                  <LogIn className="h-4 w-4" />
                  Đăng nhập
                </Button>
              </form>
            )}

            {view === "register" && (
              <form onSubmit={handleRegister} className="animate-[fadeIn_0.35s_ease-out] space-y-4">
                <div>
                  <FieldLabel>Họ và tên hiển thị</FieldLabel>
                  <Input required value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Ví dụ: Nguyễn Minh Đức" />
                </div>
                <div>
                  <FieldLabel>Tài khoản</FieldLabel>
                  <Input required value={regNick} onChange={(e) => setRegNick(e.target.value)} placeholder="Chọn tên đăng nhập" />
                </div>
                <div>
                  <FieldLabel>Mật khẩu</FieldLabel>
                  <Input type="password" required value={regPass} onChange={(e) => setRegPass(e.target.value)} placeholder="Tối thiểu 6 ký tự" />
                </div>
                <Button type="submit" loading={loading} size="lg" className="w-full" variant="secondary">
                  <UserPlus className="h-4 w-4" />
                  Tạo tài khoản
                </Button>
              </form>
            )}

            {view === "changepass" && (
              <form onSubmit={handleChangePass} className="animate-[fadeIn_0.35s_ease-out] space-y-4">
                <div>
                  <FieldLabel>Tài khoản</FieldLabel>
                  <Input required value={cpNick} onChange={(e) => setCpNick(e.target.value)} placeholder="Nhập tài khoản" />
                </div>
                <div>
                  <FieldLabel>Mật khẩu cũ</FieldLabel>
                  <Input type="password" required value={cpOldPass} onChange={(e) => setCpOldPass(e.target.value)} placeholder="Mật khẩu hiện tại" />
                </div>
                <div>
                  <FieldLabel>Mật khẩu mới</FieldLabel>
                  <Input type="password" required value={cpNewPass} onChange={(e) => setCpNewPass(e.target.value)} placeholder="Mật khẩu mới" />
                </div>
                <Button type="submit" loading={loading} size="lg" className="w-full" variant="soft">
                  <KeyRound className="h-4 w-4" />
                  Lưu thay đổi
                </Button>
              </form>
            )}

            {message && !loading && (
              <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-bold ${message.type === "success" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-red-100 bg-red-50 text-red-600"}`}>
                {message.text}
              </div>
            )}

            <div className="mt-6 text-center text-sm text-slate-500">
              {view === "login" && (
                <>
                  Chưa có tài khoản?{" "}
                  <button onClick={() => switchView("register")} className="font-bold text-emerald-700 hover:text-emerald-800">
                    Đăng ký ngay
                  </button>
                </>
              )}
              {view === "register" && (
                <>
                  Đã có tài khoản?{" "}
                  <button onClick={() => switchView("login")} className="font-bold text-emerald-700 hover:text-emerald-800">
                    Quay lại đăng nhập
                  </button>
                </>
              )}
              {view === "changepass" && (
                <button onClick={() => switchView("login")} className="font-bold text-emerald-700 hover:text-emerald-800">
                  Quay lại đăng nhập
                </button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
