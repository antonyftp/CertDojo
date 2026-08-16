import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach } from "vitest";

import { getDatabase, type AppDatabase, type AppSchema } from "@/db/client";
import { runMigrations } from "@/db/migrate";

// Shared fixture for integration tests that exercise real SQLite writes
// (queries, server actions, backup import/export). Mirrors the pattern
// pioneered in quiz/actions.test.ts: a throwaway SQLite file per test via
// `SQLITE_PATH`, migrated fresh, with POSTGRES_URL/DATABASE_URL/VERCEL
// cleared so `getRuntimeMode()` always resolves to "sqlite" here regardless
// of the host environment.
//
// Runs per-TEST (beforeEach/afterEach), not per-file: every test gets its
// own empty, migrated database and there is no implicit ordering between
// tests, even within the same describe block.
//
// Usage:
//   const getDb = setupSqliteDatabase();
//   it("...", async () => {
//     const { db, schema } = getDb();
//     ...
//   });
//
// Named without a "use" prefix on purpose: it registers beforeEach/afterEach
// hooks via plain function calls (not React hook semantics), and the
// react-hooks ESLint rule treats any `use*`-named function as a hook that
// must be called from a component/hook body — which this call site, a test
// file's module scope, is not.
export function setupSqliteDatabase(): () => {
  db: AppDatabase;
  schema: AppSchema;
} {
  let tempDir: string;

  beforeEach(async () => {
    delete process.env.POSTGRES_URL;
    delete process.env.DATABASE_URL;
    delete process.env.VERCEL;
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "certdojo-vitest-"));
    process.env.SQLITE_PATH = path.join(tempDir, "certdojo-test.db");
    delete (globalThis as { __certdojoDb?: unknown }).__certdojoDb;

    await runMigrations();
  });

  afterEach(() => {
    delete (globalThis as { __certdojoDb?: unknown }).__certdojoDb;
    delete process.env.SQLITE_PATH;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  return () => getDatabase();
}
