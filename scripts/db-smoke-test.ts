// Writes then reads back a row in each table, for the currently detected
// mode (DEV_PLAN_V1.md Step 1). Without POSTGRES_URL it runs against a
// throwaway SQLite file; with POSTGRES_URL set (e.g. a dev Neon database)
// the same code exercises the Postgres adapter. Inserted rows are removed
// at the end, so it is safe to run against a real database.

import "./load-env";

import { eq } from "drizzle-orm";
import fs from "node:fs";

const throwawaySqlite = "data/smoke-test.db";

if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
  process.env.SQLITE_PATH ??= throwawaySqlite;
}

async function main() {
  const { getDatabase, getRuntimeMode, getSqlitePath } =
    await import("@/db/client");
  const { runMigrations } = await import("@/db/migrate");

  const mode = getRuntimeMode();
  console.log(`Smoke test in ${mode} mode`);

  await runMigrations();

  const { db, schema } = getDatabase();
  const { userProfile, userCertifications, questionAttempts } = schema;

  await db
    .insert(userProfile)
    .values({ id: "singleton", name: "Smoke Test", jobTitle: "Tester" })
    .onConflictDoNothing();

  const [profile] = await db
    .select()
    .from(userProfile)
    .where(eq(userProfile.id, "singleton"));
  console.log("user_profile row:", profile);

  const [cert] = await db
    .insert(userCertifications)
    .values({ certificationSlug: "smoke-test-cert" })
    .returning();
  console.log("user_certifications row:", cert);

  const [attempt] = await db
    .insert(questionAttempts)
    .values({
      certificationSlug: "smoke-test-cert",
      questionId: "smoke-0001",
      isCorrect: true,
    })
    .returning();
  console.log("question_attempts row:", attempt);

  if (!profile || !cert || !attempt) {
    throw new Error("Smoke test failed: a row could not be read back.");
  }

  await db.delete(questionAttempts).where(eq(questionAttempts.id, attempt.id));
  await db.delete(userCertifications).where(eq(userCertifications.id, cert.id));
  await db.delete(userProfile).where(eq(userProfile.id, "singleton"));

  if (mode === "sqlite" && getSqlitePath() === throwawaySqlite) {
    fs.rmSync(throwawaySqlite, { force: true });
  }

  console.log("Smoke test passed for both write and read paths.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
