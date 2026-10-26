import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Activity,
  Camera,
  ChevronRight,
  CircleUserRound,
  Gift,
  Home,
  Layers3,
  LogOut,
  Menu,
  Settings,
  Trophy,
  UsersRound,
  X,
  Coins,
} from "lucide-react";
import type { User } from "../types";
import { cn } from "../lib/ui";
import { hasAppCriticalActivity } from "../services/appUpdateManager";

interface StudentAppShellProps {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
}

type NavItem = {
  path: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  mobile?: boolean;
  emphasis?: boolean;
};

const primaryNavigation: NavItem[] = [
  { path: "/home", labelKey: "lab.nav.home", icon: Home, mobile: true },
  { path: "/scan", labelKey: "lab.nav.scan", icon: Camera, emphasis: true },
  { path: "/cards", labelKey: "lab.nav.passports", icon: Layers3, mobile: true },
  { path: "/rewards", labelKey: "lab.nav.rewards", icon: Gift, mobile: true },
  { path: "/leaderboard", labelKey: "lab.nav.community", icon: Trophy, mobile: true },
];

const secondaryNavigation: NavItem[] = [
  { path: "/activities", labelKey: "lab.nav.activities", icon: Activity },
  { path: "/family", labelKey: "lab.nav.family", icon: UsersRound },
  { path: "/profile", labelKey: "lab.nav.profile", icon: CircleUserRound },
  { path: "/settings", labelKey: "lab.nav.settings", icon: Settings },
];

