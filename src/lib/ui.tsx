import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Loader2, Sparkles, X } from "lucide-react";

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function useApi<T>(
  fetchFn: () => Promise<T>,
  deps: unknown[] = []
): ApiState<T> & { refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const doFetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra. Vui lòng thử lại.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    doFetch();
  }, [doFetch]);

  return { data, loading, error, refetch: doFetch };
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type ButtonSize = "sm" | "md" | "lg";

export function Button({
  className = "",
  variant = "primary",
  size = "md",
  loading = false,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}) {
  const base = "inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99] focus-visible:shadow-[0_0_0_4px_var(--primary-ring)]";
  const variants = {
    primary: "border border-transparent bg-[var(--primary)] text-white shadow-[var(--shadow-glow)] hover:bg-[var(--primary-hover)]",
    secondary: "border border-transparent bg-[var(--secondary)] text-white shadow-[var(--shadow-soft)] hover:bg-[var(--secondary-hover)]",
    ghost: "border border-[var(--border-subtle)] bg-white/82 text-[var(--text-secondary)] shadow-sm hover:bg-white hover:text-[var(--text-primary)]",
    danger: "border border-transparent bg-[var(--danger)] text-white shadow-[var(--shadow-soft)] hover:opacity-95",
    soft: "border border-[var(--primary-soft-strong)] bg-[var(--primary-soft)] text-[var(--primary-strong)] hover:bg-[var(--primary-soft-strong)]",
  } as const;
  const sizes = {
    sm: "h-10 px-4 text-sm",
    md: "h-11 px-5 text-sm",
    lg: "h-12 px-6 text-base",
  } as const;

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} disabled={loading || props.disabled} {...props}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Card({
  className = "",
  children,
  padding = "none",
}: {
  className?: string;
  children: React.ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
}) {
  const paddings = {
    none: "",
    sm: "p-4",
    md: "p-5",
    lg: "p-6 sm:p-7",
  } as const;

  return <div className={cn("surface-card rounded-[28px]", paddings[padding], className)}>{children}</div>;
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        {eyebrow && <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--primary)]/80">{eyebrow}</p>}
        <h2 className="text-xl font-black tracking-tight text-[var(--text-primary)]">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-2xl border border-[var(--border-subtle)] bg-white px-4 py-3 text-[15px] text-[var(--text-primary)] shadow-sm transition-all outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-ring)]",
        className,
      )}
      {...props}
    />
  );
}

export function TextArea({ className = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-2xl border border-[var(--border-subtle)] bg-white px-4 py-3 text-[15px] text-[var(--text-primary)] shadow-sm transition-all outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-ring)]",
        className,
      )}
      {...props}
    />
  );
}

export function FieldLabel({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <label className={cn("mb-2 block text-[12px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]", className)}>{children}</label>;
}

export function Badge({
  className = "",
  tone = "default",
  children,
}: {
  className?: string;
  tone?: "default" | "success" | "warning" | "danger" | "accent";
  children: React.ReactNode;
}) {
  const tones = {
    default: "border border-slate-200 bg-slate-100 text-slate-700",
    success: "border border-[var(--primary-soft-strong)] bg-[var(--primary-soft)] text-[var(--primary-strong)]",
    warning: "border border-amber-100 bg-[var(--warning-soft)] text-[var(--warning)]",
    danger: "border border-red-100 bg-[var(--danger-soft)] text-[var(--danger)]",
    accent: "border border-indigo-100 bg-[var(--accent-soft)] text-[var(--accent)]",
  } as const;

  return <span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-black", tones[tone], className)}>{children}</span>;
}

export function TabButton({
  active,
  className = "",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={cn(
        "rounded-2xl px-4 py-2.5 text-sm font-bold transition-all focus-visible:shadow-[0_0_0_4px_var(--primary-ring)]",
        active
          ? "bg-white text-[var(--primary-strong)] shadow-[var(--shadow-soft)]"
          : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function ModalShell({
  children,
  onClose,
  className = "",
  title,
}: {
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
  title?: string;
}) {
  useEffect(() => {
    if (!onClose) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={onClose} role="presentation">
      <div
        className={cn("w-full max-w-2xl rounded-[32px] border border-white/50 bg-white shadow-[var(--shadow-strong)]", className)}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({
  title,
  subtitle,
  onClose,
  badge,
}: {
  title: string;
  subtitle?: string;
  onClose?: () => void;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
      <div>
        {badge}
        <h2 className="mt-3 text-2xl font-black tracking-tight text-[var(--text-primary)]">{title}</h2>
        {subtitle && <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">{subtitle}</p>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={cn("shimmer-surface rounded-2xl", className)} />;
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-[24px]", className)}>
      <Skeleton className="aspect-[2.5/3.5] w-full" />
    </div>
  );
}

export function SkeletonRow({ className = "" }: { className?: string }) {
  return <Skeleton className={cn("h-12 rounded-2xl", className)} />;
}

export function ErrorRetry({ message, onRetry, title = "Có lỗi xảy ra" }: { message?: string; onRetry: () => void; title?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
      <div className="rounded-full bg-[var(--danger-soft)] p-3 text-[var(--danger)]">
        <AlertCircle className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-black text-[var(--text-primary)]">{title}</p>
        <p className="text-sm font-medium text-[var(--text-muted)]">{message || t("common.errorRetry")}</p>
      </div>
      <Button onClick={onRetry} variant="secondary">{t("common.tryAgain")}</Button>
    </div>
  );
}

export function LoadingSpinner({ message = "Đang tải...", subtitle }: { message?: string; subtitle?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)] shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--text-secondary)]">{message || t("common.loading")}</p>
        {subtitle && <p className="mt-1 text-xs text-[var(--text-muted)]">{subtitle}</p>}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-[28px] border border-dashed border-slate-200 bg-white/85 px-6 py-12 text-center">
      <div className="rounded-full bg-[var(--primary-soft)] p-3 text-[var(--primary)]">
        {icon || <Sparkles className="h-6 w-6" />}
      </div>
      <div>
        <p className="font-black text-[var(--text-primary)]">{title}</p>
        {subtitle && <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>}
      </div>
      {action && <Button onClick={action.onClick} variant="soft">{action.label}</Button>}
    </div>
  );
}

export function AppScreenShell({
  badge,
  title,
  subtitle,
  children,
  action,
}: {
  badge?: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <Card className="hero-panel rounded-[32px] border-0 p-6 sm:p-7">
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            {badge}
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-700 sm:text-base">{subtitle}</p>}
          </div>
          {action}
        </div>
      </Card>
      {children}
    </div>
  );
}
