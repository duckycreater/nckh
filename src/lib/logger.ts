/**
 * src/lib/logger.ts
 *
 * Centralized logging utility.
 *
 * In production: only warn/error logs are sent to console.
 * In development: all logs are shown.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.debug("Component mounted", { props });
 *   logger.warn("API returned non-2xx", { status });
 *   logger.error("Failed to load data", error);
 *
 * For production-grade observability, hook this into a remote service
 * (Sentry, Datadog, etc.) by replacing the noop functions here.
 */

// Detect production: Vite sets import.meta.env.PROD, Node sets NODE_ENV.
// Use optional chaining and type guards to avoid "Cannot find name 'process'"
// errors when @types/node is not installed.
const isProd: boolean = (() => {
  try {
    if (typeof import.meta !== "undefined") {
      const env = (import.meta as { env?: { PROD?: boolean } }).env;
      if (env?.PROD) return true;
    }
  } catch {
    // ignore
  }
  try {
    const g = globalThis as { process?: { env?: { NODE_ENV?: string } } };
    if (g.process?.env?.NODE_ENV === "production") return true;
  } catch {
    // ignore
  }
  return false;
})();

export interface LogContext {
  [key: string]: unknown;
}

/**
 * Format a log entry with timestamp, level, message, and context.
 * Structured logs are easier to parse in log aggregation tools.
 */
function format(level: string, message: string, context?: LogContext | unknown): string {
  const ts = new Date().toISOString();
  const ctx = context ? ` ${JSON.stringify(context)}` : "";
  return `[${ts}] ${level} ${message}${ctx}`;
}

export const logger = {
  /**
   * Debug-level logs. Only shown in development.
   * Use for verbose tracing during development.
   */
  debug(message: string, context?: LogContext): void {
    if (isProd) return; // No-op in production
    // eslint-disable-next-line no-console
    console.debug(format("DEBUG", message, context));
  },

  /**
   * Info-level logs. Only shown in development.
   * Use for notable events like user actions.
   */
  info(message: string, context?: LogContext): void {
    if (isProd) return; // No-op in production
    // eslint-disable-next-line no-console
    console.info(format("INFO", message, context));
  },

  /**
   * Warning logs. Always shown.
   * Use for non-critical issues that should be investigated.
   */
  warn(message: string, context?: LogContext | unknown): void {
    // eslint-disable-next-line no-console
    console.warn(format("WARN", message, context));
  },

  /**
   * Error logs. Always shown.
   * Use for errors that affect functionality.
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    // eslint-disable-next-line no-console
    console.error(
      format("ERROR", message, {
        error: error instanceof Error ? error.message : error,
        ...context,
      }),
    );
  },

  /**
   * Send to a remote logging service (Sentry, etc.).
   * Currently a stub; extend when integrating an error tracker.
   */
  report(message: string, context?: LogContext): void {
    if (
      typeof window !== "undefined" &&
      (window as { sentry?: { captureMessage: (msg: string, ctx?: object) => void } }).sentry
    ) {
      try {
        (
          window as { sentry?: { captureMessage: (msg: string, ctx?: object) => void } }
        ).sentry!.captureMessage(message, { extra: context });
      } catch {
        // Sentry unavailable - ignore
      }
    }
  },
};
