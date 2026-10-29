import { describe, expect, it } from "vitest";
import { buildQuizEditionId, gradeQuizSession } from "../../server/services/quizSession.js";

const questions = [
  {
    id: 1,
    content: "Question",
    options: [
      { key: "A", text: "Wrong" },
      { key: "B", text: "Right" },
    ],
    correctKey: "B",
    points: 10,
  },
];

describe("quiz sessions", () => {
  it("counts each question at most once", () => {
    expect(
      gradeQuizSession(questions, [
        { id: 1, choice: "B" },
        { id: 1, choice: "B" },
        { id: 1, choice: "B" },
      ]),
    ).toMatchObject({ totalScore: 10, maxScore: 10, correctCount: 1 });
  });

  it("does not trust unknown questions or invalid choices", () => {
    expect(
      gradeQuizSession(questions, [
        { id: 99, choice: "B" },
        { id: 1, choice: "Z" },
      ]),
    ).toMatchObject({ totalScore: 0, correctCount: 0 });
  });

  it("changes the edition when a question is edited", () => {
    const original = buildQuizEditionId(questions, null, null);
    const edited = buildQuizEditionId([{ ...questions[0], correctKey: "A" }], null, null);
    expect(edited).not.toBe(original);
  });
});
