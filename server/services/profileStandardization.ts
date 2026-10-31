import type { SchoolClass } from "../../shared/school";
import {
  isProfileVerificationStatus,
  type ProfileVerificationStatus,
} from "../../shared/profileStandardization";

export interface ResearchProfileSnapshot {
  accountId: string;
  nickname: string;
  displayName: string;
  fullName?: string | null;
  classId?: string | null;
  classGrade?: string | null;
  role?: string | null;
  points?: number | null;
  totalExpEarned?: number | null;
  profileVerificationStatus?: ProfileVerificationStatus | null;
  profileUpdatedAt?: number | string | null;
  profileVerifiedAt?: number | string | null;
}

export interface ProfileVerificationSnapshot {
  accountId: string;
  fullName?: string | null;
  classId?: string | null;
  classGrade?: string | null;
  status: ProfileVerificationStatus;
  rejectionReason?: string | null;
  submittedAt?: number | string | null;
  verifiedAt?: number | string | null;
  verifiedBy?: string | null;
}

let verificationTableAvailable: boolean | null = null;
let schoolClassesTableAvailable: boolean | null = null;
const verificationCache = new Map<
  string,
  { value: ProfileVerificationSnapshot | null; expiresAt: number }
>();
const VERIFICATION_CACHE_MS = 60_000;

function cacheVerification(value: ProfileVerificationSnapshot | null, accountId: string): void {
  verificationCache.set(accountId, {
    value,
    expiresAt: Date.now() + VERIFICATION_CACHE_MS,
  });
}

function verificationFromRecord(
  accountId: string,
  record: Record<string, unknown> | null,
): ProfileVerificationSnapshot | null {
  if (!record || !isProfileVerificationStatus(record.status ?? record.profile_verification_status)) {
    return null;
  }
  return {
    accountId,
    fullName: String(record.submitted_full_name ?? record.full_name ?? "") || null,
    classId: String(record.class_id ?? "") || null,
    classGrade: String(record.class_grade ?? "") || null,
    status: (record.status ?? record.profile_verification_status) as ProfileVerificationStatus,
    rejectionReason: String(record.rejection_reason ?? "") || null,
    submittedAt: (record.submitted_at as string | null | undefined) ?? null,
    verifiedAt: (record.verified_at as string | null | undefined) ?? null,
    verifiedBy: String(record.verified_by ?? "") || null,
  };
}

function supabaseConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return url && key ? { url, key } : null;
}

export function isProfileVerificationStoreConfigured(): boolean {
  return (
    supabaseConfig() !== null &&
    process.env.RESEARCH_DB_ENABLED?.trim().toLowerCase() !== "false"
  );
}

function asIso(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

async function upsert(table: string, conflict: string, records: unknown[]): Promise<boolean> {
  if (records.length === 0) return true;
  const config = supabaseConfig();
  if (!config || process.env.RESEARCH_DB_ENABLED?.trim().toLowerCase() === "false") return false;
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(
      `${config.url}/rest/v1/${encodeURIComponent(table)}?on_conflict=${encodeURIComponent(conflict)}`,
      {
        method: "POST",
        headers: {
          apikey: config.key,
          Authorization: `Bearer ${config.key}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify(records),
      },
    );
    if (response.ok) return true;
    const detail = (await response.text()).slice(0, 500);
    if (response.status !== 404 || !detail.includes("PGRST205") || attempt === 2) {
      throw new Error(`Supabase ${table} upsert failed (${response.status}): ${detail}`);
    }
    await fetch(`${config.url}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: "NOTIFY pgrst, 'reload schema';" }),
    }).catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
  return false;
}

async function latestProfileSnapshot(
  accountId: string,
  eventType: string,
): Promise<Record<string, unknown> | null> {
  const config = supabaseConfig();
  if (!config) return null;
  const query = new URLSearchParams({
    select: "metadata",
    user_id: `eq.${accountId}`,
    event_type: `eq.${eventType}`,
    order: "created_at.desc",
    limit: "1",
  });
  const response = await fetch(`${config.url}/rest/v1/behavioral_events?${query}`, {
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
  });
  if (!response.ok) return null;
  const rows = (await response.json()) as Array<{ metadata?: Record<string, unknown> }>;
  return rows[0]?.metadata ?? null;
}

