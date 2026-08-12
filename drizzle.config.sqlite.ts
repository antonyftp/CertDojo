import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema-sqlite.ts",
  out: "./src/db/migrations/sqlite",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.SQLITE_PATH ?? "data/certdojo.db",
  },
});
