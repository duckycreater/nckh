const UPDATE_INTERVAL_MS = 5 * 60 * 1000;
const AUTO_APPLY_SECONDS = 30;
const RELOAD_GUARD_KEY = "bmo:last-worker-reload";
const RELOAD_GUARD_MS = 15_000;

export interface AppUpdateSnapshot {
  available: boolean;
  applying: boolean;
  secondsRemaining: number;
  deferredForActivity: boolean;
}

let snapshot: AppUpdateSnapshot = {
  available: false,
  applying: false,
  secondsRemaining: AUTO_APPLY_SECONDS,
  deferredForActivity: false,
};
let registration: ServiceWorkerRegistration | null = null;
let countdown: number | null = null;
const listeners = new Set<() => void>();
const criticalActivities = new Set<string>();
const tabId = typeof crypto !== "undefined" ? crypto.randomUUID() : String(Math.random());
const remoteActivity = new Map<string, number>();
const ACTIVITY_TTL_MS = 10_000;
let activityChannel: BroadcastChannel | null = null;

function ensureActivityCoordination() {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined" || activityChannel) {
    return;
  }
  activityChannel = new BroadcastChannel("bmo-critical-activity-v1");
  activityChannel.addEventListener("message", (event) => {
    const message = event.data as { tabId?: unknown; active?: unknown; timestamp?: unknown };
    if (typeof message.tabId !== "string" || message.tabId === tabId) return;
    if (message.active === true) remoteActivity.set(message.tabId, Number(message.timestamp) || Date.now());
    else remoteActivity.delete(message.tabId);
    updateDeferredState();
  });
  window.setInterval(() => {
    const now = Date.now();
    for (const [remoteTab, timestamp] of remoteActivity) {
      if (now - timestamp > ACTIVITY_TTL_MS) remoteActivity.delete(remoteTab);
    }
    if (criticalActivities.size > 0) {
      activityChannel?.postMessage({ tabId, active: true, timestamp: now });
    }
    updateDeferredState();
  }, 3_000);
  window.addEventListener("pagehide", () => {
    activityChannel?.postMessage({ tabId, active: false, timestamp: Date.now() });
  });
}

function activityBlocked(): boolean {
  const now = Date.now();
  for (const [remoteTab, timestamp] of remoteActivity) {
    if (now - timestamp > ACTIVITY_TTL_MS) remoteActivity.delete(remoteTab);
  }
  return criticalActivities.size > 0 || remoteActivity.size > 0;
}

function updateDeferredState() {
  const blocked = activityBlocked();
  if (snapshot.available && snapshot.deferredForActivity !== blocked) {
    emit({ deferredForActivity: blocked });
  }
  if (!blocked && snapshot.available && snapshot.secondsRemaining <= 0) applyAppUpdate();
}

function emit(next: Partial<AppUpdateSnapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

export function subscribeToAppUpdate(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAppUpdateSnapshot() {
  return snapshot;
}

export function hasAppCriticalActivity() {
  return activityBlocked();
}

export function setAppCriticalActivity(key: string, active: boolean) {
  ensureActivityCoordination();
  if (active) criticalActivities.add(key);
  else criticalActivities.delete(key);
  activityChannel?.postMessage({
    tabId,
    active: criticalActivities.size > 0,
    timestamp: Date.now(),
  });
  updateDeferredState();
}

function reloadForNewWorker(): void {
  const now = Date.now();
  const lastReload = Number(window.sessionStorage.getItem(RELOAD_GUARD_KEY) || 0);
  if (Number.isFinite(lastReload) && now - lastReload < RELOAD_GUARD_MS) return;
  window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));
  window.location.reload();
}

function stopCountdown() {
  if (countdown !== null) window.clearInterval(countdown);
  countdown = null;
}

function announceUpdate(nextRegistration: ServiceWorkerRegistration) {
  registration = nextRegistration;
  if (snapshot.available || snapshot.applying) return;
  emit({
    available: true,
    applying: false,
    secondsRemaining: AUTO_APPLY_SECONDS,
    deferredForActivity: activityBlocked(),
  });
  stopCountdown();
  countdown = window.setInterval(() => {
    const nextSeconds = Math.max(0, snapshot.secondsRemaining - 1);
    emit({ secondsRemaining: nextSeconds, deferredForActivity: activityBlocked() });
    if (nextSeconds === 0) {
      stopCountdown();
      if (!activityBlocked()) applyAppUpdate();
    }
  }, 1000);
}

export function applyAppUpdate() {
  if (!registration?.waiting || snapshot.applying) return;
  if (activityBlocked()) {
    emit({ secondsRemaining: 0, deferredForActivity: true });
    return;
  }
  stopCountdown();
  emit({ applying: true, deferredForActivity: false });
  registration.waiting.postMessage({ type: "SKIP_WAITING" });
}

/**
 * Register the production service worker and actively look for deployments.
 * A new worker is announced to the UI, then applied after a short countdown.
 * Mutating scan/redemption operations can defer activation so a reload never
 * interrupts a point transaction or discards a selected image.
 */
export async function installAppUpdateManager(): Promise<void> {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  ensureActivityCoordination();

  let hadController = Boolean(navigator.serviceWorker.controller);
  let reloadStarted = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController) {
      hadController = true;
      return;
    }
    if (reloadStarted) return;
    reloadStarted = true;
    reloadForNewWorker();
  });

  try {
    registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });

    const checkForUpdate = () => {
      void registration?.update().catch((error: unknown) => {
        console.warn("[PWA] Update check failed", error);
      });
    };

    if (registration.waiting && navigator.serviceWorker.controller) announceUpdate(registration);
    registration.addEventListener("updatefound", () => {
      const installing = registration?.installing;
      installing?.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller && registration) {
          announceUpdate(registration);
        }
      });
    });

    checkForUpdate();
    window.setInterval(checkForUpdate, UPDATE_INTERVAL_MS);
    window.addEventListener("online", checkForUpdate);
    window.addEventListener("focus", checkForUpdate);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdate();
    });
  } catch (error) {
    console.warn("[PWA] Service worker registration failed", error);
  }
}
