import "server-only";

import { eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { USER_PROFILE_ID } from "@/db/queries";
import type { BackupFile } from "@/lib/backup/schema";

// Writes an already-validated backup into the database (SPECIFICATIONS.md
// §5.5). Every write is an upsert on a natural key — importing twice, or
// over existing data, never creates duplicates; matching rows take the
// imported values (a restore, not a merge). Unknown certification slugs are
// accepted on purpose: content may lag user data on the target instance,
// and the dashboard already renders a "missing content" card for them.
export async function restoreBackup(backup: BackupFile): Promise<void> {
  const { db, schema } = getDatabase();

  await db
    .insert(schema.userProfile)
    .values({ id: USER_PROFILE_ID, ...backup.userProfile })
    .onConflictDoUpdate({
      target: schema.userProfile.id,
      set: { ...backup.userProfile },
    });

  // certification_slug has no unique constraint (only the id PK), so this
  // upsert is manual: update rows whose slug already exists, insert the rest.
  const existing = await db.select().from(schema.userCertifications);
  const existingBySlug = new Map(
    existing.map((row) => [row.certificationSlug, row]),
  );

  const certsToInsert = backup.userCertifications.filter(
    (cert) => !existingBySlug.has(cert.certificationSlug),
  );

  if (certsToInsert.length > 0) {
    await db.insert(schema.userCertifications).values(certsToInsert);
  }

  for (const cert of backup.userCertifications) {
    const row = existingBySlug.get(cert.certificationSlug);

    if (row) {
      await db
        .update(schema.userCertifications)
        .set({ addedAt: cert.addedAt, isActive: cert.isActive })
        .where(eq(schema.userCertifications.id, row.id));
    }
  }

  // Attempts upsert on the unique (certification_slug, question_id) pair,
  // batched via `excluded` (valid in both SQLite and Postgres). Chunked to
  // stay well under either dialect's bind-parameter limits.
  const CHUNK_SIZE = 400;

  for (let i = 0; i < backup.questionAttempts.length; i += CHUNK_SIZE) {
    const chunk = backup.questionAttempts.slice(i, i + CHUNK_SIZE);

    await db
      .insert(schema.questionAttempts)
      .values(chunk)
      .onConflictDoUpdate({
        target: [
          schema.questionAttempts.certificationSlug,
          schema.questionAttempts.questionId,
        ],
        set: {
          isCorrect: sql`excluded.is_correct`,
          attemptsCount: sql`excluded.attempts_count`,
          lastAttemptedAt: sql`excluded.last_attempted_at`,
        },
      });
  }
}
