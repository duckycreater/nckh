import React, { useSyncExternalStore } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  applyAppUpdate,
  getAppUpdateSnapshot,
  subscribeToAppUpdate,
} from "../services/appUpdateManager";
import { Button } from "../lib/ui";

export function AppUpdateNotice() {
  const { t } = useTranslation();
  const update = useSyncExternalStore(
    subscribeToAppUpdate,
    getAppUpdateSnapshot,
    getAppUpdateSnapshot,
  );
  if (!update.available) return null;

  return (
    <aside
      className="fixed bottom-20 left-3 right-3 z-[100] mx-auto max-w-xl rounded-[14px] border border-white/15 bg-[var(--graphite)] p-4 text-white shadow-[var(--shadow-panel)] lg:bottom-5"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-white/15 bg-white/[0.06] text-[var(--signal)]">
          {update.applying ? <RefreshCw className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{t("lab.update.title")}</p>
          <p className="mt-1 text-xs leading-5 text-[#aeb9b2]">
            {update.deferredForActivity
              ? t("lab.update.waiting")
              : update.applying
                ? t("lab.update.applying")
                : t("lab.update.countdown", { seconds: update.secondsRemaining })}
          </p>
        </div>
        <Button
          size="sm"
          onClick={applyAppUpdate}
          disabled={update.applying || update.deferredForActivity}
          className="border-[var(--signal)] bg-[var(--signal)] text-[var(--graphite)] hover:border-[#c8e762] hover:bg-[#c8e762]"
        >
          {t("lab.update.action")}
        </Button>
      </div>
    </aside>
  );
}
