# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

CertDojo is an open-source, single-user (zero auth) Next.js 16 App Router app for practicing tech certification MCQs. Reference documents, in order of authority:

- `SPECIFICATIONS.md` — the requirements (§ references throughout the code point here).
- `DESIGN.md` — the accumulated design plans and self-critiques (one section per screen, per §6.2). Every UI change adds to it.
- `CONTRIBUTING.md` / `README.md` — contributor- and user-facing docs; keep them true when behaviour changes.

## Development workflow (mandatory)

- **Never run `git commit`** — the user reviews and commits themselves.
- Flag spec problems/ambiguities to the user instead of making silent choices.
- Install dependencies at `@latest`; Next 16 / React 19 / Tailwind 4 are the minimum floor — never pin older versions from training data.
- Before building any UI: produce and self-critique a design plan per `SPECIFICATIONS.md` §6.2 (palette, typography, layout, signature element), append it to `DESIGN.md`, and only then write component code. Avoid the generic AI-design defaults listed there.
- If a step-by-step plan document is introduced: do **one step per run**, then summarize, verify the step's validation criteria, tick its checkbox in both the overview and the step heading, and **stop for explicit user validation**.
- Whatever the change, the gates it must survive are the CI ones: `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm validate-content`, `pnpm test`, `pnpm build`, `pnpm test:e2e`.

## Commands

```bash
pnpm dev                # dev server on :3000
pnpm build              # standalone output (Docker); Vercel uses its own
pnpm start              # serve a production build
pnpm lint               # eslint .
pnpm typecheck          # next typegen && tsc --noEmit (typegen generates PageProps/LayoutProps)
pnpm format             # prettier --write . (format:check for CI-style check)
pnpm validate-content   # Zod-validate every certification in /content
pnpm test               # vitest run (all unit tests; Postgres dialect suite self-skips)
pnpm vitest run src/lib/progress/progress.test.ts       # single unit test file
pnpm test:watch
pnpm test:e2e           # playwright (spins up dev server via playwright.config.ts)
pnpm test:e2e e2e/user-journey.spec.ts                  # single e2e spec
pnpm db:generate        # regenerate migrations for BOTH dialects
pnpm db:migrate         # apply migrations for the detected mode
pnpm db:smoke-test      # write/read one row per table in the detected mode
docker compose up -d --build                            # turnkey Local mode
```

Package manager is pnpm (via corepack). `db:migrate` / `db:smoke-test` run through `tsx --conditions react-server` because `src/db/client.ts` imports `server-only`.

To run the Postgres dialect suite locally against a real server:
`TEST_POSTGRES_URL=postgres://… pnpm vitest run src/db/postgres-dialect.test.ts` (add `REQUIRE_POSTGRES_TESTS=1` to turn a missing database into a failure instead of a skip).

## Architecture

### Dual-database, single entry point

The app runs in one of two mutually exclusive modes, auto-detected — never a UI toggle:

- **Local mode** (default): SQLite file at `data/certdojo.db` (`SQLITE_PATH` overrides) via better-sqlite3.
- **Vercel mode**: `POSTGRES_URL` (or `DATABASE_URL`) present → Neon/Postgres.

Detection lives **only** in `src/db/client.ts` (`getRuntimeMode()`, `getDatabase()`). No other module may inspect these env vars or reference a dialect. Business logic is typed against the SQLite schema (`AppDatabase`/`AppSchema`); the Postgres instance is cast to it.

The schema is defined twice — `src/db/schema-sqlite.ts` and `src/db/schema-postgres.ts` — which must stay **structurally identical**. Any schema change must be mirrored in both files, then `pnpm db:generate` regenerates migrations for both dialects (output in `src/db/migrations/{sqlite,postgres}`, configs in `drizzle.config.{sqlite,postgres}.ts`).

`src/db/migrate.ts` is the one documented exception to the no-dialect-branching rule: Drizzle ships a separate migrator per engine. It still consumes `getRuntimeMode()` and never reads the env vars itself. `src/instrumentation.ts` runs pending **SQLite** migrations automatically at server start so Local mode stays turnkey; Postgres migrations remain a deliberate manual `pnpm db:migrate`.

