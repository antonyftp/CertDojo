import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const studyPlans = sqliteTable("study_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  topic: text("topic").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const sqliteSchema = {
  studyPlans,
};
