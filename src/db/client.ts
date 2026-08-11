import "server-only";

import Database from "better-sqlite3";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";

import { postgresSchema } from "@/db/schema-postgres";
import { sqliteSchema } from "@/db/schema-sqlite";

export function getDatabase() {
  if (process.env.DATABASE_PROVIDER === "postgres") {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL is required when DATABASE_PROVIDER=postgres.",
      );
    }

    return drizzleNeon(neon(databaseUrl), { schema: postgresSchema });
  }

  const databaseFile = process.env.DATABASE_FILE ?? "./data/local.db";

  return drizzleSqlite(new Database(databaseFile), { schema: sqliteSchema });
}
