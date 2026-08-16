import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// Keep this file structurally identical to schema-postgres.ts: same tables,
// same columns, same defaults. Any change here must be mirrored there and
// migrations regenerated for both dialects (SPECIFICATIONS.md §4.2).

export const userProfile = sqliteTable("user_profile", {
  // Single-user app: exactly one row, with a fixed id ("singleton").
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  jobTitle: text("job_title").notNull(),
  onboardingDone: integer("onboarding_done", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const userCertifications = sqliteTable(
  "user_certifications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    // References /content/<provider>/<slug>, not a database table.
    certificationSlug: text("certification_slug").notNull(),
    addedAt: integer("added_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  },
  (table) => [
    // certification_slug is the natural key every write path already treats as
    // unique (removing a certification flips is_active, it never deletes the
    // row, so history survives a remove/re-add cycle). Enforcing it in the
    // schema is what lets those paths be single upserts instead of manual
    // read-then-insert-or-update round trips.
    uniqueIndex("user_certifications_slug_unique").on(table.certificationSlug),
  ],
);

export const questionAttempts = sqliteTable(
  "question_attempts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    certificationSlug: text("certification_slug").notNull(),
    // References the question id in questions.json.
    questionId: text("question_id").notNull(),
    // Result of the LATEST attempt.
    isCorrect: integer("is_correct", { mode: "boolean" }).notNull(),
    attemptsCount: integer("attempts_count").notNull().default(1),
    lastAttemptedAt: integer("last_attempted_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("question_attempts_cert_question_unique").on(
      table.certificationSlug,
      table.questionId,
    ),
  ],
);

export const sqliteSchema = {
  userProfile,
  userCertifications,
  questionAttempts,
};
