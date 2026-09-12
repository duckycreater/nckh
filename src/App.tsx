import React, {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
  useCallback,
  lazy,
  Suspense,
} from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Auth } from "./components/Auth";
import { User } from "./types";
import { Card, LoadingSpinner } from "./lib/ui";
import {
  changeLanguage,
  getCurrentLanguage,
  LANGUAGES,
  LanguageCode,
  onLanguageChanged,
} from "./lib/i18n";
import { Globe } from "lucide-react";
import { calculateLevel } from "./lib/useLevel";
import { clearAuthToken, getAuthHeaders, getAuthToken } from "./lib/auth";

// Phase 4: public global impact dashboard (no login required)
const GlobalImpactDashboard = lazy(() =>
  import("./components/GlobalImpactDashboard").then((m) => ({ default: m.GlobalImpactDashboard })),
);
const LazyDashboard = lazy(() =>
  import("./components/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const LazyChatbot = lazy(() =>
  import("./components/Chatbot").then((m) => ({ default: m.Chatbot })),
);
const LazyResearchDashboard = lazy(() =>
  import("./components/ResearchDashboard").then((m) => ({ default: m.ResearchDashboard })),
);
const LazyProfileCompletionModal = lazy(() =>
  import("./components/ProfileCompletionModal").then((m) => ({
    default: m.ProfileCompletionModal,
  })),
);
const LazyWorldMap = lazy(() => import("./components/WorldMap"));
const LazyCampaignStage = lazy(() => import("./components/CampaignStage"));
const LazyFamilyMode = lazy(() =>
  import("./components/FamilyMode").then((m) => ({ default: m.FamilyMode })),
);

// ─── Lazy Imports ──────────────────────────────────────────────────────
const LazyAdminDashboard = lazy(() =>
  import("./components/AdminDashboard").then((m) => ({ default: m.AdminDashboard })),
);
const LazyFlashcards = lazy(() =>
  import("./components/Flashcards").then((m) => ({ default: m.Flashcards })),
);

function LoadingFallback({ message }: { message?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#062e28,#0e7c5b)] px-4 py-20">
      <div className="flex min-w-64 flex-col items-center gap-3 rounded-3xl border border-white/60 bg-white/95 p-8 shadow-2xl">
        <div className="w-10 h-10 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-sm text-gray-500 dark:text-gray-400">{message ?? t("common.loading")}</p>
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

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

// ─── Campaign Route Wrappers
function WorldMapRoute({ user }: { user: User }) {
  const navigate = useNavigate();
  const totalExp = user.totalExpEarned ?? user.points;
  const { level: playerLevel } = calculateLevel(totalExp);
  return (
    <LazyWorldMap
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
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{t("family.homeTitle")}</h2>
          <button
            onClick={() => navigate("/home")}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800"
          >
            ← {t("app.home")}
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
  const { t } = useTranslation();
  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 px-4 py-3 text-sm font-bold text-white"
        >
          {t("family.open")}
        </button>
      )}
      <LazyFamilyMode user={user} isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}

function CampaignStageRoute() {
  const navigate = useNavigate();
  const { regionId, stageId } = useParams<{ regionId: string; stageId: string }>();
  return (
    <LazyCampaignStage
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
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Subscribe to language changes triggered elsewhere (e.g. Settings).
  useEffect(() => {
    return onLanguageChanged((code) => setCurrent(code));
  }, []);

  // Click-outside-to-close + Escape key handler.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleSelect = async (code: LanguageCode) => {
    changeLanguage(code);
    setCurrent(code);
    setOpen(false);
    // Best-effort: persist preference to server (fire-and-forget).
    try {
      const token = localStorage.getItem("auth_token");
      if (token) {
        await fetch("/api/users/me/preferences", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ locale: code }),
        });
      }
    } catch {
      /* offline / unauthenticated — localStorage change still applies */
    }
  };

  const currentLang = LANGUAGES.find((l) => l.code === current);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("settings.settings")}
        className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white/80 px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 transition-colors"
        title={t("settings.settings")}
      >
        <Globe size={15} />
        <span aria-hidden="true">{currentLang?.flag}</span>
        <span className="hidden sm:inline">{currentLang?.label}</span>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={t("settings.settings")}
          className="absolute right-0 top-full mt-2 w-56 max-h-80 overflow-auto rounded-2xl border border-gray-100 bg-white shadow-xl z-50"
        >
          {LANGUAGES.map((lang) => (
            <li key={lang.code} role="option" aria-selected={lang.code === current}>
              <button
                type="button"
                onClick={() => handleSelect(lang.code)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-start hover:bg-gray-50 transition-colors ${
                  lang.code === current
                    ? "bg-emerald-50 text-emerald-700 font-semibold"
                    : "text-gray-700"
                }`}
              >
                <span aria-hidden="true" className="text-base">
                  {lang.flag}
                </span>
                <span className="flex-1">{lang.label}</span>
                {lang.code === current && (
                  <span aria-hidden="true" className="text-emerald-600">
                    ✓
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RestoringScreen() {
  const { t } = useTranslation();
  return (
    <div className="flex h-screen items-center justify-center bg-[linear-gradient(135deg,#062e28,#0e7c5b)]">
      <Card className="mx-4 w-full max-w-sm rounded-3xl border-white/60 bg-white/95 p-8 text-center shadow-2xl">
        <LoadingSpinner message={t("app.syncingLogin")} subtitle={t("app.syncingHint")} />
      </Card>
    </div>
  );
}

export default function App() {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const token = getAuthToken();
      const storedUser = localStorage.getItem("user_session");
      if (!token || !storedUser) {
        clearAuthToken();
        localStorage.removeItem("user_session");
        if (!cancelled) setRestoring(false);
        return;
      }

      let parsed: User;
      try {
        parsed = JSON.parse(storedUser) as User;
        if (!parsed?.account_id) throw new Error("Invalid cached session");
      } catch {
        clearAuthToken();
        localStorage.removeItem("user_session");
        if (!cancelled) setRestoring(false);
        return;
      }

      try {
        const response = await fetch(`/api/user/${encodeURIComponent(parsed.account_id)}`, {
          headers: getAuthHeaders(),
        });
        if (response.ok) {
          const fresh = await response.json();
          const restored = { ...parsed, ...fresh } as User;
          localStorage.setItem("user_session", JSON.stringify(restored));
          if (!cancelled) setUser(restored);
        } else if ([401, 403, 404].includes(response.status)) {
          clearAuthToken();
          localStorage.removeItem("user_session");
        } else if (!cancelled) {
          // Preserve offline PWA access when the server is temporarily
          // unavailable, but never do this for an explicitly rejected token.
          setUser(parsed);
        }
      } catch {
        if (!cancelled) setUser(parsed);
      } finally {
        if (!cancelled) setRestoring(false);
      }
    };

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  // Phase 2: bootstrap on-device trainer + auto-pull global model updates.
  const userAccountId = user?.account_id;
  useEffect(() => {
    if (!userAccountId) return;
    let cancelled = false;
    (async () => {
      try {
        const { onDeviceTrainer } = await import("./services/onDeviceTrainer");
        const { modelUpdateService } = await import("./services/modelUpdateService");
        onDeviceTrainer.setUserId(userAccountId);
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
  }, [userAccountId]);

  const handleUpdateUser = useCallback((updatedUser: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updatedUser };
      localStorage.setItem("user_session", JSON.stringify(next));
      return next;
    });
  }, []);

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
    !!user &&
    !user.role?.toLowerCase().includes("admin") &&
    !user.fullName &&
    !user.classGrade &&
    localStorage.getItem("profile_meta_skipped") !== user.account_id;

  const handleLogout = () => {
    const headers = getAuthHeaders();
    if (getAuthToken()) {
      void fetch("/api/logout", { method: "POST", headers }).catch(() => {});
    }
    clearAuthToken();
    localStorage.removeItem("user_session");
    localStorage.removeItem("profile_meta_skipped");
    setUser(null);
  };

  if (restoring) {
    return <RestoringScreen />;
  }

  // Layer 1.5 — `/impact` is a real React Router route rendered BEFORE
  // the auth gate. We use `useLocation` inside `<RouterRoot>` so the
  // impact dashboard mounts as a real child of `<BrowserRouter>` (so
  // `useNavigate` and `useParams` work). The legacy `window.location`
  // bypass is removed because it (a) duplicated the router's job and
  // (b) made useParams/useNavigate unavailable inside the dashboard.
  if (!user) {
    return (
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/impact"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <GlobalImpactDashboard />
                </Suspense>
              }
            />
            <Route path="*" element={<Auth onLogin={handleLogin} />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    );
  }

  const isAdmin = user.role === "admin";

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          {isAdmin ? (
            <>
              <Route
                path="/research"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <LazyResearchDashboard user={user} />
                  </Suspense>
                }
              />
              <Route
                path="/:tab"
                element={
                  <Suspense fallback={<LoadingFallback message={t("app.loadingDashboard")} />}>
                    <LazyAdminDashboard user={user} onLogout={handleLogout} />
                  </Suspense>
                }
              />
            </>
          ) : (
            <Route
              path="/:tab"
              element={
                <Suspense fallback={<LoadingFallback message={t("app.loadingDashboard")} />}>
                  <LazyDashboard
                    user={user}
                    onLogout={handleLogout}
                    onUpdateUser={handleUpdateUser}
                  />
                </Suspense>
              }
            />
          )}
          {/* Campaign Routes */}
          <Route
            path="/world-map"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <WorldMapRoute user={user} />
              </Suspense>
            }
          />
          <Route
            path="/campaign/:regionId/:stageId"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <CampaignStageRoute />
              </Suspense>
            }
          />
          <Route
            path="/family"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <FamilyRoute user={user} />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to={isAdmin ? "/overview" : "/home"} replace />} />
        </Routes>
        {chatOpen && (
          <Suspense fallback={null}>
            <LazyChatbot currentUser={user.account_id} />
          </Suspense>
        )}
        {requiresProfileCompletion && (
          <Suspense fallback={null}>
            <LazyProfileCompletionModal
              user={user}
              onSaved={handleProfileUpdates}
              onDismiss={handleDismissProfileCompletion}
            />
          </Suspense>
        )}
      </BrowserRouter>
    </ThemeProvider>
  );
}
