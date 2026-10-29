import crypto from "node:crypto";

export interface QuizSessionQuestion {
  id: number;
  content: string;
  options: Array<{ key: string; text: string }>;
  correctKey: string;
  points: number;
}

export interface QuizAnswer {
  id: number;
  choice: string;
}

export interface QuizGradeResult {
  totalScore: number;
  maxScore: number;
  correctCount: number;
  results: Array<{ id: number; choice: string | null; correctKey: string; correct: boolean }>;
}

export function buildQuizEditionId(
  questions: QuizSessionQuestion[],
  startsAt: number | null,
  endsAt: number | null,
): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({ questions, startsAt, endsAt }))
    .digest("hex")
    .slice(0, 24);
}

export function buildQuizSessionId(accountId: string, editionId: string): string {
  return crypto
    .createHash("sha256")
    .update(`${accountId}:${editionId}`)
    .digest("hex")
    .slice(0, 40);
}

export function gradeQuizSession(
  questions: QuizSessionQuestion[],
  rawAnswers: unknown,
): QuizGradeResult {
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const answers = new Map<number, string>();
  if (Array.isArray(rawAnswers)) {
    for (const raw of rawAnswers) {
      if (!raw || typeof raw !== "object") continue;
      const id = Number((raw as { id?: unknown }).id);
      const choice = String((raw as { choice?: unknown }).choice ?? "")
        .trim()
        .toUpperCase();
      const question = questionById.get(id);
      if (!question || answers.has(id)) continue;
      if (!question.options.some((option) => option.key.toUpperCase() === choice)) continue;
      answers.set(id, choice);
    }
  }

  let totalScore = 0;
  let correctCount = 0;
  const results = questions.map((question) => {
    const choice = answers.get(question.id) ?? null;
    const correct = choice === question.correctKey.toUpperCase();
    if (correct) {
      totalScore += Math.max(0, Math.trunc(question.points));
      correctCount += 1;
    }
    return { id: question.id, choice, correctKey: question.correctKey, correct };
  });
  const maxScore = questions.reduce(
    (sum, question) => sum + Math.max(0, Math.trunc(question.points)),
    0,
  );
  return {
    totalScore: Math.min(totalScore, maxScore),
    maxScore,
    correctCount,
    results,
  };
}
