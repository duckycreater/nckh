/**
 * pendingScanQueue.ts — Persistent queue of scans that couldn't reach
 * the server (offline / slow network). Drafts are scoped to an account and
 * must be restored by that authenticated account before verification.
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

export interface PendingScan {
  id: string;
  endpoint: string;
  body: string; // serialised JSON to avoid IDBStructuredClone quirks
  createdAt: number;
  attempts: number;
  ownerId: string;
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
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueue(
  endpoint: string,
  body: unknown,
  ownerId: string,
): Promise<PendingScan> {
  if (!ownerId.trim()) throw new Error("ownerId is required for an offline scan");
  const db = await openDb();
  const id = crypto.randomUUID();
  const record: PendingScan = {
    id,
    endpoint,
    body: JSON.stringify(body),
    createdAt: Date.now(),
    attempts: 0,
    ownerId: ownerId.trim(),
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return record;
}

export async function list(ownerId?: string): Promise<PendingScan[]> {
  try {
    const db = await openDb();
    return await new Promise<PendingScan[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        const scans = ((req.result as PendingScan[]) || []).filter(
          (scan) => !ownerId || scan.ownerId === ownerId,
        );
        resolve(scans);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function clear(ownerId?: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      if (!ownerId) {
        store.clear();
      } else {
        const request = store.openCursor();
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return;
          if ((cursor.value as PendingScan).ownerId === ownerId) cursor.delete();
          cursor.continue();
        };
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

export async function replay(
  ownerId: string,
  authHeaders: HeadersInit,
): Promise<{ sent: number; failed: number }> {
  const pending = await list(ownerId);
  let sent = 0;
  let failed = 0;
  for (const p of pending) {
    try {
      const body = JSON.parse(p.body);
      const r = await fetch(p.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
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
  return { sent, failed };
}

export async function remove(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
