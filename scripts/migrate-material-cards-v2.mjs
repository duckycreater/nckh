#!/usr/bin/env node
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const VERSION = "material-cards-v2";
const execute = process.argv.includes("--execute");
const restoreArg = process.argv.find((argument) => argument.startsWith("--restore="));
const backupRoot = path.resolve(process.cwd(), "backups");

function credential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT is required.");
  const decoded = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  const value = JSON.parse(decoded);
  value.private_key = String(value.private_key).replace(/\\n/g, "\n");
  return value;
}

function pickLegacyFields(data = {}) {
  const progress = data.progress && typeof data.progress === "object" ? data.progress : null;
  return {
    ...(Object.hasOwn(data, "shards") ? { shards: data.shards } : {}),
    ...(progress
      ? {
          progress: {
            flashcardsRead: progress.flashcardsRead,
            flashcardCounts: progress.flashcardCounts,
            flashcardNames: progress.flashcardNames,
            cardLevels: progress.cardLevels,
            gachaPullCount: progress.gachaPullCount,
            shards: progress.shards,
          },
        }
      : {}),
  };
}

if (!getApps().length) initializeApp({ credential: cert(credential()) });
const db = getFirestore();

async function restore(filePath) {
  if (!execute) throw new Error("Restore requires --execute together with --restore=<backup.json>.");
  const backup = JSON.parse(await fs.readFile(path.resolve(filePath), "utf8"));
  if (backup.version !== VERSION || !Array.isArray(backup.userProgress) || !Array.isArray(backup.users)) {
    throw new Error("Backup format is not compatible with this migration.");
  }
  let batch = db.batch();
  let operations = 0;
  const flush = async () => {
    if (!operations) return;
    await batch.commit();
    batch = db.batch();
    operations = 0;
  };
  for (const entry of backup.userProgress) {
    batch.set(db.collection("user_progress").doc(entry.id), entry.data, { merge: false });
    if (++operations >= 400) await flush();
  }
  for (const entry of backup.users) {
    batch.set(db.collection("users").doc(entry.id), entry.legacy, { merge: true });
    if (++operations >= 400) await flush();
  }
  await flush();
  await db.collection("system_migrations").doc(VERSION).set({
    status: "restored",
    restoredFrom: path.basename(filePath),
    restoredAt: Date.now(),
  });
  console.info(`Restored ${backup.userProgress.length} progress documents and ${backup.users.length} user records.`);
}

async function migrate() {
  const [progressSnapshot, usersSnapshot, marker] = await Promise.all([
    db.collection("user_progress").get(),
    db.collection("users").get(),
    db.collection("system_migrations").doc(VERSION).get(),
  ]);
  const affectedUsers = usersSnapshot.docs
    .map((document) => ({ id: document.id, legacy: pickLegacyFields(document.data()) }))
    .filter((entry) => Object.keys(entry.legacy).length > 0);
  const backup = {
    version: VERSION,
    createdAt: new Date().toISOString(),
    retentionUntil: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    userProgress: progressSnapshot.docs.map((document) => ({ id: document.id, data: document.data() })),
    users: affectedUsers,
  };
  console.info(
    `${execute ? "EXECUTE" : "DRY RUN"}: ${backup.userProgress.length} progress docs, ${backup.users.length} embedded user records.`,
  );
  if (!execute) {
    console.info("No data changed. Re-run with --execute after reviewing this count.");
    return;
  }
  if (marker.exists && marker.data()?.status === "completed") {
    console.info("Migration already completed; no data changed.");
    return;
  }
  await fs.mkdir(backupRoot, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupRoot, `${VERSION}-${stamp}.json`);
  await fs.writeFile(backupPath, JSON.stringify(backup, null, 2), { flag: "wx", mode: 0o600 });

  let batch = db.batch();
  let operations = 0;
  const flush = async () => {
    if (!operations) return;
    await batch.commit();
    batch = db.batch();
    operations = 0;
  };
  const deleteLegacy = {
    flashcardsRead: FieldValue.delete(),
    flashcardCounts: FieldValue.delete(),
    flashcardNames: FieldValue.delete(),
    cardLevels: FieldValue.delete(),
    gachaPullCount: FieldValue.delete(),
    shards: FieldValue.delete(),
    legacyCardMigrationVersion: VERSION,
    legacyCardMigratedAt: Date.now(),
  };
  for (const document of progressSnapshot.docs) {
    batch.set(document.ref, deleteLegacy, { merge: true });
    if (++operations >= 400) await flush();
  }
  for (const entry of affectedUsers) {
    batch.update(
      db.collection("users").doc(entry.id),
      {
        shards: FieldValue.delete(),
        "progress.flashcardsRead": FieldValue.delete(),
        "progress.flashcardCounts": FieldValue.delete(),
        "progress.flashcardNames": FieldValue.delete(),
        "progress.cardLevels": FieldValue.delete(),
        "progress.gachaPullCount": FieldValue.delete(),
        "progress.shards": FieldValue.delete(),
        legacyCardMigrationVersion: VERSION,
        legacyCardMigratedAt: Date.now(),
      },
    );
    if (++operations >= 400) await flush();
  }
  await flush();
  await db.collection("system_migrations").doc(VERSION).set({
    status: "completed",
    completedAt: Date.now(),
    backupFile: path.basename(backupPath),
    retentionUntil: backup.retentionUntil,
    progressDocuments: backup.userProgress.length,
    userDocuments: backup.users.length,
  });
  console.info(`Migration completed. Recovery backup: ${backupPath}`);
}

try {
  if (restoreArg) await restore(restoreArg.slice("--restore=".length));
  else await migrate();
  process.exitCode = 0;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
