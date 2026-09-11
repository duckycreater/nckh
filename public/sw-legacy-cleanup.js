// Remove runtime caches created before the app switched to self-hosted fonts
// and valid PWA icons. Workbox's cleanupOutdatedCaches only covers precache
// entries, not custom runtime cache names.
self.addEventListener('activate', (event) => {
  const keep = new Set([
    'bmo-app-shell-v2',
    'bmo-fonts-v2',
    'bmo-static-models-v2',
    'bmo-api-data-v2',
    'bmo-images-v2',
  ]);

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('bmo-') && !keep.has(key))
          .map((key) => caches.delete(key)),
      ),
    ),
  );
});
