import "dotenv/config";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { initDb } from "../server/db";
import { runSchema } from "../server/schema";
import {
  syncProfileVerification,
  syncResearchProfile,
  syncSchoolClasses,
} from "../server/services/profileStandardization";
import {
  isProfileVerificationStatus,
  isGradeEightClass,
  type ProfileVerificationStatus,
} from "../shared/profileStandardization";
import { defaultSchoolClasses } from "../shared/school";

interface StoredUser {
  account_id?: string;
  nick?: string;
  name?: string;
  fullName?: string;
  classId?: string;
  classGrade?: string;
  role?: string;
  points?: number;
  totalExpEarned?: number;
  profileVerificationStatus?: ProfileVerificationStatus;
  profileUpdatedAt?: number;
  profileVerifiedAt?: number;
}

function serviceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT is required.");
  const decoded = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  const account = JSON.parse(decoded);
  account.private_key = String(account.private_key || "").replace(/\\n/g, "\n");
  return account;
}

async function existingSupabaseStatuses(): Promise<Map<string, ProfileVerificationStatus>> {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return new Map();
  const response = await fetch(
    `${url}/rest/v1/research_users?select=user_id,profile_verification_status&limit=5000`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!response.ok) return new Map();
  const rows = (await response.json()) as Array<{
    user_id?: string;
    profile_verification_status?: unknown;
  }>;
  return new Map(
    rows
      .filter(
        (row) =>
          typeof row.user_id === "string" &&
          isProfileVerificationStatus(row.profile_verification_status),
      )
      .map((row) => [row.user_id!, row.profile_verification_status as ProfileVerificationStatus]),
  );
}

async function main() {
  const apply = process.argv.includes("--apply");
  if (!getApps().length) initializeApp({ credential: cert(serviceAccount()) });
  const firestore = getFirestore();
  const [usersSnapshot, classesSnapshot, existingStatuses] = await Promise.all([
    firestore.collection("users").get(),
    firestore.collection("school_classes").get(),
    existingSupabaseStatuses(),
  ]);
  const users = usersSnapshot.docs
    .map((document) => ({ ref: document.ref, user: document.data() as StoredUser }))
    .filter(({ user }) => Boolean(user.account_id && user.nick && user.name));
  const gradeEightClasses = defaultSchoolClasses().filter((schoolClass) => schoolClass.grade === 8);
  const storedClassIds = new Set(classesSnapshot.docs.map((document) => document.id));
  const missingClasses = gradeEightClasses.filter(
    (schoolClass) => !storedClassIds.has(schoolClass.id),
  );

  let pending = 0;
  let preserved = 0;
  const normalized = users.map(({ ref, user }) => {
    const remoteStatus = user.account_id ? existingStatuses.get(user.account_id) : undefined;
    const currentStatus = isProfileVerificationStatus(user.profileVerificationStatus)
      ? user.profileVerificationStatus
      : remoteStatus;
    const status: ProfileVerificationStatus =
      currentStatus ||
      (isGradeEightClass(user.classGrade) && user.fullName && user.classId
        ? "pending"
        : "unverified");
    if (currentStatus) preserved += 1;
    else if (status === "pending") pending += 1;
    return { ref, user, status };
  });

  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        firestoreUsers: users.length,
        gradeEightClasses: gradeEightClasses.length,
        missingGradeEightClasses: missingClasses.length,
        profilesSetPending: pending,
        statusesPreserved: preserved,
      },
      null,
      2,
    ),
  );
  if (!apply) return;

  const researchReady = await initDb();
  if (!researchReady) throw new Error("Supabase research database is not available.");
  await runSchema();

  if (missingClasses.length) {
    const classBatch = firestore.batch();
    for (const schoolClass of missingClasses) {
      classBatch.set(firestore.collection("school_classes").doc(schoolClass.id), schoolClass);
    }
    await classBatch.commit();
  }
  await syncSchoolClasses(gradeEightClasses);

  for (let offset = 0; offset < normalized.length; offset += 300) {
    const chunk = normalized.slice(offset, offset + 300);
    const batch = firestore.batch();
    for (const { ref, user, status } of chunk) {
      if (!isProfileVerificationStatus(user.profileVerificationStatus)) {
        batch.set(
          ref,
          { profileVerificationStatus: status, profileUpdatedAt: Date.now() },
          { merge: true },
        );
      }
    }
    await batch.commit();
  }

  let synced = 0;
  for (let offset = 0; offset < normalized.length; offset += 8) {
    const chunk = normalized.slice(offset, offset + 8);
    await Promise.all(
      chunk.map(async ({ user, status }) => {
        await syncResearchProfile({
          accountId: user.account_id!,
          nickname: user.nick!,
          displayName: user.name!,
          fullName: user.fullName,
          classId: user.classId,
          classGrade: user.classGrade,
          role: user.role,
          points: user.points,
          totalExpEarned: user.totalExpEarned,
          profileVerificationStatus: status,
          profileUpdatedAt: user.profileUpdatedAt,
          profileVerifiedAt: user.profileVerifiedAt,
        });
        await syncProfileVerification({
          accountId: user.account_id!,
          fullName: user.fullName,
          classId: user.classId,
          classGrade: user.classGrade,
          status,
          submittedAt: user.profileUpdatedAt,
          verifiedAt: user.profileVerifiedAt,
        });
        synced += 1;
      }),
    );
  }
  console.log(
    JSON.stringify({ applied: true, syncedProfiles: synced, seededClasses: missingClasses.length }),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
