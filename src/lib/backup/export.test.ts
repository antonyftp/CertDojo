// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildBackupFile } from "@/lib/backup/export";
import { restoreBackup } from "@/lib/backup/restore";
import { backupFileSchema } from "@/lib/backup/schema";
import { setupSqliteDatabase } from "@/test/sqlite-fixture";

const getDb = setupSqliteDatabase();

describe("buildBackupFile", () => {
  it("returns null when no profile exists yet", async () => {
    expect(await buildBackupFile()).toBeNull();
  });

  it("serializes profile, certifications, and attempts with ISO date strings", async () => {
    const { db, schema } = getDb();

    await db.insert(schema.userProfile).values({
      id: "singleton",
      name: "Ada Lovelace",
      jobTitle: "Cloud Engineer",
      onboardingDone: true,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    await db.insert(schema.userCertifications).values({
      certificationSlug: "dva-c02",
      addedAt: new Date("2026-01-02T00:00:00.000Z"),
      isActive: false,
    });
    await db.insert(schema.questionAttempts).values({
      certificationSlug: "dva-c02",
      questionId: "q1",
      isCorrect: true,
      attemptsCount: 4,
      lastAttemptedAt: new Date("2026-01-03T00:00:00.000Z"),
    });

    const backup = await buildBackupFile();

    expect(backup).not.toBeNull();
    expect(backup!.app).toBe("certdojo");
    expect(backup!.formatVersion).toBe(1);
    expect(typeof backup!.exportedAt).toBe("string");
    expect(backup!.userProfile).toEqual({
      name: "Ada Lovelace",
      jobTitle: "Cloud Engineer",
      onboardingDone: true,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    // Deactivated certifications must still be included: a restore should
    // reproduce exact state, not just what the dashboard currently shows.
    expect(backup!.userCertifications).toEqual([
      {
        certificationSlug: "dva-c02",
        addedAt: "2026-01-02T00:00:00.000Z",
        isActive: false,
      },
    ]);
    expect(backup!.questionAttempts).toEqual([
      {
        certificationSlug: "dva-c02",
        questionId: "q1",
        isCorrect: true,
        attemptsCount: 4,
        lastAttemptedAt: "2026-01-03T00:00:00.000Z",
      },
    ]);
  });

  describe("round-trip", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-08-01T12:00:00.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("export -> import -> export yields the same content", async () => {
      const { db, schema } = getDb();

      await db.insert(schema.userProfile).values({
        id: "singleton",
        name: "Grace Hopper",
        jobTitle: "Compiler Engineer",
        onboardingDone: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      });
      await db.insert(schema.userCertifications).values([
        {
          certificationSlug: "dva-c02",
          addedAt: new Date("2026-01-02T00:00:00.000Z"),
          isActive: true,
        },
      ]);
      await db.insert(schema.questionAttempts).values([
        {
          certificationSlug: "dva-c02",
          questionId: "q1",
          isCorrect: true,
          attemptsCount: 2,
          lastAttemptedAt: new Date("2026-01-03T00:00:00.000Z"),
        },
        {
          certificationSlug: "dva-c02",
          questionId: "q2",
          isCorrect: false,
          attemptsCount: 1,
          lastAttemptedAt: new Date("2026-01-04T00:00:00.000Z"),
        },
      ]);

      const firstExport = await buildBackupFile();
      expect(firstExport).not.toBeNull();

      await restoreBackup(backupFileSchema.parse(firstExport));

      const secondExport = await buildBackupFile();

      expect(secondExport).toEqual(firstExport);
    });
  });
});
