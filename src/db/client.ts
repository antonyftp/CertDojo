import "server-only";

import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import {
  drizzle as drizzleSqlite,
  type BetterSQLite3Database,
} from "drizzle-orm/better-sqlite3";

import { postgresSchema } from "@/db/schema-postgres";
import { sqliteSchema } from "@/db/schema-sqlite";

// Single entry point for runtime mode detection (SPECIFICATIONS.md §4.1):
// - POSTGRES_URL present (or DATABASE_URL, its Vercel/Neon equivalent)
//   → Postgres adapter.
// - Otherwise → SQLite file, data/certdojo.db by default (SQLITE_PATH to
//   override).
// No other module may inspect these variables or reference a dialect.

export type RuntimeMode = "postgres" | "sqlite";

// Both schemas are structurally identical; business logic is typed against
// the SQLite flavor and the Postgres instance is cast to it. At runtime each
// mode uses its own dialect-correct drizzle instance and tables.
//
// ⚠️ NEVER CALL `db.transaction()`. This type comes from better-sqlite3, so
// the method type-checks — but in Postgres mode the object underneath is a
// neon-http instance, whose session throws
// "No transactions support in neon-http driver" unconditionally (see
// node_modules/drizzle-orm/neon-http/session.js). A transaction here would
// compile, pass every SQLite test, and fail only in production on Vercel.
// For multi-statement writes: use `db.batch([...])` (neon-http supports it),
// order the statements so a failure in between leaves a recoverable state, or
// make each statement idempotent — see completeOnboarding and restoreBackup.
export type AppDatabase = BetterSQLite3Database<typeof sqliteSchema>;
export type AppSchema = typeof sqliteSchema;

export function getRuntimeMode(): RuntimeMode {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL
    ? "postgres"
    : "sqlite";
}

export function getSqlitePath(): string {
  return process.env.SQLITE_PATH ?? "data/certdojo.db";
}

function createDatabase(): { db: AppDatabase; schema: AppSchema } {
  if (getRuntimeMode() === "postgres") {
    const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL!;
    const db = drizzleNeon(neon(url), { schema: postgresSchema });

    return {
      db: db as unknown as AppDatabase,
      schema: postgresSchema as unknown as AppSchema,
    };
  }

  // On Vercel the filesystem is read-only and SQLite cannot work: fail with
  // a clear message instead of attempting the write below (DEV_PLAN_V1.md
  // Step 9).
  if (process.env.VERCEL) {
    throw new Error(
      "CertDojo is running on Vercel without a Postgres database. " +
        "Attach one (Vercel dashboard → Storage → Create Database → Postgres/Neon) " +
        "so POSTGRES_URL/DATABASE_URL is injected, then redeploy.",
    );
  }

  const file = getSqlitePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });

  return {
    db: drizzleSqlite(new Database(file), { schema: sqliteSchema }),
    schema: sqliteSchema,
  };
}

// Cached across module reloads in dev, one instance per process in prod.
const globalCache = globalThis as unknown as {
  __certdojoDb?: ReturnType<typeof createDatabase>;
};

export function getDatabase(): { db: AppDatabase; schema: AppSchema } {
  globalCache.__certdojoDb ??= createDatabase();

  return globalCache.__certdojoDb;
}
