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

export interface MutableProfileVerification {
  profileVerificationStatus?: ProfileVerificationStatus;
  profileUpdatedAt?: number;
  profileRejectionReason?: string;
  profileVerifiedAt?: number;
  profileVerifiedBy?: string;
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

/**
 * Applies an administrator decision without leaving `undefined` properties on
 * the persisted object. Firestore rejects explicit undefined values, so fields
 * that do not belong to the selected state must be deleted instead.
 */
export function applyProfileVerificationDecision<T extends MutableProfileVerification>(
  profile: T,
  decision: "verified" | "rejected",
  options: {
    updatedAt: number;
    verifiedBy: string;
    rejectionReason?: string;
  },
): T {
  profile.profileVerificationStatus = decision;
  profile.profileUpdatedAt = options.updatedAt;

  if (decision === "verified") {
    profile.profileVerifiedAt = options.updatedAt;
    profile.profileVerifiedBy = options.verifiedBy;
    delete profile.profileRejectionReason;
  } else {
    profile.profileRejectionReason = options.rejectionReason || "Thông tin chưa khớp.";
    delete profile.profileVerifiedAt;
    delete profile.profileVerifiedBy;
  }

  return profile;
}
