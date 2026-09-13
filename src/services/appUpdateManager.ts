const UPDATE_INTERVAL_MS = 5 * 60 * 1000;
const RELOAD_GUARD_KEY = "bmo:last-worker-reload";
const RELOAD_GUARD_MS = 15_000;

function reloadForNewWorker(): void {
  const now = Date.now();
  const lastReload = Number(window.sessionStorage.getItem(RELOAD_GUARD_KEY) || 0);
  if (Number.isFinite(lastReload) && now - lastReload < RELOAD_GUARD_MS) return;
  window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));
  window.location.reload();
}

/**
 * Register the production service worker and actively look for deployments.
 *
 * Browsers are allowed to delay automatic service-worker update checks. We
 * explicitly check at startup, on reconnect, when a tab returns to the
 * foreground, and every five minutes while it remains open. A newly activated
 * worker takes control immediately and reloads an already-controlled page once
 * so HTML and hashed chunks always belong to the same deployment.
 */
export async function installAppUpdateManager(): Promise<void> {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  let hadController = Boolean(navigator.serviceWorker.controller);
  let reloadStarted = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // The first install may claim an uncontrolled page. It already loaded the
    // current build, so only subsequent controller changes require a refresh.
    if (!hadController) {
      hadController = true;
      return;
    }
    if (reloadStarted) return;
    reloadStarted = true;
    reloadForNewWorker();
  });

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });

    const activateWaitingWorker = () => {
      if (registration.waiting && navigator.serviceWorker.controller) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }
    };
    const checkForUpdate = () => {
      void registration.update().catch((error: unknown) => {
        console.warn("[PWA] Update check failed", error);
      });
    };

    activateWaitingWorker();
    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      installing?.addEventListener("statechange", () => {
        if (installing.state === "installed") activateWaitingWorker();
      });
    });

    checkForUpdate();
    window.setInterval(checkForUpdate, UPDATE_INTERVAL_MS);
    window.addEventListener("online", checkForUpdate);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdate();
    });
  } catch (error) {
    // The web app must still boot if service-worker registration is unavailable
    // (private browsing policies, disabled storage, or an unsupported origin).
    console.warn("[PWA] Service worker registration failed", error);
  }
}
