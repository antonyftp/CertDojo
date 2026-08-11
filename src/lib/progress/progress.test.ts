import { describe, expect, it } from "vitest";

import type { CertificationMeta, Question } from "@/lib/content/schema";
import {
  computeCertificationProgress,
  type AttemptLike,
} from "@/lib/progress/progress";

const meta: CertificationMeta = {
  slug: "test-cert",
  provider: "test",
  name: "Test Certification",
  examCode: "TST-001",
  description: "Certification used by progress unit tests.",
  officialUrl: "https://example.com/test-cert",
  domains: [
    { id: "alpha", name: "Alpha", weight: 60 },
    { id: "beta", name: "Beta", weight: 40 },
  ],
};

function question(id: string, domainId: string): Question {
  return {
    id,
    domainId,
    question: `Question ${id}?`,
    multipleAnswers: false,
    options: [
      { id: "a", text: "Right" },
      { id: "b", text: "Wrong" },
    ],
    correctOptionIds: ["a"],
    explanation: "Because a.",
  };
}

const questions: Question[] = [
  question("q1", "alpha"),
  question("q2", "alpha"),
  question("q3", "alpha"),
  question("q4", "beta"),
  question("q5", "beta"),
];

function attempt(questionId: string, isCorrect: boolean): AttemptLike {
  return { questionId, isCorrect };
}

describe("computeCertificationProgress", () => {
  it("reports zero progress and not-started with no attempts", () => {
    const progress = computeCertificationProgress(meta, questions, []);

    expect(progress.totalQuestions).toBe(5);
    expect(progress.answeredCount).toBe(0);
    expect(progress.correctCount).toBe(0);
    expect(progress.answeredPercent).toBe(0);
    expect(progress.masteryPercent).toBe(0);
    expect(progress.status).toBe("not-started");
    expect(progress.domains).toEqual([
      {
        domainId: "alpha",
        domainName: "Alpha",
        weight: 60,
        totalQuestions: 3,
        answeredCount: 0,
        correctCount: 0,
        masteryPercent: 0,
      },
      {
        domainId: "beta",
        domainName: "Beta",
        weight: 40,
        totalQuestions: 2,
        answeredCount: 0,
        correctCount: 0,
        masteryPercent: 0,
      },
    ]);
  });

  it("computes partial progress with a per-domain breakdown", () => {
    const progress = computeCertificationProgress(meta, questions, [
      attempt("q1", true),
      attempt("q2", false),
      attempt("q4", true),
    ]);

    expect(progress.answeredCount).toBe(3);
    expect(progress.correctCount).toBe(2);
    expect(progress.answeredPercent).toBe(60);
    expect(progress.masteryPercent).toBe(40);
    expect(progress.status).toBe("in-progress");

    const [alpha, beta] = progress.domains;
    expect(alpha).toMatchObject({
      answeredCount: 2,
      correctCount: 1,
      masteryPercent: 33,
    });
    expect(beta).toMatchObject({
      answeredCount: 1,
      correctCount: 1,
      masteryPercent: 50,
    });
  });

  it("reports 100% mastery and exam-ready when every question is correct", () => {
    const progress = computeCertificationProgress(
      meta,
      questions,
      questions.map((q) => attempt(q.id, true)),
    );

    expect(progress.answeredCount).toBe(5);
    expect(progress.correctCount).toBe(5);
    expect(progress.answeredPercent).toBe(100);
    expect(progress.masteryPercent).toBe(100);
    expect(progress.status).toBe("exam-ready");
    expect(
      progress.domains.every((domain) => domain.masteryPercent === 100),
    ).toBe(true);
  });

  it("becomes exam-ready exactly at the threshold, not below it", () => {
    const belowThreshold = computeCertificationProgress(meta, questions, [
      attempt("q1", true),
      attempt("q2", true),
      attempt("q3", true),
      attempt("q4", false),
      attempt("q5", false),
    ]);
    // 3/5 = 60% < 80%
    expect(belowThreshold.status).toBe("in-progress");

    const atThreshold = computeCertificationProgress(meta, questions, [
      attempt("q1", true),
      attempt("q2", true),
      attempt("q3", true),
      attempt("q4", true),
      attempt("q5", false),
    ]);
    // 4/5 = 80% >= 80%
    expect(atThreshold.status).toBe("exam-ready");
  });

  it("ignores attempts for questions no longer present in the bank", () => {
    const progress = computeCertificationProgress(meta, questions, [
      attempt("q1", true),
      attempt("removed-question", true),
    ]);

    expect(progress.answeredCount).toBe(1);
    expect(progress.correctCount).toBe(1);
    expect(progress.status).toBe("in-progress");
  });

  it("handles an empty question bank without dividing by zero", () => {
    const progress = computeCertificationProgress(
      meta,
      [],
      [attempt("q1", true)],
    );

    expect(progress.totalQuestions).toBe(0);
    expect(progress.answeredCount).toBe(0);
    expect(progress.masteryPercent).toBe(0);
    expect(progress.status).toBe("not-started");
  });
});
