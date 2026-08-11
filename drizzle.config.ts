import { defineConfig } from "drizzle-kit";

const isPostgres = process.env.DATABASE_PROVIDER === "postgres";

export default defineConfig(
  isPostgres
    ? {
        schema: "./src/db/schema-postgres.ts",
        out: "./drizzle",
        dialect: "postgresql",
        dbCredentials: {
          url:
            process.env.DATABASE_URL ??
            "******localhost:5432/certprep",
        },
      }
    : {
        schema: "./src/db/schema-sqlite.ts",
        out: "./drizzle",
        dialect: "sqlite",
        dbCredentials: {
          url: process.env.DATABASE_FILE ?? "./data/local.db",
        },
      },
);
