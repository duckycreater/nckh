import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, ArrowRight, Inbox, Loader2, Sparkles, WifiOff, X } from "lucide-react";
import { toUserMessage } from "./userFacingError";

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
  deps: unknown[] = [],
): ApiState<T> & { refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const doFetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchFn());
    } catch (err: unknown) {
      setError(toUserMessage(err, "Không thể tải dữ liệu lúc này."));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void doFetch();
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
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[10px] border font-semibold transition-[background-color,border-color,color,transform] duration-150 disabled:cursor-not-allowed disabled:opacity-45 active:translate-y-px";
  const variants = {
    primary:
      "border-[var(--primary)] bg-[var(--primary)] text-white hover:border-[var(--primary-hover)] hover:bg-[var(--primary-hover)]",
    secondary:
      "border-[var(--graphite)] bg-[var(--graphite)] text-white hover:bg-[var(--graphite-soft)]",
    ghost:
      "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--graphite)] hover:text-[var(--graphite)]",
    danger: "border-[var(--danger)] bg-[var(--danger)] text-white hover:brightness-95",
    soft: "border-[var(--primary-border)] bg-[var(--primary-soft)] text-[var(--primary-strong)] hover:bg-[var(--primary-soft-strong)]",
  } as const;
  const sizes = {
    sm: "min-h-11 px-3 text-xs",
    md: "min-h-11 px-4 text-sm",
    lg: "min-h-12 px-5 text-sm",
  } as const;

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
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
  const paddings = { none: "", sm: "p-4", md: "p-5", lg: "p-5 sm:p-6" } as const;
  return (
    <div className={cn("surface-card rounded-[14px]", paddings[padding], className)}>
      {children}
    </div>
  );
}

export const Panel = Card;

export function PageHeader({
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
    <header className="page-header">
      <div className="min-w-0">
        {eyebrow && <p className="lab-eyebrow">{eyebrow}</p>}
        <h1 className="mt-2 text-[clamp(1.65rem,3vw,2.55rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-[var(--graphite)]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)] sm:text-[15px]">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="page-header__action shrink-0">{action}</div>}
    </header>
  );
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
      <div className="min-w-0">
        {eyebrow && <p className="lab-eyebrow">{eyebrow}</p>}
        <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[var(--graphite)] sm:text-xl">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const controlClass =
  "w-full rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-3 text-[15px] text-[var(--text-primary)] transition-[border-color,box-shadow,background-color] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_var(--primary-ring)]";

export function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClass, className)} {...props} />;
}

export function TextArea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlClass, "min-h-28 resize-y", className)} {...props} />;
}

export function FieldLabel({
  className = "",
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-2 block text-xs font-semibold text-[var(--text-secondary)]", className)}
      {...props}
    >
      {children}
    </label>
  );
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
    default: "border-[var(--border-strong)] bg-[var(--surface-muted)] text-[var(--text-secondary)]",
    success: "border-[var(--primary-border)] bg-[var(--primary-soft)] text-[var(--primary-strong)]",
    warning: "border-amber-300/70 bg-[var(--warning-soft)] text-amber-800",
    danger: "border-red-200 bg-[var(--danger-soft)] text-[var(--danger)]",
    accent: "border-cyan-200 bg-cyan-50 text-cyan-800",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const StatusBadge = Badge;

export function Tabs({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex min-w-0 gap-1 overflow-x-auto rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-1",
        className,
      )}
      role="tablist"
      tabIndex={-1}
      {...props}
      onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        const tabs = Array.from(
          event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'),
        );
        if (!tabs.length) return;
        event.preventDefault();
        const current = Math.max(0, tabs.indexOf(document.activeElement as HTMLButtonElement));
        const nextIndex =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? tabs.length - 1
              : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
        tabs[nextIndex]?.focus();
        tabs[nextIndex]?.click();
      }}
    >
      {children}
    </div>
  );
}