function isActive(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function StudentAppShell({ user, onLogout, children }: StudentAppShellProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => setMobileMenuOpen(false), [location.pathname]);

  const goTo = (path: string) => {
    if (path === location.pathname) return;
    if (hasAppCriticalActivity() && !window.confirm(t("lab.navigation.leaveWarning"))) return;
    navigate(path);
  };

  const currentItem = [...primaryNavigation, ...secondaryNavigation].find((item) => isActive(location.pathname, item.path));

  const renderDesktopItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(location.pathname, item.path);
    return (
      <button
        type="button"
        key={item.path}
        onClick={() => goTo(item.path)}
        title={t(item.labelKey)}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex min-h-11 w-full items-center gap-3 rounded-[10px] border px-3 text-left text-sm font-medium transition-colors",
          active
            ? "border-[var(--primary-border)] bg-[var(--primary-soft)] text-[var(--primary-strong)]"
            : "border-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--graphite)]",
        )}
      >
        <Icon size={18} />
        <span className="hidden min-[1200px]:inline">{t(item.labelKey)}</span>
        {active && <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-[var(--primary)] min-[1200px]:block" />}
      </button>
    );
  };

  return (
    <div className="app-shell student-shell">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[76px] flex-col border-r border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-4 text-[var(--graphite)] md:flex min-[1200px]:w-[236px] min-[1200px]:px-4">
        <button
          type="button"
          onClick={() => goTo("/home")}
          className="flex h-12 items-center gap-3 rounded-[10px] px-2 text-left"
          aria-label="BMO Material Lab"
        >
          <span className="material-pattern material-organic grid h-9 w-9 shrink-0 place-items-center rounded-[8px] border border-[var(--primary-border)] text-sm font-semibold text-[var(--primary-strong)]" data-material="organic">
            B
          </span>
          <span className="hidden min-w-0 min-[1200px]:block">
            <span className="block text-sm font-semibold leading-tight">BMO Material Lab</span>
          </span>
        </button>

        <nav className="mt-7 space-y-1" aria-label={t("lab.nav.primary")}>
          {primaryNavigation.map(renderDesktopItem)}
        </nav>

        <div className="my-5 h-px bg-[var(--border-subtle)]" />
        <nav className="space-y-1" aria-label={t("lab.nav.secondary")}>
          {secondaryNavigation.map(renderDesktopItem)}
        </nav>

        <div className="mt-auto">
          <div className="hidden rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 min-[1200px]:block">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-xs font-medium text-[var(--graphite)]">{user.name}</span>
              <span className="font-telemetry text-[10px] text-[var(--primary)]">{user.points.toLocaleString("vi-VN")}</span>
            </div>
            <p className="mt-1 truncate text-xs text-[var(--text-muted)]">{user.account_id}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="mt-2 flex min-h-11 w-full items-center gap-3 rounded-[8px] px-3 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--graphite)]"
          >
            <LogOut size={17} /> <span className="hidden min-[1200px]:inline">{t("lab.nav.logout")}</span>
          </button>
        </div>
      </aside>

      <div className="min-w-0 md:col-start-2">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--border-subtle)] bg-[rgba(251,252,248,0.96)] px-4 backdrop-blur-md md:px-6 xl:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="grid h-11 w-11 place-items-center rounded-[8px] border border-[var(--border-strong)] bg-[var(--surface)] md:hidden"
              aria-label={t("lab.nav.openMenu")}
            >
              <Menu size={19} />
            </button>
            <p className="text-sm font-semibold text-[var(--graphite)] sm:text-base">
              {currentItem ? t(currentItem.labelKey) : "BMO"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 sm:flex">
              <Coins size={15} className="text-[var(--primary)]" />
              <span className="font-telemetry text-xs font-semibold text-[var(--graphite)]">{user.points.toLocaleString("vi-VN")}</span>
              <span className="text-xs text-[var(--text-muted)]">{t("lab.points")}</span>
            </div>
            <button
              type="button"
              onClick={() => goTo("/profile")}
              aria-label={t("lab.nav.profile")}
              className="flex h-10 items-center gap-2 rounded-[8px] border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 text-sm font-medium"
            >
              <span className="grid h-6 w-6 place-items-center rounded-[6px] bg-[var(--primary-soft)] text-xs font-semibold text-[var(--primary)]">{user.name.slice(0, 1).toUpperCase()}</span>
              <span className="hidden max-w-28 truncate sm:block">{user.name}</span>
            </button>
          </div>
        </header>

        <main>{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-[calc(72px+env(safe-area-inset-bottom))] grid-cols-5 border-t border-[var(--border-strong)] bg-[rgba(251,252,248,0.98)] px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden" aria-label={t("lab.nav.mobile")}> 
        {[primaryNavigation[0], primaryNavigation[2], primaryNavigation[1], primaryNavigation[3], primaryNavigation[4]].map((item) => {
          const Icon = item.icon;
          const active = isActive(location.pathname, item.path);
          return (
            <button
              type="button"
              key={item.path}
              onClick={() => goTo(item.path)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 px-0.5 text-center text-[9px] font-medium leading-tight",
                active ? "text-[var(--primary)]" : "text-[var(--text-muted)]",
              )}
            >
              <span
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-[8px]",
                  item.emphasis && "-mt-6 h-12 w-12 border-4 border-[var(--background)] bg-[var(--graphite)] text-white shadow-[0_8px_20px_rgba(19,25,22,0.16)]",
                  active && !item.emphasis && "bg-[var(--primary-soft)]",
                )}
              >
                <Icon size={item.emphasis ? 21 : 19} />
              </span>
              <span className="max-w-full">{t(item.labelKey)}</span>
            </button>
          );
        })}
      </nav>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" className="absolute inset-0 bg-black/55" onClick={() => setMobileMenuOpen(false)} aria-label={t("lab.nav.closeMenu")} />
          <aside className="absolute inset-y-0 left-0 flex w-[min(86vw,340px)] flex-col border-r border-[var(--border-subtle)] bg-[var(--surface)] p-4 text-[var(--graphite)]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">BMO Material Lab</span>
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="grid h-11 w-11 place-items-center rounded-[8px] border border-[var(--border-strong)]" aria-label={t("lab.nav.closeMenu")}>
                <X size={18} />
              </button>
            </div>
            <div className="mt-6 space-y-1">{[...primaryNavigation, ...secondaryNavigation].map((item) => {
              const Icon = item.icon;
              return (
                <button type="button" key={item.path} onClick={() => goTo(item.path)} className="flex min-h-11 w-full items-center gap-3 rounded-[8px] px-3 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--graphite)]">
                  <Icon size={18} /> <span>{t(item.labelKey)}</span><ChevronRight size={15} className="ml-auto" />
                </button>
              );
            })}</div>
            <button type="button" onClick={onLogout} className="mt-auto flex min-h-11 items-center gap-3 rounded-[8px] border border-[var(--border-strong)] px-3 text-sm text-[var(--text-secondary)]">
              <LogOut size={18} /> {t("lab.nav.logout")}
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
