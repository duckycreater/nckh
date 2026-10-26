// Remove runtime caches created before the app switched to self-hosted fonts
// and valid PWA icons. Workbox's cleanupOutdatedCaches only covers precache
// entries, not custom runtime cache names.
self.addEventListener('activate', (event) => {
  const currentVersion = '__BMO_CACHE_VERSION__';
  const keep = new Set([
    `bmo-app-shell-${currentVersion}`,
    `bmo-fonts-${currentVersion}`,
    `bmo-static-models-${currentVersion}`,
    `bmo-api-data-${currentVersion}`,
    `bmo-images-${currentVersion}`,
  ]);

  event.waitUntil((async () => {
    const keys = await caches.keys();
    const outdatedKeys = keys.filter((key) => key.startsWith('bmo-') && !keep.has(key));
    await Promise.all(outdatedKeys.map((key) => caches.delete(key)));

    // An already-open tab can still be executing the previous bundle when a
    // new worker activates. During an actual cache migration, claim and
    // navigate those tabs so even clients running the old registration script
    // immediately request the new precached index.html.
    if (outdatedKeys.length > 0) {
      await self.clients.claim();
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      await Promise.all(
        windows.map((client) => client.navigate(client.url).catch(() => undefined)),
      );
    }
  })());
});
