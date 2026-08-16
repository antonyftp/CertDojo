// @vitest-environment node
//
// Postgres-DIALECT regression test (audit TST-01: no test today exercises
// Postgres, which is the Vercel/prod mode).
//
// What this file covers: applies the real migrations under
// src/db/migrations/postgres against a live Postgres, then re-runs the
// same shapes of upsert used in production code so a dialect-breaking SQL
// change (composite onConflictDoUpdate targets, sql`excluded.<col>`,
// sql`<col> + 1`, the generated DDL itself) fails here instead of only
// showing up on Vercel:
//   - src/lib/backup/restore.ts: userProfile upsert (single-column target,
//     `excluded.*`) and questionAttempts upsert (composite target,
//     `excluded.*`, chunking-shaped repeat writes).
//   - src/app/(app)/certifications/[slug]/quiz/actions.ts: questionAttempts
//     upsert via `sql`${column} + 1`` (composite target, arithmetic SET).
//
// What this file deliberately does NOT cover: the actual production driver
// is @neondatabase/serverless via drizzle-orm/neon-http, which speaks HTTP
// to a Neon endpoint and cannot connect to a plain `postgres:16` service in
// CI (see the arbitration note in DEV_PLAN_V1.md / the audit). This file
// uses `pg` + drizzle-orm/node-postgres instead — both devDependencies,
// never imported from src/ — as a close proxy for the SQL dialect only.
// In particular, none of the following is exercised here:
//   - neon-http has no multi-statement transaction support (every query is
//     its own HTTP round trip); this file's `pg.Pool` DOES support
//     transactions, so transactional behavior differences are NOT caught.
//   - neon-http's connection pooling, retry, and cold-start behavior.
//   - getRuntimeMode()/getDatabase() in src/db/client.ts are not invoked at
//     all: this file talks to Postgres directly, deliberately bypassing the
//     app's runtime mode detection (which is neon-http-only).
//
// Skipped automatically unless TEST_POSTGRES_URL is set, so `pnpm test`
// stays fast and Docker-free locally. CI provides it via the dedicated
// `postgres` job in .github/workflows/ci.yml (a postgres:16 service).

