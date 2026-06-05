import React, { useState, useEffect, useCallback } from "react";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";

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

export function Button({
  className = "",
  variant = "primary",
  size = "md",
  loading = false,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "soft";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}) {
  const base = "inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]";
  const variants = {
    primary: "bg-emerald-600 text-white shadow-[var(--shadow-glow)] hover:bg-emerald-700",
    secondary: "bg-slate-900 text-white shadow-[var(--shadow-soft)] hover:bg-slate-800",
    ghost: "bg-white/70 text-slate-700 border border-[var(--border-subtle)] hover:bg-white",
    danger: "bg-red-500 text-white shadow-[var(--shadow-soft)] hover:bg-red-600",
    soft: "bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100",
  } as const;
  const sizes = {
    sm: "h-10 px-4 text-sm",
    md: "h-11 px-5 text-sm",
    lg: "h-13 px-6 text-base",
  } as const;

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} disabled={loading || props.disabled} {...props}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("surface-card rounded-[28px]", className)}>{children}</div>;
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
        {eyebrow && <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-600/75">{eyebrow}</p>}
        <h2 className="text-xl font-black tracking-tight text-slate-900">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-800 shadow-sm transition-all outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10",
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
        "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-800 shadow-sm transition-all outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10",
        className,
      )}
      {...props}
    />
  );
}

export function FieldLabel({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <label className={cn("mb-2 block text-[12px] font-black uppercase tracking-[0.18em] text-slate-500", className)}>{children}</label>;
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
    default: "bg-slate-100 text-slate-700 border border-slate-200",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    warning: "bg-amber-50 text-amber-700 border border-amber-100",
    danger: "bg-red-50 text-red-600 border border-red-100",
    accent: "bg-indigo-50 text-indigo-700 border border-indigo-100",
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
        "rounded-2xl px-4 py-2.5 text-sm font-bold transition-all",
        active
          ? "bg-white text-emerald-700 shadow-[var(--shadow-soft)]"
          : "text-slate-500 hover:text-slate-700",
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
}: {
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className={cn("w-full max-w-2xl rounded-[32px] bg-white shadow-[var(--shadow-strong)]", className)} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-gradient-to-r from-slate-100 via-emerald-50 to-slate-100", className)} />;
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={cn("rounded-[24px] overflow-hidden", className)}>
      <Skeleton className="w-full aspect-[2.5/3.5]" />
    </div>
  );
}

export function SkeletonRow({ className = "" }: { className?: string }) {
  return <Skeleton className={cn("h-12 rounded-2xl", className)} />;
}

export function ErrorRetry({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
      <div className="rounded-full bg-red-50 p-3 text-red-500">
        <AlertCircle className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-black text-slate-800">Có lỗi xảy ra</p>
        <p className="text-sm font-medium text-slate-500">{message || "Vui lòng thử lại sau ít phút."}</p>
      </div>
      <Button onClick={onRetry} variant="secondary">Thử lại</Button>
    </div>
  );
}

export function LoadingSpinner({ message = "Đang tải..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
      <p className="text-sm font-medium text-slate-500">{message}</p>
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
    <div className="flex flex-col items-center justify-center gap-4 rounded-[28px] border border-dashed border-slate-200 bg-white/80 px-6 py-12 text-center">
      <div className="rounded-full bg-emerald-50 p-3 text-emerald-500">
        {icon || <Sparkles className="h-6 w-6" />}
      </div>
      <div>
        <p className="font-black text-slate-800">{title}</p>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action && <Button onClick={action.onClick} variant="soft">{action.label}</Button>}
    </div>
  );
}
