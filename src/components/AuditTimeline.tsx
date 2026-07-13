/**
 * AuditTimeline.tsx — Per-user timeline of privacy-relevant events.
 *
 * Reads from /api/audit/timeline (cursor-paginated).  Each row
 * explains in plain Vietnamese what happened, so non-technical
 * users can see exactly what the system stored about them.
 *
 * Visual: vertical timeline, no animation, monospace timestamps.
 */

import React, { useEffect, useState } from "react";
import { Shield, Camera, Eye, Mic, MessageCircle, BookOpen, Wallet, Gift } from "lucide-react";
import { useTranslation } from "react-i18next";
import type {AuditEvent} from "../apiContract";

const ICON: Record<string, React.ElementType> = {
  scan: Camera,
  scan_garbage: Camera,
  scan_success: Camera,
  consent: Shield,
  dataset_consent: Shield,
  chat_message: MessageCircle,
  login: Eye,
  logout: Eye,
  reward_claim: Gift,
  reward_spent: Wallet,
  quiz_complete: BookOpen,
  federated_submit: Shield,
};

interface Props {
  className?: string;
  pageSize?: number;
}

export function AuditTimeline({className = "", pageSize = 20}: Props) {
  const { t, i18n } = useTranslation("audit");
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(nextCursor: string | null = null, append = false) {
    setLoading(true);
    setError(null);
    try {
      const path = `/api/audit/timeline?limit=${pageSize}${
        nextCursor ? `&cursor=${encodeURIComponent(nextCursor)}` : ""
      }`;
      const r = await fetch(path, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("bmo_token") || ""}`,
          "Accept-Language": i18n.language || "en",
          "x-bmo-locale": i18n.language || "en",
        },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as {ok: boolean; events: AuditEvent[]; cursor: string | null};
      setEvents((prev) => (append ? [...prev, ...data.events] : data.events));
      setCursor(data.cursor);
      setHasMore(Boolean(data.cursor));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(null, false);
    // Reload when language switches so newly localized descriptions apply.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  if (error) {
    return (
      <div className={`rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 ${className}`}>
        {t("loadError", { error })}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 ${className}`}>
      <div className="mb-3 flex items-center gap-2">
        <Shield size={16} className="text-emerald-600" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          {t("title")}
        </h3>
      </div>
      {events.length === 0 && !loading ? (
        <div className="text-xs italic text-slate-500">{t("empty")}</div>
      ) : (
        <ol className="relative space-y-3 border-l-2 border-slate-200 pl-4 dark:border-slate-700">
          {events.map((e) => (
            <TimelineRow key={e.id} event={e} locale={i18n.language} />
          ))}
        </ol>
      )}
      {hasMore && (
        <button
          onClick={() => load(cursor, true)}
          disabled={loading}
          className="mt-3 w-full rounded border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
        >
          {loading ? t("loading") : t("loadMore")}
        </button>
      )}
    </div>
  );
}

function TimelineRow({event, locale}: {event: AuditEvent; locale?: string}) {
  const Icon = ICON[event.type] || BookOpen;
  return (
    <li className="relative">
      <span className="absolute -left-[26px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-2 ring-slate-300 dark:bg-slate-800 dark:ring-slate-600">
        <Icon size={10} className="text-slate-500" />
      </span>
      <div className="flex items-baseline gap-2">
        <time className="font-mono text-[10px] text-slate-500">
          {new Date(event.ts).toLocaleString(locale)}
        </time>
        <span className="text-[10px] uppercase tracking-wider text-slate-400">
          {event.type}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-200">
        {humanise(event, locale)}
      </p>
    </li>
  );
}

function humanise(e: AuditEvent, locale?: string): string {
  const p = e.payload as Record<string, unknown>;
  // Localised message catalog. Falls back to the key when a translation
  // is missing for the active language (i18n does this automatically).
  // We inline a tiny switch here to avoid cross-namespace t() calls and
  // keep the audit timeline self-contained.
  const msgs: Record<string, string> = {
    scan: `${tr(locale, "audit.messages.scan", "You scanned a sorting image. The system does NOT store the image — only hash")} ${String(p?.image_hash ?? "(hidden)").slice(0, 8)}…`,
    scan_garbage: `${tr(locale, "audit.messages.scan", "You scanned a sorting image. The system does NOT store the image — only hash")} ${String(p?.image_hash ?? "(hidden)").slice(0, 8)}…`,
    scan_success: `${tr(locale, "audit.messages.scan", "You scanned a sorting image. The system does NOT store the image — only hash")} ${String(p?.image_hash ?? "(hidden)").slice(0, 8)}…`,
    consent: p?.consent
      ? tr(locale, "audit.messages.consentGranted", "You consented to dataset contribution (revocable anytime).")
      : tr(locale, "audit.messages.consentRevoked", "You withdrew your dataset consent."),
    dataset_consent: p?.consent
      ? tr(locale, "audit.messages.consentGranted", "You consented to dataset contribution (revocable anytime).")
      : tr(locale, "audit.messages.consentRevoked", "You withdrew your dataset consent."),
    chat_message: `${tr(locale, "audit.messages.chatMessage", "You sent")} ${String(p?.message_length ?? "?")} ${tr(locale, "audit.messages.chatMessageSuffix", "characters to the chatbot.")}`,
    login: tr(locale, "audit.messages.login", "You logged in."),
    logout: tr(locale, "audit.messages.logout", "You logged out."),
    reward_claim: `${tr(locale, "audit.messages.rewardClaim", "You received")} ${String(p?.amount ?? "?")} ${tr(locale, "audit.messages.rewardPoints", "reward points.")}`,
    reward_spent: `${tr(locale, "audit.messages.rewardSpent", "You spent")} ${String(p?.amount ?? "?")} ${tr(locale, "audit.messages.rewardPoints", "reward points.")}`,
    federated_submit: tr(locale, "audit.messages.federatedSubmit", "You contributed 1 federated-learning round (gradient clipped + noised before upload)."),
    quiz_complete: `${tr(locale, "audit.messages.quizComplete", "You completed a quiz.")} ${tr(locale, "audit.messages.score", "Score")} ${String(p?.score ?? "?")}/${String(p?.total ?? "?")}.`,
  };
  return msgs[e.type] ?? `${tr(locale, "audit.messages.fallback", "Event")} ${e.type} ${tr(locale, "audit.messages.recorded", "was recorded.")}`;
}

/**
 * Inline translator that resolves a key against the current i18next instance
 * without forcing this file to depend on every other namespace.
 */
function tr(locale: string | undefined, key: string, fallback: string): string {
  try {
    // Lazy import to keep the file dependency-light.
    const { i18n } = require("../lib/i18n") as { i18n: { t: (k: string, opts?: { lng?: string }) => string } };
    return i18n.t(key, { lng: locale }) ?? fallback;
  } catch {
    return fallback;
  }
}