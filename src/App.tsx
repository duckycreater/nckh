import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Auth } from "./components/Auth";
import { Dashboard } from "./components/Dashboard";
import { Chatbot } from "./components/Chatbot";
import { AdminDashboard } from "./components/AdminDashboard";
import { ResearchDashboard } from "./components/ResearchDashboard";
import { User } from "./types";
import { AppScreenShell, Badge, Card, LoadingSpinner } from "./lib/ui";

function RestoringScreen() {
  return (
    <div className="min-h-screen px-4 py-6 sm:px-6">
      <AppScreenShell
        badge={<Badge tone="success">BMO Robot</Badge>}
        title="Đang khôi phục phiên làm việc"
        subtitle="Chuẩn bị lại bảng điều khiển, tiến trình học tập và không gian trải nghiệm của bạn."
      >
        <Card className="glass-panel rounded-[32px] border-white/60 p-8 sm:p-10">
          <LoadingSpinner
            message="Đang đồng bộ phiên đăng nhập"
            subtitle="Việc này chỉ mất trong chốc lát để bạn quay lại đúng nơi đang dở dang."
          />
        </Card>
      </AppScreenShell>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      try {
        const storedUser = localStorage.getItem("user_session");
        if (storedUser) {
          const parsed = JSON.parse(storedUser) as User;
          setUser(parsed);
        }
      } catch {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_session");
      }
    }
    setRestoring(false);
  }, []);

  const handleUpdateUser = (updatedUser: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updatedUser };
      localStorage.setItem("user_session", JSON.stringify(next));
      return next;
    });
  };

  const handleLogin = (loggedInUser: User) => {
    localStorage.setItem("user_session", JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_session");
    setUser(null);
  };

  if (restoring) {
    return <RestoringScreen />;
  }

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  const isAdmin = user.role === "admin";

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        {isAdmin ? (
          <>
            <Route path="/research" element={<ResearchDashboard user={user} />} />
            <Route path="/:tab" element={<AdminDashboard user={user} onLogout={handleLogout} />} />
          </>
        ) : (
          <Route
            path="/:tab"
            element={
              <Dashboard
                user={user}
                onLogout={handleLogout}
                onUpdateUser={handleUpdateUser}
              />
            }
          />
        )}
        <Route path="*" element={<Navigate to={isAdmin ? "/overview" : "/home"} replace />} />
      </Routes>
      <Chatbot currentUser={user.account_id} />
    </BrowserRouter>
  );
}