### Never call `db.transaction()`

`AppDatabase` is the better-sqlite3 type, so `db.transaction()` type-checks — but in Vercel mode the object underneath is neon-http, whose session throws "No transactions support in neon-http driver" unconditionally. Such code compiles, passes every SQLite test, and fails **only in production**. For multi-statement writes: `db.batch([...])` (neon-http supports it), or order the statements so an interruption leaves a recoverable state, or make each statement idempotent — see `completeOnboarding` (order) and `restoreBackup` (idempotence). The warning lives above `AppDatabase` in `src/db/client.ts`.

### Content vs. user data (strict separation)

- **Content** (certifications and question banks) is JSON versioned in Git under `/content/<provider>/<slug>/` (`meta.json` + `questions.json`), validated by Zod (`src/lib/content/schema.ts`), loaded server-only with in-memory caching (`src/lib/content/loader.ts`). Never stored in the database. Slugs are globally unique across providers, and `pnpm validate-content` is a CI gate — see spec §4.3 for the JSON shapes.
- **User data** (the singleton `user_profile`, `user_certifications`, `question_attempts`) lives in the database and only stores the user's relationship to content, referencing it by `certification_slug` / `question_id` strings.

`question_attempts` is upserted on the unique `(certification_slug, question_id)` pair: latest attempt wins for `is_correct`, `attempts_count` increments. Progress = percentages derived from real attempts — no XP/levels/streaks.

### Layout

Application code lives under `src/` (`src/app`, `src/db`, `src/lib`, `src/components`) — an accepted divergence from the spec's root-level layout. `/content`, `/scripts` and `/e2e` stay at the repo root. Routes: `src/app/onboarding`, and the `(app)` group holding `dashboard`, `certifications/[slug]` (+ `/quiz`), plus `settings` (with `settings/export` as a route handler). Server Actions live next to their route in `actions.ts`, each with a colocated `actions.test.ts`. Path alias `@/*` → `src/*`. UI uses shadcn/ui on **Radix** primitives (spec requires Radix; don't let the shadcn CLI switch to Base UI — keep the existing `components.json`).

### Tests

Unit/integration tests run under Vitest (`server-only` is aliased to a stub in `vitest.config.mts`, so server modules import cleanly). The Playwright suite (`e2e/user-journey.spec.ts`) is one serial story — onboarding → quiz → dashboard — against a throwaway SQLite DB on port 3100, recreated on every run (see `playwright.config.ts`); new e2e tests belong in that file (a second parallel file would race on the shared database). Playwright retries are deliberately 0 — a flaky e2e should fail, not be retried into green.

`src/db/postgres-dialect.test.ts` is the only place the production dialect (generated DDL, upsert shapes used by `restoreBackup` and `submitAnswer`) actually executes. It self-skips without `TEST_POSTGRES_URL`, so it effectively only runs in CI.

CI (`.github/workflows/ci.yml`) has three jobs: `checks` (lint, format:check, typecheck, validate-content, test, build), `postgres` (the dialect suite against a real `postgres:16` service, with `REQUIRE_POSTGRES_TESTS=1` so a missing database fails instead of skipping), and `e2e` (Playwright, uploading the report on failure).

### Next config

`next.config.ts` carries four non-obvious settings, each commented in place: `output: "standalone"` (Docker), `outputFileTracingIncludes` for `./content/**/*` (the loader's dynamic `fs` paths are invisible to the build tracer, so Vercel would ship without question banks), a 4 MB `serverActions.bodySizeLimit` (kept above `MAX_IMPORT_BYTES` so the app's friendly import error fires instead of a framework error), and static security headers (frame-ancestors, nosniff, HSTS).

## Non-functional constraints

- Local mode must work fully offline — no external fonts or network-dependent assets. Typography is self-hosted via `@fontsource/ibm-plex-sans` and `@fontsource/ibm-plex-mono`.
- Vercel mode must never write to the filesystem at runtime (reading `/content` is fine).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
