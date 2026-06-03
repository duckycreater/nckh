import { useState, useEffect, useCallback } from "react";

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
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

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-xl overflow-hidden ${className}`}>
      <Skeleton className="w-full aspect-[2.5/3.5]" />
    </div>
  );
}

export function SkeletonRow({ className = "" }: { className?: string }) {
  return <Skeleton className={`h-12 rounded-lg ${className}`} />;
}

export function ErrorRetry({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <div className="text-red-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <p className="text-slate-500 text-sm font-medium">{message || "Có lỗi xảy ra. Vui lòng thử lại."}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-700 active:scale-95 transition-all"
      >
        Thử lại
      </button>
    </div>
  );
}

export function LoadingSpinner({ message = "Đang tải..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div className="w-8 h-8 border-3 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
      <p className="text-slate-500 text-sm font-medium">{message}</p>
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
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      {icon && <div className="text-slate-300">{icon}</div>}
      <p className="text-slate-500 font-bold">{title}</p>
      {subtitle && <p className="text-slate-400 text-sm">{subtitle}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-700 active:scale-95 transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
