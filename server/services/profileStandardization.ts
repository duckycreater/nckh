import type { SchoolClass } from "../../shared/school";
import type { ProfileVerificationStatus } from "../../shared/profileStandardization";

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

function supabaseConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return url && key ? { url, key } : null;
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
      return saved;
    } catch (error) {
      if (!String(error).includes("PGRST205")) throw error;
      verificationTableAvailable = false;
    }
  }
  return syncLegacyProfileSnapshot(verification.accountId, metadata, "profile_verification_status");
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
