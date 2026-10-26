import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
  lazy,
  Suspense,
} from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Auth } from "./components/Auth";
import { User } from "./types";
import { Card, LoadingSpinner } from "./lib/ui";
import { clearAuthToken, getAuthHeaders, getAuthToken } from "./lib/auth";
import { AppUpdateNotice } from "./components/AppUpdateNotice";

// Phase 4: public global impact dashboard (no login required)
const GlobalImpactDashboard = lazy(() =>
  import("./components/GlobalImpactDashboard").then((m) => ({ default: m.GlobalImpactDashboard })),
);
const LazyDashboard = lazy(() =>
  import("./components/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const LazyResearchDashboard = lazy(() =>
  import("./components/ResearchDashboard").then((m) => ({ default: m.ResearchDashboard })),
);
const LazyProfileCompletionModal = lazy(() =>
  import("./components/ProfileCompletionModal").then((m) => ({
    default: m.ProfileCompletionModal,
  })),
);

// ─── Lazy Imports ──────────────────────────────────────────────────────
const LazyAdminDashboard = lazy(() =>
  import("./components/AdminDashboard").then((m) => ({ default: m.AdminDashboard })),
);

function LoadingFallback({ message }: { message?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-20">
      <div className="flex min-w-64 flex-col items-center gap-3 rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface)] p-8">
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
  const theme: Theme = "light";
  useEffect(() => {
    document.documentElement.removeAttribute("data-theme");
    localStorage.removeItem("theme");
  }, []);
  const toggle = useCallback(() => undefined, []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

function RestoringScreen() {
  const { t } = useTranslation();
  return (
    <div className="flex h-screen items-center justify-center bg-[var(--background)]">
      <Card className="mx-4 w-full max-w-sm p-8 text-center">
        <LoadingSpinner message={t("app.syncingLogin")} subtitle={t("app.syncingHint")} />
      </Card>
    </div>
  );
}

export default function App() {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [restoring, setRestoring] = useState(true);

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
          <AppUpdateNotice />
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
          {/* Retired deep links must not masquerade as a valid dashboard tab. */}
          <Route path="/world-map" element={<Navigate to="/home" replace />} />
          <Route path="/campaign/*" element={<Navigate to="/home" replace />} />
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
            <>
              <Route path="/craft" element={<Navigate to="/rewards" replace />} />
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
            </>
          )}
          <Route path="*" element={<Navigate to={isAdmin ? "/overview" : "/home"} replace />} />
        </Routes>
        {requiresProfileCompletion && (
          <Suspense fallback={null}>
            <LazyProfileCompletionModal
              user={user}
              onSaved={handleProfileUpdates}
              onDismiss={handleDismissProfileCompletion}
            />
          </Suspense>
        )}
        <AppUpdateNotice />
      </BrowserRouter>
    </ThemeProvider>
  );
}
