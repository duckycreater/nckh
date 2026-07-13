# ADR 0005 — PWA + Workbox for installation & offline study

- **Status:** Accepted (2026-04)
- **Deciders:** BMO engineering
- **Context drivers:** Schools in rural Vietnam often share
  Chromebooks and have intermittent Wi-Fi. Many pupils lack a personal
  smartphone, and the public-app-store release cycle (weeks) is too
  slow for an iterative ISEF study.

## Context

We needed an app that:

1. Installs on a Chromebook with a single click (no Play Store release
   cycle).
2. Works offline for at least 24 h so a class can keep using it across
   a power outage.
3. Updates atomically across all installed instances when we ship a
   model fix.
4. Plays nicely with the school's content blockers (no third-party
   trackers, no large CDN dependencies).

We considered:

1. **Plain Vite SPA + manual cache.** Simple to ship, but Chrome no
   longer shows an "install" prompt and offline is brittle.
2. **Capacitor wrapper → APK.** Heavy; bypasses school MDM; updates
   need Play Store distribution.
3. **PWA + Workbox + service worker.** Single install, offline cache,
   atomic updates with the `workbox-window` plugin; already part of
   the `vite-plugin-pwa` ecosystem.

## Decision

Adopt **option 3 (PWA + Workbox)** with `vite-plugin-pwa`:

- Manifest with `display: standalone` + 512-px maskable icon.
- Service worker via Workbox with cache strategies:
  - `CacheFirst` for `/models/*.onnx` (large, immutable per version).
  - `StaleWhileRevalidate` for JS + CSS bundles.
  - `NetworkFirst` for `/api/*` with a `BackgroundSync` queue for
    offline scans (`src/services/pendingScanQueue.ts`).
- Atomic activation: when a new SW is available, we wait for
  `SKIP_WAITING` only when the user is idle (so we don't break a scan).
- The dataset capture pipeline is queued, not blocked, when offline.

## Consequences

- **Good:** A single deployment URL serves every installation; updates
  ship in minutes.
- **Good:** Model files persist in the cache, so the second load is
  instant.
- **Good:** No app-store review cycle.
- **Bad:** iOS Safari's PWA support is incomplete (no background sync,
  limited cache quota). Acceptable: our deployments are Android /
  Chromebook.
- **Bad:** Service-worker bugs can be hard to diagnose in the field.
  We log SW errors to `/api/health/client` for monitoring.

## Validation

- `scripts/smoke.sh` boots `dist/`, opens the PWA, and verifies
  `/sw.js` is reachable.
- `tests/e2e/privacy.spec.ts` exercises the Privacy Budget Meter,
  which relies on the service worker for the local FL accumulator.

## Alternatives considered

- **Tauri / Electron wrapper.** Rejected: distribution story
  identical, but 100 MB larger binary.