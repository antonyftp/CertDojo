"use server";

import { sql } from "drizzle-orm";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import { getCertificationBySlug, getQuestions } from "@/lib/content/loader";
import { gradeAnswer } from "@/lib/quiz/quiz";

// Grading happens exclusively on the server: the client never holds
// correctOptionIds or the explanation before submitting (DESIGN.md "quiz
// session screens"), and receives both only in this action's response.
export type SubmitAnswerResult =
  | {
      status: "graded";
      isCorrect: boolean;
      correctOptionIds: string[];
      explanation: string;
    }
  | { status: "error"; message: string };

const submitAnswerSchema = z.object({
  certificationSlug: z.string().min(1),
  questionId: z.string().min(1),
  selectedOptionIds: z.array(z.string().min(1)).min(1),
});

export async function submitAnswer(
  input: z.infer<typeof submitAnswerSchema>,
): Promise<SubmitAnswerResult> {
  const parsed = submitAnswerSchema.safeParse(input);

  if (!parsed.success) {
    return { status: "error", message: "Invalid answer submission." };
  }

  const { certificationSlug, questionId } = parsed.data;
  const selectedOptionIds = [...new Set(parsed.data.selectedOptionIds)];

  if (!getCertificationBySlug(certificationSlug)) {
    return {
      status: "error",
      message: `Unknown certification "${certificationSlug}".`,
    };
  }

  const question = getQuestions(certificationSlug).find(
    (candidate) => candidate.id === questionId,
  );

  if (!question) {
    return {
      status: "error",
      message: `Unknown question "${questionId}" for this certification.`,
    };
  }

  const validOptionIds = new Set(question.options.map((option) => option.id));

  if (!selectedOptionIds.every((id) => validOptionIds.has(id))) {
    return {
      status: "error",
      message: "Selected options do not match this question.",
    };
  }

  if (!question.multipleAnswers && selectedOptionIds.length !== 1) {
    return {
      status: "error",
      message: "This question takes exactly one answer.",
    };
  }

  const isCorrect = gradeAnswer(question.correctOptionIds, selectedOptionIds);

  // Upsert on the unique (certification_slug, question_id) pair
  // (SPECIFICATIONS.md §4.2): latest attempt wins for is_correct,
  // attempts_count increments, never a duplicate row.
  const { db, schema } = getDatabase();

  await db
    .insert(schema.questionAttempts)
    .values({ certificationSlug, questionId, isCorrect })
    .onConflictDoUpdate({
      target: [
        schema.questionAttempts.certificationSlug,
        schema.questionAttempts.questionId,
      ],
      set: {
        isCorrect,
        attemptsCount: sql`${schema.questionAttempts.attemptsCount} + 1`,
        lastAttemptedAt: new Date(),
      },
    });

  return {
    status: "graded",
    isCorrect,
    correctOptionIds: question.correctOptionIds,
    explanation: question.explanation,
  };
}
