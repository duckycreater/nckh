import React, { useState, useEffect, createContext, useContext, useCallback, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Auth } from "./components/Auth";
import { Dashboard } from "./components/Dashboard";
import { Chatbot } from "./components/Chatbot";
import { ResearchDashboard } from "./components/ResearchDashboard";
import WorldMap from "./components/WorldMap";
import CampaignStage from "./components/CampaignStage";
import { User } from "./types";
import { Badge, LoadingSpinner } from "./lib/ui";
import { changeLanguage, getCurrentLanguage, LANGUAGES, LanguageCode } from "./lib/i18n";
import { Globe } from "lucide-react";
import { calculateLevel } from "./lib/useLevel";

// ─── Lazy Imports ──────────────────────────────────────────────────────
const LazyAdminDashboard = lazy(() =>
  import("./components/AdminDashboard").then((m) => ({ default: m.AdminDashboard }))
);
const LazyFlashcards = lazy(() =>
  import("./components/Flashcards").then((m) => ({ default: m.Flashcards }))
);

function LoadingFallback({ message = "Đang tải..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
      </div>
    </div>
  );
}

// ─── Theme Context ─────────────────────────────────────────────────────
type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme") as Theme;
    return saved === "dark" || saved === "light" ? saved : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Campaign Route Wrappers
function WorldMapRoute({ user }: { user: User }) {
  const navigate = useNavigate();
  const totalExp = user.totalExpEarned ?? user.points;
  const { level: playerLevel } = calculateLevel(totalExp);
  return (
    <WorldMap
      playerLevel={playerLevel}
      unlockedRegions={user.unlockedRegions || ["region_01"]}
      currentRegion={user.currentRegion || ""}
      onSelectRegion={(regionId) => {
        const stageId = `s${regionId.split("_")[1]}_01`;
        navigate(`/campaign/${regionId}/${stageId}`);
      }}
      onBack={() => navigate("/home")}
    />
  );
}

function CampaignStageRoute() {
  const navigate = useNavigate();
  const { regionId, stageId } = useParams<{ regionId: string; stageId: string }>();
  return (
    <CampaignStage
      regionId={regionId || ""}
      stageId={stageId || ""}
      onBack={() => navigate("/world-map")}
    />
  );
}

function LanguageSwitcher() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<LanguageCode>(getCurrentLanguage());

  const handleSelect = (code: LanguageCode) => {
    changeLanguage(code);
    setCurrent(code);
    setOpen(false);
  };

  const currentLang = LANGUAGES.find((l) => l.code === current);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white/80 px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 transition-colors"
        title={t("settings.settings")}
      >
        <Globe size={15} />
        <span>{currentLang?.flag}</span>
        <span className="hidden sm:inline">{currentLang?.label}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 rounded-2xl border border-gray-100 bg-white shadow-xl z-50 overflow-hidden">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors ${
                lang.code === current ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-gray-700"
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RestoringScreen() {
  const { t } = useTranslation();
  return (
    <div className="flex h-screen items-center justify-center bg-[var(--background)]">
      <Card className="w-full max-w-sm mx-4 rounded-3xl p-8 text-center">
        <LoadingSpinner message={t("app.syncingLogin")} subtitle={t("app.syncingHint")} />
      </Card>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

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
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          {isAdmin ? (
          <>
            <Route path="/research" element={<ResearchDashboard user={user} />} />
            <Route
              path="/:tab"
              element={
                <Suspense fallback={<LoadingFallback message="Đang tải dashboard..." />}>
                  <LazyAdminDashboard user={user} onLogout={handleLogout} />
                </Suspense>
              }
            />
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
          {/* Campaign Routes */}
          <Route path="/world-map" element={<WorldMapRoute user={user} />} />
          <Route path="/campaign/:regionId/:stageId" element={<CampaignStageRoute />} />
          <Route path="*" element={<Navigate to={isAdmin ? "/overview" : "/home"} replace />} />
        </Routes>
        {chatOpen && <Chatbot currentUser={user.account_id} />}
      </BrowserRouter>
    </ThemeProvider>
  );
}
