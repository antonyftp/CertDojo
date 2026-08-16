import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { USER_PROFILE_ID } from "@/db/queries";
import type { BackupFile } from "@/lib/backup/schema";

// Chunk size for the multi-row upserts below: keeps every statement well
// under either dialect's bind-parameter limit, whatever the backup's size.
const CHUNK_SIZE = 400;

function chunk<T>(rows: T[]): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    chunks.push(rows.slice(i, i + CHUNK_SIZE));
  }

  return chunks;
}

// Writes an already-validated backup into the database (SPECIFICATIONS.md
// §5.5). Every write is an upsert on a natural key — importing twice, or
// over existing data, never creates duplicates; matching rows take the
// imported values (a restore, not a merge). Unknown certification slugs are
// accepted on purpose: content may lag user data on the target instance,
// and the dashboard already renders a "missing content" card for them.
//
// Not atomic, and cannot be: the production neon-http driver has no
// transaction support (see the note in src/db/client.ts). Every statement is
// idempotent instead, so re-running a failed import converges on the backup's
// contents rather than compounding a partial write.
export async function restoreBackup(backup: BackupFile): Promise<void> {
  const { db, schema } = getDatabase();

  await db
    .insert(schema.userProfile)
    .values({ id: USER_PROFILE_ID, ...backup.userProfile })
    .onConflictDoUpdate({
      target: schema.userProfile.id,
      set: { ...backup.userProfile },
    });

  // Upsert on the unique certification_slug: the backup's addedAt/isActive
  // win over whatever the row currently holds (a restore, not a merge), while
  // the row's id — and therefore the attempt history keyed on the slug — is
  // preserved. `excluded` refers to the values this statement tried to
  // insert, and is valid in both SQLite and Postgres.
  for (const rows of chunk(backup.userCertifications)) {
    await db
      .insert(schema.userCertifications)
      .values(rows)
      .onConflictDoUpdate({
        target: schema.userCertifications.certificationSlug,
        set: {
          addedAt: sql`excluded.added_at`,
          isActive: sql`excluded.is_active`,
        },
      });
  }

  // Same shape on the unique (certification_slug, question_id) pair.
  for (const rows of chunk(backup.questionAttempts)) {
    await db
      .insert(schema.questionAttempts)
      .values(rows)
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
