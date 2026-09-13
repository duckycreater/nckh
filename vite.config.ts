import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const CACHE_VERSION = "v3";

/**
 * vite.config.ts
 *
 * PWA strategy (Phase 2.5 of web_app_core_upgrade plan):
 *   - app-shell   : precache HTML/JS/CSS for offline cold-start.
 *   - static-models: ONNX/TF.js weights cached in a dedicated CacheStorage
 *                    so we never re-download hundreds of MB on flaky networks.
 *   - api-data    : stale-while-revalidate for province list, locale files,
 *                    and model manifest endpoints.
 *   - background-sync: pending scan uploads retry on network restore.
 */

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        strategies: "generateSW",
        injectRegister: "auto",
        manifest: {
          name: "BMO Robot – Phân loại rác",
          short_name: "BMO",
          description:
            "Robot phân loại rác thải bằng AI, có học federated và bảo vệ quyền riêng tư.",
          theme_color: "#059669",
          background_color: "#0f172a",
          display: "standalone",
          start_url: "/",
          scope: "/",
          lang: "vi",
          icons: [
            // Layer 1.8 — every icon entry gets `purpose: "any maskable"`
            // so the install prompt and the home-screen launcher both
            // render correctly on Android 12+ adaptive icons.
            {
              src: "/icons/icon-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any maskable",
            },
            {
              src: "/icons/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
            {
              src: "/icons/icon-maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          // Force a one-time cache namespace migration after the app moved
          // from Google Fonts to self-hosted fonts. Otherwise an older
          // bmo-app-shell cache can keep serving CSS that still imports the
          // blocked Google Fonts stylesheet.
          cleanupOutdatedCaches: true,
          importScripts: ["/sw-legacy-cleanup.js"],
          // 3 cache buckets with very different lifetimes.
          runtimeCaching: [
            {
              // App shell — short cache, network-first so updates land quickly.
              urlPattern: ({ request }) => request.destination === "document",
              handler: "NetworkFirst",
              options: {
                cacheName: `bmo-app-shell-${CACHE_VERSION}`,
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 7 },
              },
            },
            {
              // JS / CSS / workers — StaleWhileRevalidate so cached chunks stay
              // available offline, but updates appear after refresh.
              urlPattern: ({ url, request }) =>
                url.origin === self.location.origin &&
                ["script", "style", "worker"].includes(request.destination),
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: `bmo-app-shell-${CACHE_VERSION}`,
                expiration: { maxEntries: 256, maxAgeSeconds: 60 * 60 * 24 * 14 },
              },
            },
            {
              // Self-hosted Roboto woff2 subsets — large files, cache
              // aggressively so the offline cold-start still renders text
              // correctly on first paint.
              urlPattern: /\/fonts\/.*\.woff2$/,
              handler: "CacheFirst",
              options: {
                cacheName: `bmo-fonts-${CACHE_VERSION}`,
                expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // ML model weights — large files, cache aggressively.
              // Path matches /models/* which is where ONNX/TF.js weights live.
              urlPattern: /\/models\//,
              handler: "CacheFirst",
              options: {
                cacheName: `bmo-static-models-${CACHE_VERSION}`,
                expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Model manifest endpoints — small JSON, SWR for fresh versions.
              urlPattern: ({ url }) => url.pathname.startsWith("/api/models/"),
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: `bmo-api-data-${CACHE_VERSION}`,
                expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 },
              },
            },
            {
              // Other API GETs that are safe to cache (provinces, locale, impact summary).
              urlPattern: ({ url, request }) =>
                request.method === "GET" &&
                url.pathname.startsWith("/api/") &&
                // Never cache authenticated responses in a shared browser
                // cache; bearer tokens identify a different participant.
                !request.headers.has("authorization") &&
                !url.pathname.startsWith("/api/chat") &&
                !url.pathname.startsWith("/api/federated/submit"),
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: `bmo-api-data-${CACHE_VERSION}`,
                expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 6 },
              },
            },
            {
              // Images / icons — long-lived.
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
              handler: "CacheFirst",
              options: {
                cacheName: `bmo-images-${CACHE_VERSION}`,
                expiration: { maxEntries: 128, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
          navigateFallback: "/offline.html",
          navigateFallbackDenylist: [/^\/api\//],
          globPatterns: ["**/*.{js,css,html,svg,png,webp,ico,woff,woff2}"],
          // Hero portraits are loaded only when a card is visible. Keeping the
          // full roster out of the install precache prevents a multi-megabyte
          // first visit and avoids old artwork getting stuck in the app shell.
          globIgnores: ["assets/bmo/cards/heroes/**"],
        },
        devOptions: { enabled: false },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    server: {
      port: 5173,
      host: true,
      proxy: {
        "/api": {
          // Default to localhost for cross-platform dev. Override with
          // VITE_API_PROXY (e.g. http://192.168.1.10:3000) when the dev
          // server runs on a phone or another machine on the LAN.
          target: process.env.VITE_API_PROXY || "http://localhost:3000",
          changeOrigin: true,
        },
      },
      hmr: process.env.DISABLE_HMR !== "true",
      watch:
        process.env.DISABLE_HMR === "true"
          ? null
          : {
              ignored: ["**/data.json"],
            },
    },
  };
});
