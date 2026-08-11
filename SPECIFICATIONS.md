# CertPrep — Specifications (V1)

## 1. Vision

CertPrep is an **open source** web platform for practicing tech certification MCQs (AWS, HashiCorp, Google Cloud, Microsoft, etc.). It's a **single-user** tool, with no account or authentication system, designed to run in two **mutually exclusive** ways:

- **Local Mode**: the user runs the application on their own machine (via Docker or `pnpm dev`), and all their data stays on their machine.
- **Vercel Mode**: the user deploys the application on their own Vercel account, with a Postgres database attached.

The mode is **not a toggle in the UI**: it's determined automatically by how the application is started (presence or absence of a Postgres connection environment variable). The two modes never coexist for the same instance.

## 2. Guiding principles

1. **Single-user, zero auth.** One profile per application instance.
2. **Two storage backends, one business logic.** The application code must never know whether it's running on SQLite or Postgres.
3. **Content vs. user data, strict separation.** Question banks are *content* versioned in Git (JSON), not database records. Attempts, the profile, and tracked certifications are *user data*, stored in the database.
4. **One-time onboarding.** Name, job title, and tracked certifications are asked once on first launch, never asked again.
5. **Factual gamification, not artificial.** No XP points, no levels, no streaks. The only progress measure is derived from the user's actual answers to questions.
6. **Open to community contribution.** Anyone should be able to propose a new certification or new questions via a pull request, without touching the application code.
7. **MIT license**, open source from V1.

## 3. Tech stack (target versions as of August 11, 2026)

| Layer | Choice | Target version |
|---|---|---|
| Framework | Next.js (App Router) | 16.3.x or newer |
| UI runtime | React | 19.2.x or newer |
| Language | TypeScript | latest stable |
| CSS | Tailwind CSS | 4.x (Oxide engine, CSS-native config) |
| Components | shadcn/ui | latest version via CLI |
| Ephemeral UI state | Zustand | 5.x |
| ORM | Drizzle ORM + drizzle-kit | 0.45.x or newer |
| DB in Local mode | SQLite (file) via `better-sqlite3` | latest stable |
| DB in Vercel mode | Postgres (Vercel Postgres / Neon) via `@neondatabase/serverless` or `pg` | latest stable |
| Validation | Zod | 4.x |
| Unit tests | Vitest + Testing Library | latest stable |
| E2E tests | Playwright | latest stable |
| Local packaging | Docker + docker-compose | — |
| Package manager | pnpm | latest stable |
| License | MIT | — |

**Rule for Claude Code**: never hard-code an old version number known from training data. Always install via `@latest` or equivalent at execution time, keeping Next 16 / React 19 / Tailwind 4 as an explicit minimum floor.

## 4. Architecture

### 4.1 Runtime mode detection

- If the `POSTGRES_URL` environment variable (or equivalent Vercel Postgres variable) is present → Postgres adapter.
- Otherwise → SQLite adapter, default file: `data/certprep.db` (path configurable via `SQLITE_PATH`).
- This detection happens in a single entry point (`db/client.ts`), never duplicated elsewhere in the code.

### 4.2 Data layer — Drizzle schema (single definition, two dialects)

Tables (**user** data only, no question content here):

```
user_profile
  id              text/int, PK, fixed unique value ("singleton")
  name            text
  job_title       text
  onboarding_done boolean         default false
  created_at      timestamp

user_certifications
  id                  text/int, PK
  certification_slug  text        -- references /content/<provider>/<slug>
  added_at            timestamp
  is_active           boolean     default true

question_attempts
  id                  text/int, PK
  certification_slug  text
  question_id         text        -- references the id in questions.json
  is_correct          boolean     -- result of the LATEST attempt
  attempts_count      integer     default 1
  last_attempted_at   timestamp
  UNIQUE (certification_slug, question_id)
```

