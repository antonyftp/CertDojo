import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const studyPlans = pgTable("study_plans", {
  id: serial("id").primaryKey(),
  topic: text("topic").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const postgresSchema = {
  studyPlans,
};
