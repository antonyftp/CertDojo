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

export const userCertifications = pgTable("user_certifications", {
  id: serial("id").primaryKey(),
  // References /content/<provider>/<slug>, not a database table.
  certificationSlug: text("certification_slug").notNull(),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
});

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
