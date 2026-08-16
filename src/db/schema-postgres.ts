import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Keep this file structurally identical to schema-sqlite.ts: same tables,
// same columns, same defaults. Any change here must be mirrored there and
// migrations regenerated for both dialects (SPECIFICATIONS.md §4.2).

export const userProfile = pgTable("user_profile", {
  // Single-user app: exactly one row, with a fixed id ("singleton").
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  jobTitle: text("job_title").notNull(),
  onboardingDone: boolean("onboarding_done").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userCertifications = pgTable(
  "user_certifications",
  {
    id: serial("id").primaryKey(),
    // References /content/<provider>/<slug>, not a database table.
    certificationSlug: text("certification_slug").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    isActive: boolean("is_active").notNull().default(true),
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

export const questionAttempts = pgTable(
  "question_attempts",
  {
    id: serial("id").primaryKey(),
    certificationSlug: text("certification_slug").notNull(),
    // References the question id in questions.json.
    questionId: text("question_id").notNull(),
    // Result of the LATEST attempt.
    isCorrect: boolean("is_correct").notNull(),
    attemptsCount: integer("attempts_count").notNull().default(1),
    lastAttemptedAt: timestamp("last_attempted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("question_attempts_cert_question_unique").on(
      table.certificationSlug,
      table.questionId,
    ),
  ],
);

export const postgresSchema = {
  userProfile,
  userCertifications,
  questionAttempts,
};
