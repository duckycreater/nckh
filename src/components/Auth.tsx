import React, { useState } from "react";
import { ArrowRight, Eye, EyeOff, KeyRound, LogIn, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { User } from "../types";
import { Badge, Button, Card, FieldLabel, Input } from "../lib/ui";

interface AuthProps {
  onLogin: (user: User) => void;
}

type ViewState = "login" | "register" | "changepass";

function PasswordField({
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="pr-12"
      />
      <button
        type="button"
        onClick={() => setShow((prev) => !prev)}
        className="absolute inset-y-0 right-3 my-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

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
      setMessage({ text: "Không thể kết nối tới hệ thống. Vui lòng thử lại sau ít phút.", type: "error" });
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
      setMessage({ text: "Không thể tạo tài khoản lúc này. Vui lòng thử lại sau.", type: "error" });
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
      setMessage({ text: "Không thể cập nhật mật khẩu. Vui lòng kiểm tra kết nối và thử lại.", type: "error" });
    }
    setLoading(false);
  };

  const title = view === "login" ? "Đăng nhập để tiếp tục" : view === "register" ? "Tạo tài khoản mới" : "Khôi phục quyền truy cập";
  const subtitle = view === "login"
    ? "Theo dõi điểm thưởng, hồ sơ và hành trình phân loại rác của bạn trong một trải nghiệm mượt mà và dễ dùng ngay từ lần đầu."
    : view === "register"
    ? "Tạo tài khoản chỉ trong vài giây để bắt đầu tích điểm, mở khóa phần thưởng và xây dựng thói quen xanh."
    : "Cập nhật mật khẩu nhanh gọn để bảo vệ tài khoản và quay lại hành trình của bạn ngay.";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,143,104,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(85,105,255,0.12),transparent_24%)]" />

      <div className="relative z-10 grid w-full max-w-6xl gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <Card className="hero-panel hidden min-h-[640px] rounded-[34px] border-0 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div className="space-y-5">
              <Badge tone="success" className="border-white/10 bg-white/10 text-white">Nền tảng phân loại rác thông minh</Badge>
              <div className="space-y-3">
                <h1 className="max-w-lg text-4xl font-black leading-tight tracking-tight">Trải nghiệm xanh tinh tế, rõ ràng và đáng tin cậy hơn cho mọi người dùng.</h1>
                <p className="max-w-xl text-base leading-7 text-slate-200/82">
                  Theo dõi hành trình học tập, phân loại rác, tích điểm và quản lý hồ sơ trong một giao diện gọn gàng, hiện đại, mượt mà và dễ dùng ngay từ lần đầu tiên.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { icon: <Sparkles className="h-5 w-5" />, title: "Mượt hơn", desc: "Hành động chính rõ ràng hơn, giảm rối mắt và tăng phản hồi trạng thái." },
                { icon: <ShieldCheck className="h-5 w-5" />, title: "Tin cậy hơn", desc: "Đăng nhập, mật khẩu, hồ sơ và phần thưởng được trình bày trực quan hơn." },
                { icon: <ArrowRight className="h-5 w-5" />, title: "Nhanh hơn", desc: "Đưa bạn đến đúng nơi cần thao tác, giảm bước thừa ở các flow quan trọng." },
              ].map((item) => (
                <div key={item.title} className="rounded-[24px] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                  <div className="mb-3 inline-flex rounded-full bg-white/10 p-2 text-emerald-200">{item.icon}</div>
                  <p className="font-black text-white">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-200/75">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="glass-panel mx-auto w-full max-w-[480px] overflow-hidden rounded-[32px] p-0">
          <div className="border-b border-slate-100 px-6 pb-5 pt-6 sm:px-8">
            <Badge tone="accent">BMO Robot</Badge>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
          </div>

          <div className="px-6 py-6 sm:px-8 sm:py-7">
            <div className="mb-6 grid grid-cols-3 gap-2 rounded-[22px] bg-slate-100 p-1">
              {[
                { id: "login", label: "Đăng nhập" },
                { id: "register", label: "Đăng ký" },
                { id: "changepass", label: "Mật khẩu" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => switchView(tab.id as ViewState)}
                  className={`rounded-2xl px-4 py-2.5 text-sm font-bold transition-all ${
                    view === tab.id ? "bg-white text-emerald-700 shadow-[var(--shadow-soft)]" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {message && (
              <div className={`mb-5 rounded-[22px] border px-4 py-3 text-sm font-medium ${message.type === "success" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-red-100 bg-red-50 text-red-600"}`}>
                {message.text}
              </div>
            )}

            {view === "login" && (
              <form onSubmit={handleLogin} className="fade-in space-y-4">
                <div>
                  <FieldLabel>Tài khoản</FieldLabel>
                  <Input value={loginNick} onChange={(e) => setLoginNick(e.target.value)} placeholder="Nhập tài khoản của bạn" autoComplete="username" />
                </div>
                <div>
                  <FieldLabel>Mật khẩu</FieldLabel>
                  <PasswordField value={loginPass} onChange={setLoginPass} placeholder="Nhập mật khẩu" autoComplete="current-password" />
                </div>
                <Button type="submit" loading={loading} className="w-full" size="lg">
                  <LogIn className="h-4 w-4" />
                  Đăng nhập
                </Button>
              </form>
            )}

            {view === "register" && (
              <form onSubmit={handleRegister} className="fade-in space-y-4">
                <div>
                  <FieldLabel>Họ và tên</FieldLabel>
                  <Input value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Tên hiển thị của bạn" autoComplete="name" />
                </div>
                <div>
                  <FieldLabel>Tài khoản</FieldLabel>
                  <Input value={regNick} onChange={(e) => setRegNick(e.target.value)} placeholder="Tên đăng nhập mong muốn" autoComplete="username" />
                </div>
                <div>
                  <FieldLabel>Mật khẩu</FieldLabel>
                  <PasswordField value={regPass} onChange={setRegPass} placeholder="Tạo mật khẩu mới" autoComplete="new-password" />
                </div>
                <Button type="submit" loading={loading} className="w-full" size="lg">
                  <UserPlus className="h-4 w-4" />
                  Tạo tài khoản
                </Button>
              </form>
            )}

            {view === "changepass" && (
              <form onSubmit={handleChangePass} className="fade-in space-y-4">
                <div>
                  <FieldLabel>Tài khoản</FieldLabel>
                  <Input value={cpNick} onChange={(e) => setCpNick(e.target.value)} placeholder="Nhập tài khoản cần cập nhật" autoComplete="username" />
                </div>
                <div>
                  <FieldLabel>Mật khẩu hiện tại</FieldLabel>
                  <PasswordField value={cpOldPass} onChange={setCpOldPass} placeholder="Nhập mật khẩu hiện tại" autoComplete="current-password" />
                </div>
                <div>
                  <FieldLabel>Mật khẩu mới</FieldLabel>
                  <PasswordField value={cpNewPass} onChange={setCpNewPass} placeholder="Nhập mật khẩu mới" autoComplete="new-password" />
                </div>
                <Button type="submit" loading={loading} className="w-full" size="lg" variant="secondary">
                  <KeyRound className="h-4 w-4" />
                  Cập nhật mật khẩu
                </Button>
              </form>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
