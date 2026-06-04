import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Auth } from "./components/Auth";
import { Dashboard } from "./components/Dashboard";
import { Chatbot } from "./components/Chatbot";
import { AdminDashboard } from "./components/AdminDashboard";
import { ResearchDashboard } from "./components/ResearchDashboard";
import { User } from "./types";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      // Try to restore user from localStorage
      try {
        const storedUser = localStorage.getItem("user_session");
        if (storedUser) {
          const parsed = JSON.parse(storedUser) as User;
          setUser(parsed);
        }
      } catch {
        localStorage.removeItem("auth_token");
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
    return null;
  }

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  if (user.role === "admin") {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/research" element={<ResearchDashboard user={user} />} />
          <Route
            path="/:tab"
            element={<AdminDashboard user={user} onLogout={handleLogout} />}
          />
        </Routes>
        <Chatbot currentUser={user.account_id} />
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Navigate to="/home" replace />}
        />
        <Route
          path="/:tab"
          element={
            <>
              <Dashboard
                user={user}
                onLogout={handleLogout}
                onUpdateUser={handleUpdateUser}
              />
              <Chatbot currentUser={user.account_id} />
            </>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
