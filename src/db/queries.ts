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
