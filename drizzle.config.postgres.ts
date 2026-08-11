import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema-postgres.ts",
  out: "./src/db/migrations/postgres",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.POSTGRES_URL ??
      process.env.DATABASE_URL ??
      "postgres://localhost:5432/certprep",
  },
});