export function TabButton({
  active,
  className = "",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      className={cn(
        "min-h-11 shrink-0 rounded-[8px] border px-3.5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        active
          ? "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--graphite)]"
          : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]",
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
  returnFocus,
}: {
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
  title?: string;
  returnFocus?: HTMLElement | null;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const returnFocusRef = useRef(returnFocus);
  onCloseRef.current = onClose;
  returnFocusRef.current = returnFocus;

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const getFocusable = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter(
        (element) =>
          !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true",
      );

    const focusTarget = getFocusable()[0] ?? dialogRef.current;
    window.requestAnimationFrame(() => focusTarget?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onCloseRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      const explicitTarget = returnFocusRef.current;
      (explicitTarget?.isConnected ? explicitTarget : previouslyFocused)?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex min-h-0 items-center justify-center overflow-hidden p-2 sm:p-5">
      {onClose && (
        <button
          type="button"
          className="absolute inset-0 bg-[#0d1411]/70"
          onClick={onClose}
          aria-label="Đóng hộp thoại"
        />
      )}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={cn(
          "relative w-full max-w-2xl rounded-[14px] border border-white/15 bg-[var(--surface)] shadow-[0_24px_70px_rgba(10,18,14,0.24)]",
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {children}
      </div>
    </div>
  );
}

export const Dialog = ModalShell;

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
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-5 sm:px-6">
      <div className="min-w-0">
        {badge}
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-[var(--graphite)] sm:text-2xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">{subtitle}</p>
        )}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="rounded-[8px] border border-[var(--border-strong)] bg-[var(--surface)] p-2 text-[var(--text-muted)] hover:text-[var(--graphite)]"
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={cn("shimmer-surface rounded-[10px]", className)} aria-hidden="true" />;
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-[14px]", className)}>
      <Skeleton className="aspect-[4/3] w-full" />
    </div>
  );
}

export function SkeletonRow({ className = "" }: { className?: string }) {
  return <Skeleton className={cn("h-12 rounded-[10px]", className)} />;
}

function StateShell({
  icon,
  title,
  message,
  action,
  role,
}: {
  icon: React.ReactNode;
  title: string;
  message?: string;
  action?: React.ReactNode;
  role?: "alert" | "status";
}) {
  return (
    <div className="state-shell" role={role}>
      <div className="state-shell__icon">{icon}</div>
      <div className="max-w-md">
        <p className="font-semibold text-[var(--graphite)]">{title}</p>
        {message && <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{message}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorRetry({
  message,
  onRetry,
  title = "Không thể tải nội dung",
}: {
  message?: string;
  onRetry: () => void;
  title?: string;
}) {
  const { t } = useTranslation();
  return (
    <StateShell
      role="alert"
      icon={<AlertCircle className="h-5 w-5" />}
      title={title}
      message={message || t("common.errorRetry")}
      action={
        <Button onClick={onRetry} variant="secondary">
          {t("common.tryAgain")}
        </Button>
      }
    />
  );
}

export function ErrorState(props: { title: string; message?: string; action?: React.ReactNode }) {
  return <StateShell role="alert" icon={<AlertCircle className="h-5 w-5" />} {...props} />;
}

export function OfflineState(props: { title: string; message?: string; action?: React.ReactNode }) {
  return <StateShell icon={<WifiOff className="h-5 w-5" />} {...props} />;
}

export function LoadingSpinner({
  message = "Đang tải…",
  subtitle,
}: {
  message?: string;
  subtitle?: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-10 text-center"
      role="status"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[var(--primary-border)] bg-[var(--primary-soft)] text-[var(--primary)]">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--text-secondary)]">{message}</p>
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
    <StateShell
      icon={icon || <Inbox className="h-5 w-5" />}
      title={title}
      message={subtitle}
      action={
        action ? (
          <Button onClick={action.onClick} variant="soft">
            {action.label} <ArrowRight className="h-4 w-4" />
          </Button>
        ) : undefined
      }
    />
  );
}

export function DataTable({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-[14px] border border-[var(--border-subtle)]",
        className,
      )}
    >
      {children}
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
    <div className="page-container">
      <PageHeader
        eyebrow={badge ? undefined : "BMO Material Lab"}
        title={title}
        subtitle={subtitle}
        action={action}
      />
      {badge && <div className="-mt-4">{badge}</div>}
      {children}
    </div>
  );
}

export function FeaturePlaceholder({ title }: { title: string }) {
  return <EmptyState icon={<Sparkles className="h-5 w-5" />} title={title} />;
}
