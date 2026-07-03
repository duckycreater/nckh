import React, { useState, useEffect, createContext, useContext, useCallback, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Auth } from "./components/Auth";
import { Dashboard } from "./components/Dashboard";
import { Chatbot } from "./components/Chatbot";
import { ResearchDashboard } from "./components/ResearchDashboard";
import { ProfileCompletionModal } from "./components/ProfileCompletionModal";
import WorldMap from "./components/WorldMap";
import CampaignStage from "./components/CampaignStage";
import { User } from "./types";
import { FamilyMode } from "./components/FamilyMode";
import { Card, LoadingSpinner } from "./lib/ui";
import { changeLanguage, getCurrentLanguage, LANGUAGES, LanguageCode } from "./lib/i18n";
import { Globe } from "lucide-react";
import { calculateLevel } from "./lib/useLevel";

// Phase 4: public global impact dashboard (no login required)
const GlobalImpactDashboard = lazy(() =>
  import("./components/GlobalImpactDashboard").then((m) => ({ default: m.GlobalImpactDashboard }))
);

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

function FamilyRoute({ user }: { user: User }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Family Mode</h2>
          <button
            onClick={() => navigate("/home")}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800"
          >
            ← Về Home
          </button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          {/* Mount the modal in standalone-page mode */}
          <FamilyModeStandalone user={user} />
        </div>
      </div>
    </div>
  );
}

function FamilyModeStandalone({ user }: { user: User }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 px-4 py-3 text-sm font-bold text-white"
        >
          Mở Family Mode
        </button>
      )}
      <FamilyMode user={user} isOpen={open} onClose={() => setOpen(false)} />
    </>
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

  // Public routes that don't require login (Phase 4)
  const PUBLIC_PATHS = ["/impact"];

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

  // Phase 2: bootstrap on-device trainer + auto-pull global model updates.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const { onDeviceTrainer } = await import("./services/onDeviceTrainer");
        const { modelUpdateService } = await import("./services/modelUpdateService");
        onDeviceTrainer.setUserId(user.account_id);
        onDeviceTrainer.loadFromStorage();
        await modelUpdateService.loadFromStorage();
        if (cancelled) return;
        modelUpdateService.startAutoCheck();
      } catch (e) {
        console.warn("[App] federated bootstrap failed:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.account_id]);

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

  const handleProfileUpdates = (updates: { fullName?: string; classGrade?: string }) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next: User = { ...prev };
      if (updates.fullName !== undefined) next.fullName = updates.fullName;
      if (updates.classGrade !== undefined) next.classGrade = updates.classGrade;
      localStorage.setItem("user_session", JSON.stringify(next));
      return next;
    });
  };

  const handleDismissProfileCompletion = () => {
    if (!user) return;
    const next: User = { ...user, fullName: user.fullName, classGrade: user.classGrade };
    localStorage.setItem("profile_meta_skipped", next.account_id);
    setUser(next);
  };

  const requiresProfileCompletion =
    !!user && !user.role?.toLowerCase().includes("admin") && !user.fullName && !user.classGrade;

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_session");
    setUser(null);
  };

  if (restoring) {
    return <RestoringScreen />;
  }

  // Public route: /impact (Phase 4 - no login required)
  if (typeof window !== "undefined" && PUBLIC_PATHS.includes(window.location.pathname)) {
    return (
      <ThemeProvider>
        <Suspense fallback={<LoadingFallback message="Đang tải..." />}>
          <GlobalImpactDashboard />
        </Suspense>
      </ThemeProvider>
    );
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
          <Route path="/family" element={<FamilyRoute user={user} />} />
          <Route path="*" element={<Navigate to={isAdmin ? "/overview" : "/home"} replace />} />
        </Routes>
        {chatOpen && <Chatbot currentUser={user.account_id} />}
        {requiresProfileCompletion && (
          <ProfileCompletionModal
            user={user}
            onSaved={handleProfileUpdates}
            onDismiss={handleDismissProfileCompletion}
          />
        )}
      </BrowserRouter>
    </ThemeProvider>
  );
}