async function syncLegacyProfileSnapshot(
  accountId: string,
  metadata: Record<string, unknown>,
  eventType = "profile_standardization_snapshot",
): Promise<boolean> {
  const config = supabaseConfig();
  if (!config) return false;
  const previous = await latestProfileSnapshot(accountId, eventType);
  if (previous && JSON.stringify(previous) === JSON.stringify(metadata)) return true;
  const response = await fetch(`${config.url}/rest/v1/behavioral_events`, {
    method: "POST",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      user_id: accountId,
      event_type: eventType,
      metadata,
    }),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Supabase profile snapshot failed (${response.status}): ${detail}`);
  }
  return true;
}

export async function syncResearchProfile(profile: ResearchProfileSnapshot): Promise<boolean> {
  if (!profile.accountId?.trim()) {
    throw new Error("Cannot sync a research profile without a stable account id");
  }
  const lastActive = new Date().toISOString();
  await upsert("research_users", "user_id", [
    {
      user_id: profile.accountId,
      username: profile.displayName,
      role: profile.role || "user",
      last_active: lastActive,
    },
  ]);
  return syncLegacyProfileSnapshot(profile.accountId, {
    nickname: profile.nickname,
    display_name: profile.displayName,
    full_name: profile.fullName || null,
    class_id: profile.classId || null,
    class_grade: profile.classGrade || null,
    points_balance: Math.max(0, Math.trunc(Number(profile.points) || 0)),
    total_exp_earned: Math.max(0, Math.trunc(Number(profile.totalExpEarned) || 0)),
    profile_verification_status: profile.profileVerificationStatus || "unverified",
    profile_updated_at: asIso(profile.profileUpdatedAt),
    profile_verified_at: asIso(profile.profileVerifiedAt),
  });
}

export async function syncProfileVerification(
  verification: ProfileVerificationSnapshot,
): Promise<boolean> {
  if (!verification.accountId?.trim()) {
    throw new Error("Cannot sync profile verification without a stable account id");
  }
  const metadata = {
    full_name: verification.fullName || null,
    class_id: verification.classId || null,
    class_grade: verification.classGrade || null,
    profile_verification_status: verification.status,
    rejection_reason: verification.rejectionReason || null,
    submitted_at: asIso(verification.submittedAt),
    verified_at: asIso(verification.verifiedAt),
    verified_by: verification.verifiedBy || null,
  };
  if (verificationTableAvailable !== false) {
    try {
      const saved = await upsert("student_profile_verifications", "user_id", [
        {
          user_id: verification.accountId,
          submitted_full_name: verification.fullName || null,
          class_id: verification.classId || null,
          class_grade: verification.classGrade || null,
          status: verification.status,
          rejection_reason: verification.rejectionReason || null,
          submitted_at: asIso(verification.submittedAt),
          verified_at: asIso(verification.verifiedAt),
          verified_by: verification.verifiedBy || null,
          updated_at: new Date().toISOString(),
        },
      ]);
      verificationTableAvailable = true;
      if (saved) cacheVerification(verification, verification.accountId);
      return saved;
    } catch (error) {
      if (!String(error).includes("PGRST205")) throw error;
      verificationTableAvailable = false;
    }
  }
  const saved = await syncLegacyProfileSnapshot(
    verification.accountId,
    metadata,
    "profile_verification_status",
  );
  if (saved) cacheVerification(verification, verification.accountId);
  return saved;
}

/**
 * Reads the authoritative verification decision from Supabase. New installs
 * use the normalized table; deployments that have not run the migration yet
 * continue to work through the append-only behavioral event fallback.
 */
export async function readProfileVerification(
  accountId: string,
): Promise<ProfileVerificationSnapshot | null> {
  const normalizedAccountId = accountId.trim();
  if (!normalizedAccountId) return null;
  if (!isProfileVerificationStoreConfigured()) return null;
  const cached = verificationCache.get(normalizedAccountId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const config = supabaseConfig();
  if (!config) return null;

  if (verificationTableAvailable !== false) {
    const query = new URLSearchParams({
      select:
        "submitted_full_name,class_id,class_grade,status,rejection_reason,submitted_at,verified_at,verified_by",
      user_id: `eq.${normalizedAccountId}`,
      limit: "1",
    });
    const response = await fetch(
      `${config.url}/rest/v1/student_profile_verifications?${query}`,
      { headers: { apikey: config.key, Authorization: `Bearer ${config.key}` } },
    );
    if (response.ok) {
      verificationTableAvailable = true;
      const rows = (await response.json()) as Array<Record<string, unknown>>;
      const value = verificationFromRecord(normalizedAccountId, rows[0] ?? null);
      cacheVerification(value, normalizedAccountId);
      return value;
    }
    const detail = (await response.text()).slice(0, 500);
    if (response.status !== 404 || !detail.includes("PGRST205")) {
      throw new Error(`Supabase verification read failed (${response.status}): ${detail}`);
    }
    verificationTableAvailable = false;
  }

  const legacy = await latestProfileSnapshot(normalizedAccountId, "profile_verification_status");
  const value = verificationFromRecord(normalizedAccountId, legacy);
  cacheVerification(value, normalizedAccountId);
  return value;
}

export async function syncSchoolClasses(classes: SchoolClass[]): Promise<boolean> {
  if (schoolClassesTableAvailable === false) return false;
  try {
    const saved = await upsert(
      "school_classes",
      "id",
      classes.map((schoolClass) => ({
        id: schoolClass.id,
        name: schoolClass.name,
        grade: schoolClass.grade,
        school_year: schoolClass.schoolYear,
        active: schoolClass.active,
        sort_order: schoolClass.sortOrder,
        updated_at: new Date().toISOString(),
      })),
    );
    schoolClassesTableAvailable = true;
    return saved;
  } catch (error) {
    if (String(error).includes("PGRST205")) {
      schoolClassesTableAvailable = false;
      return false;
    }
    throw error;
  }
}
