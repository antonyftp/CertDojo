import type { CertificationMeta, Question } from "@/lib/content/schema";

// Progress derivation (SPECIFICATIONS.md §5.4): pure functions over the
// question bank (content) and the user's attempts (database rows). Answered
// and mastery are counted against the FULL bank, so an untouched question
// always weighs against the percentage.

// A certification counts as exam-ready once this share of the whole bank is
// mastered (spec §5.2 suggests 80%).
export const EXAM_READY_THRESHOLD = 0.8;

// The subset of a question_attempts row the calculations need. `isCorrect`
// reflects the latest attempt (upsert semantics, spec §4.2).
export type AttemptLike = {
  questionId: string;
  isCorrect: boolean;
};

export type CertificationStatus = "not-started" | "in-progress" | "exam-ready";

export type DomainProgress = {
  domainId: string;
  domainName: string;
  weight: number;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  masteryPercent: number;
  // Computed on the exact ratio, like the certification-level status below —
  // never on masteryPercent, which is already rounded. Comparing the rounded
  // value would seal a domain at 795/1000 (79.5% → 80).
  isExamReady: boolean;
};

export type CertificationProgress = {
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  answeredPercent: number;
  masteryPercent: number;
  status: CertificationStatus;
  domains: DomainProgress[];
};

// Single definition of "how a ratio becomes a displayed percentage" for the
// whole app. Exported so client components (quiz session report) round the
// same way the server-side progress does. Safe to import from a client
// component: this module never imports `server-only`.
export function toPercent(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : Math.round((numerator / denominator) * 100);
}

export function computeCertificationProgress(
  meta: CertificationMeta,
  questions: Question[],
  attempts: AttemptLike[],
  examReadyThreshold: number = EXAM_READY_THRESHOLD,
): CertificationProgress {
  // Attempts referencing questions no longer in the bank (content evolved
  // since the attempt) must not count toward or against progress.
  const questionIds = new Set(questions.map((question) => question.id));
  const attemptByQuestionId = new Map(
    attempts
      .filter((attempt) => questionIds.has(attempt.questionId))
      .map((attempt) => [attempt.questionId, attempt]),
  );

  const domains: DomainProgress[] = meta.domains.map((domain) => {
    const domainQuestions = questions.filter(
      (question) => question.domainId === domain.id,
    );

    let answeredCount = 0;
    let correctCount = 0;

    for (const question of domainQuestions) {
      const attempt = attemptByQuestionId.get(question.id);

      if (attempt) {
        answeredCount += 1;

        if (attempt.isCorrect) {
          correctCount += 1;
        }
      }
    }

    return {
      domainId: domain.id,
      domainName: domain.name,
      weight: domain.weight,
      totalQuestions: domainQuestions.length,
      answeredCount,
      correctCount,
      masteryPercent: toPercent(correctCount, domainQuestions.length),
      isExamReady:
        domainQuestions.length > 0 &&
        correctCount / domainQuestions.length >= examReadyThreshold,
    };
  });

  const totalQuestions = questions.length;
  const answeredCount = attemptByQuestionId.size;
  const correctCount = [...attemptByQuestionId.values()].filter(
    (attempt) => attempt.isCorrect,
  ).length;

  // Status compares the exact ratio, not the rounded percent, so a 79.6%
  // mastery does not round its way into exam-ready.
  let status: CertificationStatus = "in-progress";

  if (answeredCount === 0) {
    status = "not-started";
  } else if (
    totalQuestions > 0 &&
    correctCount / totalQuestions >= examReadyThreshold
  ) {
    status = "exam-ready";
  }

  return {
    totalQuestions,
    answeredCount,
    correctCount,
    answeredPercent: toPercent(answeredCount, totalQuestions),
    masteryPercent: toPercent(correctCount, totalQuestions),
    status,
    domains,
  };
}
