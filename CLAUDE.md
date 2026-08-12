# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

CertDojo is an open-source, single-user (zero auth) Next.js 16 App Router app for practicing tech certification MCQs. Full requirements live in `SPECIFICATIONS.md`; work proceeds step by step through `DEV_PLAN_V1.md`.

## Development workflow (mandatory)

`DEV_PLAN_V1.md` governs all feature work:

- At session start, check its checkboxes to find the current step. Do **one step per run** — never chain two steps, even if context allows.
- After finishing a step: summarize changes, verify the step's validation criteria, tick its checkbox (`[ ]` → `[x]`) in both the overview and the step heading, then **stop and wait for explicit user validation**.
- **Never run `git commit`** — the user reviews and commits themselves.
- Flag spec problems/ambiguities to the user instead of making silent choices.
- Install dependencies at `@latest`; Next 16 / React 19 / Tailwind 4 are the minimum floor — never pin older versions from training data.
- Before building any UI (Step 4 onward, every screen): produce and self-critique a design plan per `SPECIFICATIONS.md` §6.2 (palette, typography, layout, signature element) before writing component code. Avoid the generic AI-design defaults listed there.

## Commands

```bash
pnpm dev                # dev server on :3000
pnpm build
pnpm lint               # eslint .
pnpm typecheck          # tsc --noEmit
pnpm format             # prettier --write . (format:check for CI-style check)
pnpm test               # vitest run (all unit tests)
pnpm vitest run src/lib/progress/progress.test.ts       # single unit test file
pnpm test:watch
pnpm test:e2e           # playwright (spins up dev server via playwright.config.ts)
pnpm test:e2e e2e/user-journey.spec.ts                  # single e2e spec
pnpm db:generate        # regenerate migrations for BOTH dialects
pnpm db:migrate         # apply migrations for the detected mode
pnpm db:smoke-test      # write/read one row per table in the detected mode
```

Package manager is pnpm (via corepack). `db:migrate` / `db:smoke-test` run through `tsx --conditions react-server` because `src/db/client.ts` imports `server-only`.

## Architecture

### Dual-database, single entry point

The app runs in one of two mutually exclusive modes, auto-detected — never a UI toggle:

- **Local mode** (default): SQLite file at `data/certdojo.db` (`SQLITE_PATH` overrides) via better-sqlite3.
- **Vercel mode**: `POSTGRES_URL` (or `DATABASE_URL`) present → Neon/Postgres.

Detection lives **only** in `src/db/client.ts` (`getRuntimeMode()`, `getDatabase()`). No other module may inspect these env vars or reference a dialect. Business logic is typed against the SQLite schema (`AppDatabase`/`AppSchema`); the Postgres instance is cast to it.

The schema is defined twice — `src/db/schema-sqlite.ts` and `src/db/schema-postgres.ts` — which must stay **structurally identical**. Any schema change must be mirrored in both files, then `pnpm db:generate` regenerates migrations for both dialects (output in `src/db/migrations/{sqlite,postgres}`, configs in `drizzle.config.{sqlite,postgres}.ts`).

### Content vs. user data (strict separation)

- **Content** (certifications and question banks) is JSON versioned in Git under `/content/<provider>/<slug>/` (`meta.json` + `questions.json`), validated by Zod, loaded server-only with in-memory caching. Never stored in the database. (Built in Step 2 — see spec §4.3 for the JSON shapes.)
- **User data** (the singleton `user_profile`, `user_certifications`, `question_attempts`) lives in the database and only stores the user's relationship to content, referencing it by `certification_slug` / `question_id` strings.

`question_attempts` is upserted on the unique `(certification_slug, question_id)` pair: latest attempt wins for `is_correct`, `attempts_count` increments. Progress = percentages derived from real attempts — no XP/levels/streaks.

### Layout

Application code lives under `src/` (`src/app`, `src/db`, `src/lib`, `src/components`) — an accepted divergence from the spec's root-level layout. `/content` and `/scripts` stay at the repo root. Path alias `@/*` → `src/*`. UI uses shadcn/ui on **Radix** primitives (spec requires Radix; don't let the shadcn CLI switch to Base UI — keep the existing `components.json`).

### Tests

Unit/integration tests run under Vitest (`server-only` is aliased to a stub in `vitest.config.mts`, so server modules import cleanly). The Playwright suite (`e2e/user-journey.spec.ts`) is one serial story — onboarding → quiz → dashboard — against a throwaway SQLite DB on port 3100 (see `playwright.config.ts`); new e2e tests belong in that file (a second parallel file would race on the shared database). CI is `.github/workflows/ci.yml`.

## Non-functional constraints

- Local mode must work fully offline — no external fonts or network-dependent assets.
- Vercel mode must never write to the filesystem at runtime (reading `/content` is fine).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
