import { describe, expect, it } from "vitest";

import {
  backupFileSchema,
  type SerializedBackupFile,
} from "@/lib/backup/schema";

function validBackup(): SerializedBackupFile {
  return {
    app: "certdojo",
    formatVersion: 1,
    exportedAt: "2026-08-12T10:00:00.000Z",
    userProfile: {
      name: "Ada Lovelace",
      jobTitle: "Cloud Engineer",
      onboardingDone: true,
      createdAt: "2026-08-01T09:00:00.000Z",
    },
    userCertifications: [
      {
        certificationSlug: "clf-c02",
        addedAt: "2026-08-01T09:00:00.000Z",
        isActive: true,
      },
    ],
    questionAttempts: [
      {
        certificationSlug: "clf-c02",
        questionId: "clf-c02-0001",
        isCorrect: true,
        attemptsCount: 2,
        lastAttemptedAt: "2026-08-10T18:30:00.000Z",
      },
    ],
  };
}

describe("backupFileSchema", () => {
  it("accepts a valid backup and revives dates", () => {
    const parsed = backupFileSchema.parse(validBackup());

    expect(parsed.userProfile.createdAt).toBeInstanceOf(Date);
    expect(parsed.questionAttempts[0].lastAttemptedAt.toISOString()).toBe(
      "2026-08-10T18:30:00.000Z",
    );
  });

  it("round-trips through JSON serialization", () => {
    const parsed = backupFileSchema.parse(
      JSON.parse(JSON.stringify(validBackup())),
    );

    expect(parsed.userCertifications).toHaveLength(1);
    expect(parsed.questionAttempts[0].attemptsCount).toBe(2);
  });

  it("rejects a file from another app or format version", () => {
    expect(
      backupFileSchema.safeParse({ ...validBackup(), app: "other" }).success,
    ).toBe(false);
    expect(
      backupFileSchema.safeParse({ ...validBackup(), formatVersion: 2 })
        .success,
    ).toBe(false);
  });

  it("rejects a missing required field", () => {
    const backup = validBackup();
    // @ts-expect-error deliberately breaking the shape
    delete backup.userProfile.name;

    expect(backupFileSchema.safeParse(backup).success).toBe(false);
  });

  it("rejects invalid timestamps and non-positive attempt counts", () => {
    const badDate = validBackup();
    badDate.userProfile.createdAt = "yesterday";

    const badCount = validBackup();
    badCount.questionAttempts[0].attemptsCount = 0;

    expect(backupFileSchema.safeParse(badDate).success).toBe(false);
    expect(backupFileSchema.safeParse(badCount).success).toBe(false);
  });

  it("rejects duplicate certification or attempt keys", () => {
    const dupCert = validBackup();
    dupCert.userCertifications.push({ ...dupCert.userCertifications[0] });

    const dupAttempt = validBackup();
    dupAttempt.questionAttempts.push({ ...dupAttempt.questionAttempts[0] });

    expect(backupFileSchema.safeParse(dupCert).success).toBe(false);
    expect(backupFileSchema.safeParse(dupAttempt).success).toBe(false);
  });
});
