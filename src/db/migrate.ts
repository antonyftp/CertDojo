import "server-only";

import { migrate as migrateNeon } from "drizzle-orm/neon-http/migrator";
import { migrate as migrateSqlite } from "drizzle-orm/better-sqlite3/migrator";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";

import { getDatabase, getRuntimeMode, type AppDatabase } from "@/db/client";
import type { postgresSchema } from "@/db/schema-postgres";

const MIGRATIONS = {
  sqlite: "src/db/migrations/sqlite",
  postgres: "src/db/migrations/postgres",
} as const;

export async function runMigrations(): Promise<void> {
  const mode = getRuntimeMode();
  const { db } = getDatabase();

  if (mode === "postgres") {
    await migrateNeon(
      db as unknown as NeonHttpDatabase<typeof postgresSchema>,
      {
        migrationsFolder: MIGRATIONS.postgres,
      },
    );
  } else {
    migrateSqlite(db as AppDatabase, { migrationsFolder: MIGRATIONS.sqlite });
  }
}
