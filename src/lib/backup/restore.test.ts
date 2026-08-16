// @vitest-environment node

import { describe, expect, it } from "vitest";

import { USER_PROFILE_ID } from "@/db/queries";
import { restoreBackup } from "@/lib/backup/restore";
import type { BackupFile } from "@/lib/backup/schema";
import { setupSqliteDatabase } from "@/test/sqlite-fixture";

const getDb = setupSqliteDatabase();

function baseBackup(overrides: Partial<BackupFile> = {}): BackupFile {
  return {
    app: "certdojo",
    formatVersion: 1,
    exportedAt: new Date("2026-08-01T00:00:00.000Z"),
    userProfile: {
      name: "Ada Lovelace",
      jobTitle: "Cloud Engineer",
      onboardingDone: true,
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
    },
    userCertifications: [],
    questionAttempts: [],
    ...overrides,
  };
}

describe("restoreBackup", () => {
  it("imports into an empty database", async () => {
    const { db, schema } = getDb();

    await restoreBackup(
      baseBackup({
        userCertifications: [
          {
            certificationSlug: "dva-c02",
            addedAt: new Date("2026-07-05T00:00:00.000Z"),
            isActive: true,
          },
        ],
        questionAttempts: [
          {
            certificationSlug: "dva-c02",
            questionId: "q1",
            isCorrect: true,
            attemptsCount: 3,
            lastAttemptedAt: new Date("2026-07-10T00:00:00.000Z"),
          },
        ],
      }),
    );

    const [profile] = await db.select().from(schema.userProfile);
    expect(profile).toMatchObject({
      id: USER_PROFILE_ID,
      name: "Ada Lovelace",
      jobTitle: "Cloud Engineer",
      onboardingDone: true,
    });

    const certs = await db.select().from(schema.userCertifications);
    expect(certs).toHaveLength(1);
    expect(certs[0]).toMatchObject({
      certificationSlug: "dva-c02",
      isActive: true,
    });

    const attempts = await db.select().from(schema.questionAttempts);
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({
      certificationSlug: "dva-c02",
      questionId: "q1",
      isCorrect: true,
      attemptsCount: 3,
    });
  });

  it("is idempotent: importing the same backup twice creates no duplicates", async () => {
    const { db, schema } = getDb();
    const backup = baseBackup({
      userCertifications: [
        {
          certificationSlug: "dva-c02",
          addedAt: new Date("2026-07-05T00:00:00.000Z"),
          isActive: true,
        },
      ],
      questionAttempts: [
        {
          certificationSlug: "dva-c02",
          questionId: "q1",
          isCorrect: true,
          attemptsCount: 3,
          lastAttemptedAt: new Date("2026-07-10T00:00:00.000Z"),
        },
      ],
    });

    await restoreBackup(backup);
    await restoreBackup(backup);

    expect(await db.select().from(schema.userProfile)).toHaveLength(1);
    expect(await db.select().from(schema.userCertifications)).toHaveLength(1);
    expect(await db.select().from(schema.questionAttempts)).toHaveLength(1);
  });

  it("reactivates a previously deactivated certification without recreating the row, and its attempt history survives", async () => {
    const { db, schema } = getDb();

    // Seed a deactivated certification with attempt history directly,
    // simulating a remove/re-add cycle that happened before this import.
    const [existingCert] = await db
      .insert(schema.userCertifications)
      .values({
        certificationSlug: "dva-c02",
        addedAt: new Date("2026-01-01T00:00:00.000Z"),
        isActive: false,
      })
      .returning();

    await db.insert(schema.questionAttempts).values({
      certificationSlug: "dva-c02",
      questionId: "q1",
      isCorrect: true,
      attemptsCount: 5,
      lastAttemptedAt: new Date("2026-01-02T00:00:00.000Z"),
    });

    // The backup being restored reactivates the certification but says
    // nothing about attempts.
    await restoreBackup(
      baseBackup({
        userCertifications: [
          {
            certificationSlug: "dva-c02",
            addedAt: new Date("2026-08-01T00:00:00.000Z"),
            isActive: true,
          },
        ],
        questionAttempts: [],
      }),
    );

    const certs = await db.select().from(schema.userCertifications);
    expect(certs).toHaveLength(1);
    expect(certs[0].id).toBe(existingCert.id);
    expect(certs[0].isActive).toBe(true);
    expect(certs[0].addedAt.toISOString()).toBe("2026-08-01T00:00:00.000Z");

    const attempts = await db.select().from(schema.questionAttempts);
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({
      certificationSlug: "dva-c02",
      questionId: "q1",
      isCorrect: true,
      attemptsCount: 5,
    });
  });

  it("chunks more than 400 question attempts without losing or duplicating any", async () => {
    const { db, schema } = getDb();
    const TOTAL = 850; // spans three CHUNK_SIZE=400 chunks

    const questionAttempts = Array.from({ length: TOTAL }, (_, i) => ({
      certificationSlug: "dva-c02",
      questionId: `q-${i}`,
      isCorrect: i % 2 === 0,
      attemptsCount: 1,
      lastAttemptedAt: new Date("2026-07-10T00:00:00.000Z"),
    }));

    await restoreBackup(baseBackup({ questionAttempts }));

    const rows = await db.select().from(schema.questionAttempts);
    expect(rows).toHaveLength(TOTAL);

    // Spot-check the first row of each chunk boundary to catch off-by-one
    // slicing bugs, not just the aggregate count.
    for (const index of [0, 399, 400, 799, 800, 849]) {
      const row = rows.find((r) => r.questionId === `q-${index}`);
      expect(row).toBeDefined();
      expect(row!.isCorrect).toBe(index % 2 === 0);
    }
  });

  it("upserts question attempts: the imported values overwrite the existing row as-is (not incremented)", async () => {
    const { db, schema } = getDb();

    await restoreBackup(
      baseBackup({
        questionAttempts: [
          {
            certificationSlug: "dva-c02",
            questionId: "q1",
            isCorrect: false,
            attemptsCount: 1,
            lastAttemptedAt: new Date("2026-07-01T00:00:00.000Z"),
          },
        ],
      }),
    );

    await restoreBackup(
      baseBackup({
        questionAttempts: [
          {
            certificationSlug: "dva-c02",
            questionId: "q1",
            isCorrect: true,
            attemptsCount: 9,
            lastAttemptedAt: new Date("2026-07-05T00:00:00.000Z"),
          },
        ],
      }),
    );

    const rows = await db.select().from(schema.questionAttempts);
    expect(rows).toHaveLength(1);
    // restore.ts sets attemptsCount to `excluded.attempts_count` (the
    // imported value), not `attemptsCount + 1` like the quiz action does:
    // the second import's value must win outright, never be summed (1+9=10
    // would indicate the wrong SQL was used).
    expect(rows[0].attemptsCount).toBe(9);
    expect(rows[0].isCorrect).toBe(true);
    expect(rows[0].lastAttemptedAt.toISOString()).toBe(
      "2026-07-05T00:00:00.000Z",
    );
  });
});
