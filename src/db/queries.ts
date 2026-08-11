import "server-only";

import { eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";

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
