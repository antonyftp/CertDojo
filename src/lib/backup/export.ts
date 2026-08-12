import "server-only";

import { getDatabase } from "@/db/client";
import { getUserProfile } from "@/db/queries";
import {
  BACKUP_FORMAT_VERSION,
  type SerializedBackupFile,
} from "@/lib/backup/schema";

// Builds the export payload (SPECIFICATIONS.md §5.5) from the database.
// Returns null when no profile exists — there is nothing meaningful to
// export. Row ids stay out of the file (see lib/backup/schema.ts); all
// certification rows are included, even deactivated ones, so a restore
// reproduces the exact state rather than what the dashboard shows.
export async function buildBackupFile(): Promise<SerializedBackupFile | null> {
  const profile = await getUserProfile();

  if (!profile) {
    return null;
  }

  const { db, schema } = getDatabase();
  const [certifications, attempts] = await Promise.all([
    db.select().from(schema.userCertifications),
    db.select().from(schema.questionAttempts),
  ]);

  return {
    app: "certprep",
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    userProfile: {
      name: profile.name,
      jobTitle: profile.jobTitle,
      onboardingDone: profile.onboardingDone,
      createdAt: profile.createdAt.toISOString(),
    },
    userCertifications: certifications.map((row) => ({
      certificationSlug: row.certificationSlug,
      addedAt: row.addedAt.toISOString(),
      isActive: row.isActive,
    })),
    questionAttempts: attempts.map((row) => ({
      certificationSlug: row.certificationSlug,
      questionId: row.questionId,
      isCorrect: row.isCorrect,
      attemptsCount: row.attemptsCount,
      lastAttemptedAt: row.lastAttemptedAt.toISOString(),
    })),
  };
}
