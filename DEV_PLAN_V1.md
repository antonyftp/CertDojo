# CertDojo — V1 Development Plan (step by step)

## General instructions for Claude Code

- This plan is entirely based on `SPECIFICATIONS.md` (read it in full before starting Step 0).
- Development happens **one step at a time**. After each step:
  1. Summarize what was done (files created/modified).
  2. Check the validation criteria listed for the step.
  3. **Check the box** for that step below in "Progress overview" and in the step's own heading (change `[ ]` to `[x]`), by editing this file directly.
  4. **Stop and wait for explicit user validation before moving to the next step.**
- Do not run `git commit` — the user reviews and commits the changes themselves after validating each step.
- Never chain two steps in the same run, even if context seems to allow it — the user has limited usage and wants to validate each step before continuing.
- If a step reveals a problem or ambiguity in the specifications, flag it clearly to the user rather than making a silent, undocumented choice.
- Always install dependencies at the latest available version (`@latest` or equivalent), with Next.js 16 / React 19 / Tailwind CSS 4 as a minimum floor.
- At the start of a session, check this file's checkboxes first to know which step to resume from.

## Progress overview

- [x] Step 0 — Project initialization *(done via GitHub Copilot scaffold, PR #1 — see audit notes below)*
- [x] Step 1 — Data layer (Drizzle, dual dialect)
- [x] Step 2 — Content structure + validation
- [x] Step 3 — Onboarding
- [x] Step 4 — Dashboard + progress calculation
- [x] Step 5 — Quiz engine
- [x] Step 6 — Certification detail view (by domain)
- [x] Step 7 — User data export / import
- [x] Step 8 — Dockerization (turnkey Local mode)
- [ ] Step 9 — Vercel deployment readiness
- [ ] Step 10 — Tests, final documentation, open source governance

---

## Scaffold audit — 2026-08-12 (Copilot PR #1 vs SPECIFICATIONS.md)

Step 0 was executed by GitHub Copilot, not from this plan. Audit result: the tooling
baseline matches the spec (Next 16.3 / React 19.2 / Tailwind 4 / TypeScript / pnpm /
Zustand 5 / Zod 4 / Drizzle 0.45 / better-sqlite3 / Neon+pg drivers / Vitest /
Playwright / Docker / MIT license), and `pnpm lint`, `pnpm typecheck`, and `pnpm test`
all pass. However, several choices deviate from the spec and must be corrected —
mostly during Step 1, which rewrites the data layer anyway.

**Spec deviations — all fixed on 2026-08-12 (together with Step 1):**
- **Mode detection** (spec §4.1) — fixed: `src/db/client.ts` now auto-detects from the
  presence of `POSTGRES_URL` (`DATABASE_URL` accepted as the Vercel/Neon equivalent);
  the `DATABASE_PROVIDER` toggle is gone. SQLite defaults to `data/certdojo.db`,
  overridable via `SQLITE_PATH`. Detection exists only in `client.ts`.
- **Schema** (spec §4.2) — fixed: the placeholder `study_plans` table was replaced by
  the real `user_profile`, `user_certifications`, `question_attempts` tables. Two
  dialect files remain technically necessary for Drizzle (`schema-sqlite.ts` /
  `schema-postgres.ts`) but are structurally identical, with a header comment requiring
  any change to be mirrored and migrations regenerated for both dialects.
- **Drizzle config / migrations** — fixed: `drizzle.config.sqlite.ts` +
  `drizzle.config.postgres.ts`, migrations in `src/db/migrations/{sqlite,postgres}`
  (both generated), `pnpm db:generate` regenerates both dialects, `pnpm db:migrate`
  applies the one matching the detected mode, `pnpm db:smoke-test` writes/reads one
  row per table in the detected mode (verified in SQLite; for Postgres, set
  `POSTGRES_URL` to a dev Neon database and run the same two commands).

**Step 0 leftovers — all fixed on 2026-08-12:**
- `.gitignore` now ignores `/data/*.db` (plus journal/WAL files), keeps `.env.example`.
- `.env.example` created, documenting `POSTGRES_URL` / `SQLITE_PATH` and the
  auto-detection rule.
- Prettier installed and configured (`.prettierrc`, `.prettierignore`,
  `pnpm format` / `format:check`, `eslint-config-prettier` wired into ESLint).
- `public/` directory created, so the `Dockerfile` `COPY /app/public` no longer fails.
  Docker files still live at the repo root instead of `/docker` (acceptable; revisit
  in Step 8).
- shadcn/ui `button` reinstalled via the official CLI, and `globals.css` now carries
  the standard shadcn Tailwind 4 theme tokens (neutral base; the CLI's new default
  would have switched primitives from Radix to Base UI, which the spec's §6.1 Radix
  requirement forbids — existing `components.json` kept instead). Note: this palette
  is a placeholder — Step 4's design plan (spec §6.2) must replace it.
- Two latent defects found while fixing: `server-only` was imported but never
  installed (now a real dependency), and the pinned `drizzle-kit` 1.0.0 RC was
  incompatible with drizzle-orm 0.45 (`db:generate` crashed) — replaced with the
  latest stable `drizzle-kit` 0.31.10, the matching toolkit for drizzle-orm 0.45.x.

**Accepted divergence (keep, note only):**
- Code lives under `src/` (`src/app`, `src/db`, `src/lib`, `src/components`) instead of
  the spec's root-level layout. Keeping `src/` — the spec's structure applies inside it
  (`/content` and `/scripts` stay at the root as they are not application code).

**Demo code to remove when real features land (Steps 3–5):** `StudyPlanner` component
and its test, `study-session-store.ts`, `validation.ts` (`studyTopicSchema`), the
placeholder home page, and the `e2e/home.spec.ts` flow — none of these are spec
features (the demo `study_plans` table is already gone).

---

## Step 0 — Project initialization `[x]`

**Goal**: have a working Next.js project with base tooling configured, but no business features yet.

**Tasks**:
- Scaffold Next.js (App Router, TypeScript, Tailwind CSS 4) via the official generator.
- Configure pnpm.
- Initialize shadcn/ui.
- ESLint + Prettier.
- Initialize the Git repo (if not already done) + a proper `.gitignore` (include `data/*.db`, `.env*`, `node_modules`).
- `README.md` skeleton (will be completed in Step 10).
- `LICENSE` file (MIT).

**Files involved**: project root, `package.json`, Tailwind 4 CSS config, `.eslintrc`, `LICENSE`, `README.md`, `.gitignore`.

**Validation criteria**:
- `pnpm dev` launches the application without error on a default home page.
- `pnpm lint` passes without errors.
- The Git repo contains a clean first commit.

---

## Step 1 — Data layer (Drizzle, dual dialect) `[x]`

**Goal**: set up user data persistence, working in both SQLite and Postgres, with no UI yet.

**Tasks**:
- Install Drizzle ORM + drizzle-kit + `better-sqlite3` + the chosen Postgres driver.
- Create `db/schema.ts` with the `user_profile`, `user_certifications`, `question_attempts` tables (see spec section 4.2).
- Create `db/client.ts`: mode detection via `POSTGRES_URL`, instantiate the corresponding adapter.
- Create `drizzle.config.sqlite.ts` and `drizzle.config.postgres.ts`.
- Generate initial migrations for both dialects.
- `pnpm db:migrate` script that applies the migration matching the detected mode.
- A small script or manual test that writes then reads back a row in each table, for both dialects (at least locally; Postgres can be tested against a dev Neon database if available, otherwise document how to test it later).

**Files involved**: `db/*`, `package.json` (scripts), `.env.example`.

**Validation criteria**:
- `pnpm db:migrate` works in SQLite mode with no `POSTGRES_URL` set.
- The Postgres schema generates without error (even if not tested under real conditions at this stage).
- No business logic references SQLite or Postgres directly outside of `db/client.ts`.

---

## Step 2 — Content structure + validation `[x]`

**Goal**: be able to store and validate question banks, with one complete sample certification.

**Tasks**:
- Create the `/content/<provider>/<slug>/meta.json` + `questions.json` directory structure.
- Create one realistic, complete sample certification (e.g. AWS Cloud Practitioner), with at least 15-20 varied questions (single and multiple choice), to have material for testing later steps.
- Create `lib/content/schema.ts` (Zod schemas for `meta.json` and `questions.json`).
- Create `lib/content/loader.ts` (server-only reading, in-memory cache, `getAllCertifications()`, `getCertificationBySlug()`, `getQuestions(slug)` functions).
- Create `scripts/validate-content.ts`, which validates all of `/content` and exits with an error if any file is invalid.

**Files involved**: `/content/**`, `lib/content/*`, `scripts/validate-content.ts`.

**Validation criteria**:
- `pnpm validate-content` (or equivalent) passes on the sample content.
- Deliberately breaking a required field in a test JSON file, the script correctly detects the error.
- The loader returns correctly typed data (types derived from the Zod schemas).

---

## Step 3 — Onboarding `[x]`

**Goal**: working first-launch flow, user profile created exactly once.

**Tasks**:
- `/onboarding` page: form for name + job title + selection of certifications to track (dynamic list from `lib/content/loader.ts`, grouped by provider).
- Server Action that writes `user_profile` (with `onboarding_done = true`) and creates the corresponding `user_certifications`.
- Logic in the root layout: if `onboarding_done` is false or profile is missing, automatically redirect to `/onboarding`.
- Redirect to `/dashboard` (even basic/empty at this stage) after submission.

**Files involved**: `app/onboarding/*`, `app/layout.tsx`, related Server Actions.

**Validation criteria**:
- On a fresh database, the first app access correctly redirects to `/onboarding`.
- After completing the form, the profile is correctly stored and the user is never redirected to onboarding again on subsequent loads.
- The selected certifications correctly appear in `user_certifications`.

---

## Step 4 — Dashboard + progress calculation `[x]`

**Goal**: visualize, for each tracked certification, real progress (even before the quiz engine exists — numbers will be at 0, but the mechanism must be in place).

**Tasks**:
- `lib/progress/`: calculation functions (answered / total, mastery / total, breakdown by domain) from `question_attempts` + content.
- `/dashboard` page: one card per tracked certification (name, provider, progress bar, `X/Y correct answers`, status *Not started / In progress / Exam ready*).
- Component to add an additional tracked certification without going through full onboarding again.

**Files involved**: `lib/progress/*`, `app/dashboard/*`, `components/*` (cards, progress bars via shadcn).

**Validation criteria**:
- The dashboard correctly displays tracked certifications with 0/total counters.
- Adding a new tracked certification works and appears immediately.
- Progress calculations are covered by a basic Vitest unit test (0 answers case, partial case, 100% case).

---

## Step 5 — Quiz engine `[x]`

**Goal**: actually be able to answer questions and see progress change accordingly.

**Tasks**:
- `/certifications/[slug]/quiz` page: select a batch of questions (e.g. all / not-yet-mastered / N random).
- Question-by-question display (single/multiple choice depending on `multipleAnswers`), immediate feedback (correct/incorrect + explanation).
- Answer submission Server Action: upsert into `question_attempts` (latest attempt wins, `attempts_count` incremented).
- End-of-session screen with a summary (session score).
- Link back to the dashboard, with updated progress visible.

**Files involved**: `app/certifications/[slug]/quiz/*`, related Server Actions, question/option components.

**Validation criteria**:
- A user can start a quiz, answer questions, and see the dashboard reflect the new stats immediately afterward.
- Answering the same question twice correctly updates the existing row (no duplicate), with `attempts_count` incrementing.

---

## Step 6 — Certification detail view (by domain) `[x]`

**Goal**: provide useful granularity for effective revision.

**Tasks**:
- `/certifications/[slug]` page: detailed view with breakdown by domain (`domains` from `meta.json`), mastery percentage per domain.
- Ability to launch a quiz targeted at a specific domain from this view.

**Files involved**: `app/certifications/[slug]/page.tsx`, reuse of `lib/progress/*`.

**Validation criteria**:
- The domain breakdown correctly matches the `domainId` of the questions in the bank.
- Launching a domain-filtered quiz only offers questions from that domain.

---

## Step 7 — User data export / import `[x]`

**Goal**: let the user manually back up / transport their data.

**Tasks**:
- "Export my data" button (profile/settings page) generating a downloadable JSON file (`user_profile`, `user_certifications`, `question_attempts`).
- "Import" button with format validation before re-injecting into the database (upsert, no duplicates).

**Files involved**: `app/settings/*` (or equivalent), export/import Server Actions, Zod schema for validating the imported file.

**Validation criteria**:
- An export followed by an import on a fresh database restores exactly the same progress state.
- A malformed import file is cleanly rejected with a clear message, without corrupting existing data.

---

## Step 8 — Dockerization (turnkey Local mode) `[x]`

**Goal**: let a non-developer user run CertDojo locally without installing Node.

**Tasks**:
- `docker/Dockerfile` (multi-stage build, production image).
- `docker/docker-compose.yml` with a mounted volume for SQLite file persistence.
- Minimal documentation (will be merged into the full README in Step 10).

**Files involved**: `docker/*`.

**Validation criteria**:
- `docker compose up` starts the application, accessible locally.
- Restarting the container preserves previously saved data (test: create some progress, restart, verify it's still there).

---

## Step 9 — Vercel deployment readiness `[ ]`

**Goal**: make sure Vercel mode actually works, not just in theory.

**Tasks**:
- Verify/adjust configuration so the Vercel build works without write access to the filesystem at runtime (except reading `/content`).
- Document the procedure: deploying the repo to Vercel, adding the Vercel Postgres integration (Storage → Create → Postgres), applying Postgres migrations after the first deployment.
- Verify that `db/client.ts` correctly switches to the Postgres adapter when `POSTGRES_URL` is injected by Vercel.

**Files involved**: any Vercel configuration (`vercel.json` if needed), documentation.

**Validation criteria**:
- No filesystem write is ever attempted in Vercel mode (verified by re-reading the code, especially `db/client.ts` and any `fs` access).
- The actual test deployment to Vercel (with Postgres attached, completing onboarding and answering a quiz without error) is done by the user, not Claude — Claude prepares/documents the setup but does not perform or claim to perform a live deployment test.

---

## Step 10 — Tests, final documentation, open source governance `[ ]`

**Goal**: make the project presentable and usable by the community.

**Tasks**:
- Complete Vitest coverage (progress calculation, content loader, attempt upsert).
- Add one critical Playwright e2e flow: onboarding → quiz → dashboard.
- Finalize `README.md` (overview, Local installation with/without Docker, Vercel deployment, content structure).
- Write `CONTRIBUTING.md` (expected format for proposing a certification/questions, validation process).
- Verify the GitHub Actions CI (lint + tests + content validation on every PR).

**Files involved**: tests, `README.md`, `CONTRIBUTING.md`, `.github/workflows/*`.

**Validation criteria**:
- `pnpm test` and the Playwright flow pass locally.
- The GitHub Actions CI runs correctly on a test pull request.
- An external contributor could, by reading only `CONTRIBUTING.md`, add a new certification without further help.

---

## End of V1

Once Step 10 is validated, CertDojo's V1 is considered complete against the specifications. Any feature not explicitly covered in the specifications should be treated as out of scope for V1 and left for a future V2 plan, to be written separately.
