export const PROFILE_VERIFICATION_STATUSES = [
  "unverified",
  "pending",
  "verified",
  "rejected",
  "skipped",
] as const;

export type ProfileVerificationStatus = (typeof PROFILE_VERIFICATION_STATUSES)[number];

export interface PointEligibilityProfile {
  classGrade?: string | null;
  classId?: string | null;
  profileVerificationStatus?: ProfileVerificationStatus | null;
}

export function normalizeStudentName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.normalize("NFC").trim().replace(/\s+/g, " ");
}

export function isGradeEightClass(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return /^8A(?:[1-9]|10)$/i.test(value.trim());
}

export function isProfileVerificationStatus(value: unknown): value is ProfileVerificationStatus {
  return PROFILE_VERIFICATION_STATUSES.includes(value as ProfileVerificationStatus);
}

/**
 * Grade 8 is the first cohort using verified student profiles. Accounts that
 * explicitly skip are also ineligible even before choosing a class.
 */
export function requiresVerifiedProfile(profile: PointEligibilityProfile): boolean {
  const status = profile.profileVerificationStatus;
  return (
    isGradeEightClass(profile.classGrade) ||
    status === "pending" ||
    status === "rejected" ||
    status === "skipped"
  );
}

export function canProfileEarnPoints(profile: PointEligibilityProfile): boolean {
  return !requiresVerifiedProfile(profile) || profile.profileVerificationStatus === "verified";
}
