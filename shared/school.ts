export interface SchoolClass {
  id: string;
  name: string;
  grade: number;
  schoolYear: string;
  active: boolean;
  sortOrder: number;
}

export function currentSchoolYear(now = new Date()): string {
  const startYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return `${startYear}-${startYear + 1}`;
}

export function defaultSchoolClasses(now = new Date()): SchoolClass[] {
  const schoolYear = currentSchoolYear(now);
  const yearKey = schoolYear.slice(0, 4);
  const gradeEight = Array.from({ length: 10 }, (_, index) => ({
    id: `${yearKey}-8a${index + 1}`,
    name: `8A${index + 1}`,
    grade: 8,
    schoolYear,
    active: true,
    sortOrder: 800 + index,
  }));
  const legacyClasses = [10, 11, 12].flatMap((grade) =>
    ["A1", "A2", "A3"].map((suffix, index) => ({
      id: `${yearKey}-${grade}${suffix}`.toLowerCase(),
      name: `${grade}${suffix}`,
      grade,
      schoolYear,
      active: true,
      sortOrder: grade * 100 + index,
    })),
  );
  return [...gradeEight, ...legacyClasses];
}

export function isValidSchoolClass(value: unknown): value is SchoolClass {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SchoolClass>;
  return (
    typeof candidate.id === "string" &&
    /^[a-z0-9-]{3,40}$/.test(candidate.id) &&
    typeof candidate.name === "string" &&
    candidate.name.trim().length >= 2 &&
    candidate.name.trim().length <= 30 &&
    Number.isInteger(candidate.grade) &&
    Number(candidate.grade) >= 1 &&
    Number(candidate.grade) <= 12 &&
    typeof candidate.schoolYear === "string" &&
    /^\d{4}-\d{4}$/.test(candidate.schoolYear)
  );
}
