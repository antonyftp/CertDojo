import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach } from "vitest";

import { getDatabase, type AppDatabase, type AppSchema } from "@/db/client";
import { runMigrations } from "@/db/migrate";

// Shared fixture for integration tests that exercise real SQLite writes: a
// throwaway file per test via `SQLITE_PATH`, migrated fresh, with
// POSTGRES_URL/DATABASE_URL/VERCEL cleared so `getRuntimeMode()` always
// resolves to "sqlite" regardless of the host environment.
//
// Registers beforeEach/afterEach, not beforeAll: every test gets its own
// empty database, so there is no implicit ordering even within a describe.
//
// Not named `use*` on purpose — the react-hooks ESLint rule would treat it as
// a React hook and reject the call from a test file's module scope.
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