> No `certifications` or `questions` table in the database: this is content data, read from the JSON files (see 4.3). The database only stores the *relationship* between the user and this content (which certifications they track, which questions they've attempted).

Migrations: generated separately for each dialect via `drizzle-kit` (`drizzle.config.sqlite.ts` and `drizzle.config.postgres.ts`), from the same logical schema file. Any schema change must be tested against both dialects.

### 4.3 Certification content (outside the database)

Directory structure:

```
/content
  /aws
    /clf-c02
      meta.json
      questions.json
    /saa-c03
      meta.json
      questions.json
  /hashicorp
    /terraform-associate
      meta.json
      questions.json
  ...
```

`meta.json` (certification metadata):

```json
{
  "slug": "clf-c02",
  "provider": "aws",
  "name": "AWS Certified Cloud Practitioner",
  "examCode": "CLF-C02",
  "description": "Entry-level AWS certification.",
  "officialUrl": "https://aws.amazon.com/certification/certified-cloud-practitioner/",
  "domains": [
    { "id": "cloud-concepts", "name": "Cloud Concepts", "weight": 24 },
    { "id": "security", "name": "Security and Compliance", "weight": 30 },
    { "id": "technology", "name": "Technology", "weight": 34 },
    { "id": "billing", "name": "Billing and Support", "weight": 12 }
  ]
}
```

`questions.json` (question bank):

```json
[
  {
    "id": "clf-c02-0001",
    "domainId": "security",
    "question": "Which AWS service is used to manage identities and access?",
    "multipleAnswers": false,
    "options": [
      { "id": "a", "text": "AWS IAM" },
      { "id": "b", "text": "AWS CloudTrail" },
      { "id": "c", "text": "AWS Config" },
      { "id": "d", "text": "AWS Shield" }
    ],
    "correctOptionIds": ["a"],
    "explanation": "AWS IAM (Identity and Access Management) manages users, groups, roles, and permissions."
  }
]
```

Validation: Zod schemas (`lib/content/schema.ts`) validating `meta.json` and `questions.json`. A script (`scripts/validate-content.ts`) scans `/content` and validates every file — run in CI (GitHub Actions) to block malformed community PRs.

Loading: `lib/content/loader.ts`, server-only reading (`fs`), with in-memory caching — works the same way locally and at build/runtime on Vercel since it's read-only, never write.

### 4.4 Target project structure

```
/app
  /onboarding
  /dashboard
  /certifications/[slug]
  /certifications/[slug]/quiz
/components        -- UI components (shadcn + custom)
/db
  schema.ts
  client.ts
  /migrations/sqlite
  /migrations/postgres
/content            -- question banks (see 4.3)
/lib
  /content          -- schema.ts, loader.ts
  /progress         -- progress/mastery calculations
/scripts
  validate-content.ts
/docker
  Dockerfile
  docker-compose.yml
```

## 5. V1 Features

### 5.1 Onboarding (first launch)

- On first load, if `user_profile.onboarding_done = false` (or profile doesn't exist) → redirect to `/onboarding`.
- Steps: name, job title, selection of certifications to track (list derived from content available in `/content`, grouped by provider).
- On submission: write the profile (with `onboarding_done = true`) and create the corresponding `user_certifications` rows.
- No auth session/cookie: state is simply read from the database on each root layout load.

### 5.2 Dashboard

- One card per tracked certification, showing:
  - Certification name and provider.
  - Progress bar (% mastery, see 5.4).
  - Counter `X/Y correct answers`.
  - Simple status: *Not started* / *In progress* / *Exam ready* (configurable threshold, e.g. 80% correct answers across the entire bank).
- Ability to add a new tracked certification (without going through full onboarding again).

### 5.3 Quiz engine

- Page `/certifications/[slug]/quiz`: select a batch of questions (e.g. 10/20/all not-yet-mastered questions) for the chosen certification.
- Question-by-question display, single or multiple choice depending on `multipleAnswers`.
- Immediate feedback after each answer (correct/incorrect + explanation).
- At the end of the session, update `question_attempts` (upsert by `certification_slug` + `question_id`, latest attempt wins, `attempts_count` incremented).

### 5.4 Progress tracking / simple gamification

Per certification:
- **Answered** = number of questions with at least one attempt / total number of questions in the bank.
- **Mastery** = number of questions whose latest attempt is correct / total number of questions in the bank.
- Optional breakdown **by domain** (`domains` from `meta.json`): same calculation restricted to questions in that domain — useful since professional certifications are structured around weighted domains.

No points, levels, or streaks system: only percentages and counters derived from actual answers.

### 5.5 User data export / import

- "Export my data" button: generates a JSON file containing `user_profile`, `user_certifications`, `question_attempts`.
- "Import" button: re-injects this data (useful for switching machines, migrating from Local mode to Vercel, or backing up before a schema migration).

### 5.6 Multi-certification management

- The user can track multiple certifications at once, add/remove them from the dashboard without losing the history of attempts already recorded.

## 6. Design / UX

### 6.1 General principles

- Sober, productivity-oriented interface (closer to a revision tool than a marketing site).
- Tailwind CSS 4 + shadcn/ui, basic accessibility ensured by Radix (keyboard navigation, aria).
- Dark mode acceptable as default, with a light/dark toggle.
- No dependency on external fonts or assets that aren't versioned (consistent with fully local usage).

### 6.2 Design direction (avoiding generic AI-generated UI)

Before building any UI (starting at Step 4 of the dev plan, and applied consistently for every screen after), produce a short design plan and have it critiqued before writing component code. This applies to every screen built afterward, not just the first one.

**Design plan, required before implementation:**
- **Palette**: 4–6 named hex values, each justified by CertPrep's actual subject matter (certification exams, technical study, mastery tracking) — not a generic "clean dashboard" palette.
- **Typography**: two typefaces with clear, distinct roles (a display face used with restraint, a body face optimized for long-form question text), chosen deliberately rather than reached for by default.
- **Layout concept**: a short prose description plus a rough ASCII wireframe of the key screens (dashboard, quiz).
- **Signature element**: the one specific, memorable visual element CertPrep will be recognized by (e.g. a distinctive way of visualizing per-domain mastery, a distinctive question-card treatment) — everything else stays quiet and disciplined around it.

**Explicitly avoid these generic AI-design defaults** unless a specific reason ties them to CertPrep:
1. Warm cream background + high-contrast serif headline + terracotta/clay accent.
2. Near-black background with a single bright acid-green or vermilion accent.
3. Broadsheet/editorial layout — hairline rules, zero border-radius, dense newspaper-style columns.

**Critique step**: before implementing, check the design plan against the question "is this the default answer I'd produce for any similar dashboard app?" Revise anything that reads as generic rather than specific to CertPrep, and note what was changed and why. Only implement after this critique.

**Ground the identity in the real subject**: mine visual language from the domain itself — exam interfaces (timers, answer sheets, score reports), certification badge/credential aesthetics, or the specific visual vocabulary of providers like AWS/HashiCorp — rather than generic SaaS dashboard conventions.

## 7. Non-functional constraints

- **Offline capability in Local mode**: no network request required to use the application once installed (except initial font loading if applicable — to be avoided).
- **Docker**: `Dockerfile` + `docker-compose.yml` allowing `docker compose up` without installing Node locally, with a mounted volume for SQLite file persistence.
- **GitHub Actions CI**: lint, tests, and content validation (`scripts/validate-content.ts`) on every pull request.
- **Tests**: minimum coverage on progress calculation, content loader, and quiz engine (Vitest). One critical e2e flow (onboarding → quiz → dashboard) in Playwright.
- **Performance**: JSON content reading is cached, no disk reload on every request.

## 8. License & open source governance

- **MIT** license.
- `CONTRIBUTING.md` describing the expected format for proposing a new certification or new questions (`meta.json`/`questions.json` structure, mandatory Zod validation before merge).
- `README.md` covering: project overview, Local mode installation (with and without Docker), Vercel mode deployment, content structure for contributors.
