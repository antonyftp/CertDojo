import "server-only";

import { eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";

// Shared READS only — this is not a data-access façade. Writes live with the
// feature that owns them (the Server Actions, and lib/backup/restore.ts), and
// audit ARC-03 concluded that adding a repository layer would not be
// justified at this size. The name is the only thing that suggested
// otherwise, hence this note.

// Single-user app (SPECIFICATIONS.md §2): the profile is one row with a
// fixed id. State is read from the database on each request — no session.
export const USER_PROFILE_ID = "singleton";

export async function getUserProfile() {
  const { db, schema } = getDatabase();

  const [profile] = await db
    .select()
    .from(schema.userProfile)
    .where(eq(schema.userProfile.id, USER_PROFILE_ID));

  return profile ?? null;
}

export async function getActiveTrackedCertifications() {
  const { db, schema } = getDatabase();

  return db
    .select()
    .from(schema.userCertifications)
    .where(eq(schema.userCertifications.isActive, true))
    .orderBy(schema.userCertifications.addedAt, schema.userCertifications.id);
}

// Attempts for one certification, used by the quiz page to know which
// questions are not yet mastered (latest attempt missing or incorrect).
export async function getAttemptsForCertification(certificationSlug: string) {
  const { db, schema } = getDatabase();

  return db
    .select()
    .from(schema.questionAttempts)
    .where(eq(schema.questionAttempts.certificationSlug, certificationSlug));
}

// All attempts, grouped by certification slug: one query feeds every
// dashboard card (attempts only exist for questions the user actually saw,
// so the full table stays small in a single-user app).
export async function getAttemptsByCertification() {
  const { db, schema } = getDatabase();

  const rows = await db.select().from(schema.questionAttempts);
  const bySlug = new Map<string, typeof rows>();

  for (const row of rows) {
    const group = bySlug.get(row.certificationSlug);

    if (group) {
      group.push(row);
    } else {
      bySlug.set(row.certificationSlug, [row]);
    }
  }

  return bySlug;
}
