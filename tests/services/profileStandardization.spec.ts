import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultSchoolClasses } from "../../shared/school";
import {
  applyProfileVerificationDecision,
  canProfileEarnPoints,
  isGradeEightClass,
  normalizeStudentName,
} from "../../shared/profileStandardization";

describe("profile standardization", () => {
  it("provides the complete 8A1-8A10 catalog", () => {
    const gradeEight = defaultSchoolClasses().filter((schoolClass) => schoolClass.grade === 8);
    assert.deepEqual(
      gradeEight.map((schoolClass) => schoolClass.name),
      Array.from({ length: 10 }, (_, index) => `8A${index + 1}`),
    );
  });

  it("normalizes names without changing Vietnamese characters", () => {
    assert.equal(normalizeStudentName("  Nguyễn   Minh Đức  "), "Nguyễn Minh Đức");
  });

  it("requires verification for the grade 8 cohort and skipped profiles", () => {
    assert.equal(isGradeEightClass("8A10"), true);
    assert.equal(
      canProfileEarnPoints({ classGrade: "8A1", profileVerificationStatus: "pending" }),
      false,
    );
    assert.equal(
      canProfileEarnPoints({ classGrade: "8A1", profileVerificationStatus: "verified" }),
      true,
    );
    assert.equal(canProfileEarnPoints({ profileVerificationStatus: "skipped" }), false);
    assert.equal(
      canProfileEarnPoints({ classGrade: "10A1", profileVerificationStatus: "unverified" }),
      true,
    );
  });

  it("removes fields that do not belong to the selected verification state", () => {
    const profile = {
      profileVerificationStatus: "rejected" as const,
      profileUpdatedAt: 1,
      profileRejectionReason: "Tên chưa khớp",
      profileVerifiedAt: 1,
      profileVerifiedBy: "old-admin",
    };
    applyProfileVerificationDecision(profile, "verified", {
      updatedAt: 2,
      verifiedBy: "admin",
    });
    assert.equal(profile.profileVerificationStatus, "verified");
    assert.equal(profile.profileVerifiedAt, 2);
    assert.equal(profile.profileVerifiedBy, "admin");
    assert.equal("profileRejectionReason" in profile, false);

    applyProfileVerificationDecision(profile, "rejected", {
      updatedAt: 3,
      verifiedBy: "admin",
      rejectionReason: "Sai lớp",
    });
    assert.equal(profile.profileVerificationStatus, "rejected");
    assert.equal(profile.profileRejectionReason, "Sai lớp");
    assert.equal("profileVerifiedAt" in profile, false);
    assert.equal("profileVerifiedBy" in profile, false);
  });
});