import { eq, sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { postgresSchema } from "@/db/schema-postgres";

const TEST_POSTGRES_URL = process.env.TEST_POSTGRES_URL;

// A silently-skipped suite would recreate the exact gap this file exists to
// close (a green CI that never touches Postgres). The dedicated CI job sets
// REQUIRE_POSTGRES_TESTS, which turns "no database" from a skip into a
// failure — locally, and in every other job, skipping stays the default.
if (process.env.REQUIRE_POSTGRES_TESTS === "1" && !TEST_POSTGRES_URL) {
  throw new Error(
    "REQUIRE_POSTGRES_TESTS=1 but TEST_POSTGRES_URL is unset: the Postgres dialect suite would have skipped.",
  );
}

describe.skipIf(!TEST_POSTGRES_URL)("postgres dialect", () => {
  let pool: Pool;
  let db: NodePgDatabase<typeof postgresSchema>;

  beforeAll(async () => {
    pool = new Pool({ connectionString: TEST_POSTGRES_URL });
    db = drizzle(pool, { schema: postgresSchema });

    await migrate(db, { migrationsFolder: "src/db/migrations/postgres" });
  });

  afterAll(async () => {
    await pool?.end();
  });

  beforeEach(async () => {
    // Isolation between tests without re-running migrations each time.
    await db.execute(
      sql`TRUNCATE TABLE question_attempts, user_certifications, user_profile RESTART IDENTITY CASCADE`,
    );
  });

  it("creates the expected tables with the expected columns", async () => {
    // Selecting from each table (rather than inspecting information_schema)
    // proves both that the table exists AND that every column referenced
    // by the schema module resolves against the real DDL.
    expect(await db.select().from(postgresSchema.userProfile)).toEqual([]);
    expect(await db.select().from(postgresSchema.userCertifications)).toEqual(
      [],
    );
    expect(await db.select().from(postgresSchema.questionAttempts)).toEqual([]);
  });

  it("upserts user_profile on a single-column conflict target (restore.ts shape)", async () => {
    const { userProfile } = postgresSchema;

    await db
      .insert(userProfile)
      .values({
        id: "singleton",
        name: "Ada Lovelace",
        jobTitle: "Cloud Engineer",
        onboardingDone: true,
      })
      .onConflictDoUpdate({
        target: userProfile.id,
        set: { name: "Ada Lovelace", jobTitle: "Cloud Engineer" },
      });

    await db
      .insert(userProfile)
      .values({
        id: "singleton",
        name: "Grace Hopper",
        jobTitle: "Compiler Engineer",
        onboardingDone: true,
      })
      .onConflictDoUpdate({
        target: userProfile.id,
        set: { name: "Grace Hopper", jobTitle: "Compiler Engineer" },
      });

    const rows = await db.select().from(userProfile);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: "Grace Hopper",
      jobTitle: "Compiler Engineer",
    });
  });

  it("upserts user_certifications on the unique certification_slug (restore.ts and addCertifications shapes)", async () => {
    const { userCertifications } = postgresSchema;

    const [seeded] = await db
      .insert(userCertifications)
      .values({
        certificationSlug: "dva-c02",
        addedAt: new Date("2026-01-01T00:00:00.000Z"),
        isActive: false,
      })
      .returning();

    // addCertifications: re-adding only flips is_active back on and must
    // leave the original tracking date (and the row id) alone.
    await db
      .insert(userCertifications)
      .values({ certificationSlug: "dva-c02", addedAt: new Date() })
      .onConflictDoUpdate({
        target: userCertifications.certificationSlug,
        set: { isActive: true },
      });

    let rows = await db.select().from(userCertifications);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(seeded.id);
    expect(rows[0].isActive).toBe(true);
    expect(rows[0].addedAt.toISOString()).toBe("2026-01-01T00:00:00.000Z");

    // restoreBackup: the imported values win outright, id still preserved.
    await db
      .insert(userCertifications)
      .values({
        certificationSlug: "dva-c02",
        addedAt: new Date("2026-08-01T00:00:00.000Z"),
        isActive: false,
      })
      .onConflictDoUpdate({
        target: userCertifications.certificationSlug,
        set: {
          addedAt: sql`excluded.added_at`,
          isActive: sql`excluded.is_active`,
        },
      });

    rows = await db.select().from(userCertifications);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(seeded.id);
    expect(rows[0].isActive).toBe(false);
    expect(rows[0].addedAt.toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });

  it("gives every row of a multi-row insert the same defaultNow(), which is why added_at is set explicitly", async () => {
    const { userCertifications } = postgresSchema;

    // Pins the dialect divergence the write paths compensate for: Postgres
    // evaluates defaultNow() once per STATEMENT, while SQLite's $defaultFn
    // runs once per ROW. Relying on the default would therefore order rows
    // differently in the two modes.
    await db
      .insert(userCertifications)
      .values([
        { certificationSlug: "a" },
        { certificationSlug: "b" },
        { certificationSlug: "c" },
      ]);

    const rows = await db.select().from(userCertifications);
    const distinct = new Set(rows.map((row) => row.addedAt.toISOString()));
    expect(rows).toHaveLength(3);
    expect(distinct.size).toBe(1);
  });

  it("upserts question_attempts on the composite (certification_slug, question_id) target using excluded.<col> (restore.ts shape)", async () => {
    const { questionAttempts } = postgresSchema;
    const target = [
      questionAttempts.certificationSlug,
      questionAttempts.questionId,
    ];

    async function upsert(isCorrect: boolean, attemptsCount: number) {
      await db
        .insert(questionAttempts)
        .values({
          certificationSlug: "dva-c02",
          questionId: "q1",
          isCorrect,
          attemptsCount,
        })
        .onConflictDoUpdate({
          target,
          set: {
            isCorrect: sql`excluded.is_correct`,
            attemptsCount: sql`excluded.attempts_count`,
            lastAttemptedAt: sql`excluded.last_attempted_at`,
          },
        });
    }

    await upsert(false, 1);
    await upsert(true, 9);

    const rows = await db.select().from(questionAttempts);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ isCorrect: true, attemptsCount: 9 });
  });

  it("upserts question_attempts with an arithmetic SET clause using the composite target (quiz submitAnswer shape)", async () => {
    const { questionAttempts } = postgresSchema;
    const target = [
      questionAttempts.certificationSlug,
      questionAttempts.questionId,
    ];

    async function submit(isCorrect: boolean) {
      await db
        .insert(questionAttempts)
        .values({ certificationSlug: "dva-c02", questionId: "q1", isCorrect })
        .onConflictDoUpdate({
          target,
          set: {
            isCorrect,
            attemptsCount: sql`${questionAttempts.attemptsCount} + 1`,
          },
        });
    }

    await submit(true);
    await submit(false);
    await submit(true);

    const [row] = await db
      .select()
      .from(questionAttempts)
      .where(eq(questionAttempts.questionId, "q1"));

    expect(row.attemptsCount).toBe(3);
    expect(row.isCorrect).toBe(true);
  });
});
