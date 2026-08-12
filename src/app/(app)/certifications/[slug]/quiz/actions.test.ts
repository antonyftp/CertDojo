// @vitest-environment node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { submitAnswer } from "@/app/(app)/certifications/[slug]/quiz/actions";
import { getDatabase } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import { getQuestions } from "@/lib/content/loader";

// Integration test of the attempt upsert (SPECIFICATIONS.md §4.2): the real
// Server Action writes to a throwaway SQLite database, grading real /content
// questions. Vitest runs each file in its own process, so mutating the env
// here cannot leak into other tests.
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "certdojo-vitest-"));

const CERT_SLUG = "kcna";
const questions = getQuestions(CERT_SLUG);
const singleAnswer = questions.find((question) => !question.multipleAnswers)!;
const wrongOptionId = singleAnswer.options.find(
  (option) => !singleAnswer.correctOptionIds.includes(option.id),
)!.id;
const otherQuestion = questions.find(
  (question) => question.id !== singleAnswer.id,
)!;

async function getAttemptRows() {
  const { db, schema } = getDatabase();

  return db.select().from(schema.questionAttempts);
}

async function getAttemptRow(questionId: string) {
  const { db, schema } = getDatabase();
  const rows = await db
    .select()
    .from(schema.questionAttempts)
    .where(
      and(
        eq(schema.questionAttempts.certificationSlug, CERT_SLUG),
        eq(schema.questionAttempts.questionId, questionId),
      ),
    );

  expect(rows).toHaveLength(1);

  return rows[0];
}

beforeAll(async () => {
  delete process.env.POSTGRES_URL;
  delete process.env.DATABASE_URL;
  delete process.env.VERCEL;
  process.env.SQLITE_PATH = path.join(tempDir, "certdojo-test.db");
  delete (globalThis as { __certdojoDb?: unknown }).__certdojoDb;

  await runMigrations();
});

afterAll(() => {
  delete (globalThis as { __certdojoDb?: unknown }).__certdojoDb;
  delete process.env.SQLITE_PATH;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("submitAnswer", () => {
  it("grades a correct first attempt and inserts a single row", async () => {
    const result = await submitAnswer({
      certificationSlug: CERT_SLUG,
      questionId: singleAnswer.id,
      selectedOptionIds: singleAnswer.correctOptionIds,
    });

    expect(result).toMatchObject({
      status: "graded",
      isCorrect: true,
      correctOptionIds: singleAnswer.correctOptionIds,
      explanation: singleAnswer.explanation,
    });

    const row = await getAttemptRow(singleAnswer.id);

    expect(row.isCorrect).toBe(true);
    expect(row.attemptsCount).toBe(1);
  });

  it("upserts a re-attempt: latest result wins, attempts_count increments", async () => {
    const wrong = await submitAnswer({
      certificationSlug: CERT_SLUG,
      questionId: singleAnswer.id,
      selectedOptionIds: [wrongOptionId],
    });

    expect(wrong).toMatchObject({ status: "graded", isCorrect: false });

    let row = await getAttemptRow(singleAnswer.id);

    expect(row.isCorrect).toBe(false);
    expect(row.attemptsCount).toBe(2);

    const correctAgain = await submitAnswer({
      certificationSlug: CERT_SLUG,
      questionId: singleAnswer.id,
      selectedOptionIds: singleAnswer.correctOptionIds,
    });

    expect(correctAgain).toMatchObject({ status: "graded", isCorrect: true });

    row = await getAttemptRow(singleAnswer.id);

    expect(row.isCorrect).toBe(true);
    expect(row.attemptsCount).toBe(3);
  });

  it("stores attempts on different questions as separate rows", async () => {
    const selected = otherQuestion.multipleAnswers
      ? otherQuestion.correctOptionIds
      : [otherQuestion.correctOptionIds[0]];

    const result = await submitAnswer({
      certificationSlug: CERT_SLUG,
      questionId: otherQuestion.id,
      selectedOptionIds: selected,
    });

    expect(result).toMatchObject({ status: "graded", isCorrect: true });
    expect(await getAttemptRows()).toHaveLength(2);
  });

  it("deduplicates a repeated option id instead of rejecting it", async () => {
    const result = await submitAnswer({
      certificationSlug: CERT_SLUG,
      questionId: singleAnswer.id,
      selectedOptionIds: [
        singleAnswer.correctOptionIds[0],
        singleAnswer.correctOptionIds[0],
      ],
    });

    expect(result).toMatchObject({ status: "graded", isCorrect: true });
  });

  it("rejects invalid submissions without writing anything", async () => {
    const before = (await getAttemptRows()).length;

    const cases = [
      {
        certificationSlug: "does-not-exist",
        questionId: singleAnswer.id,
        selectedOptionIds: singleAnswer.correctOptionIds,
      },
      {
        certificationSlug: CERT_SLUG,
        questionId: "does-not-exist",
        selectedOptionIds: singleAnswer.correctOptionIds,
      },
      {
        certificationSlug: CERT_SLUG,
        questionId: singleAnswer.id,
        selectedOptionIds: ["not-a-real-option"],
      },
      {
        certificationSlug: CERT_SLUG,
        questionId: singleAnswer.id,
        selectedOptionIds: singleAnswer.options.map((option) => option.id),
      },
    ];

    for (const input of cases) {
      const result = await submitAnswer(input);

      expect(result.status).toBe("error");
    }

    expect(await getAttemptRows()).toHaveLength(before);
  });
});
