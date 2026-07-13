/**
 * pendingScanQueue.ts — Persistent queue of scans that couldn't reach
 * the server (offline / slow network). The Service Worker uses
 * Background Sync to replay them when connectivity returns.
 *
 * Public API:
 *   - enqueue(payload)   : add a pending scan to IndexedDB
 *   - list()             : inspect queued scans (debug / audit)
 *   - clear()            : drop the queue
 *
 * Scans stored as plain JSON; image data is the EXIF-stripped base64 the
 * user has already consented to upload.
 */

const DB_NAME = "bmo-pending-scans";
const DB_VERSION = 1;
const STORE = "scans";

interface PendingScan {
  id: string;
  endpoint: string;
  body: string;          // serialised JSON to avoid IDBStructuredClone quirks
  createdAt: number;
  attempts: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, {keyPath: "id"});
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueue(endpoint: string, body: unknown): Promise<PendingScan> {
  const db = await openDb();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const record: PendingScan = {
    id,
    endpoint,
    body: JSON.stringify(body),
    createdAt: Date.now(),
    attempts: 0,
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  await requestBackgroundSync();
  return record;
}

export async function list(): Promise<PendingScan[]> {
  try {
    const db = await openDb();
    return await new Promise<PendingScan[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve((req.result as PendingScan[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function clear(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

export async function replay(): Promise<{ sent: number; failed: number }> {
  const pending = await list();
  let sent = 0;
  let failed = 0;
  for (const p of pending) {
    try {
      const body = JSON.parse(p.body);
      const r = await fetch(p.endpoint, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(body),
      });
      if (r.ok) {
        await remove(p.id);
        sent++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }
  return {sent, failed};
}

async function remove(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* Background Sync trigger — best-effort. Older browsers ignore the call. */
async function requestBackgroundSync(): Promise<void> {
  try {
    // Dynamic import to avoid SSR / old browsers breaking the bundle.
    const reg = await navigator.serviceWorker?.ready;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sync = (reg as any)?.sync;
    if (sync && typeof sync.register === "function") {
      await sync.register("replay-pending-scans");
    }
  } catch {
    // Background Sync not supported — replay on next online event instead.
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => void replay(), {once: true});
    }
  }
}