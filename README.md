# CertDojo

CertDojo is an open-source practice space for tech certification exams
(AWS, CNCF, HashiCorp, …). Track the certifications you're preparing,
answer realistic multiple-choice questions with instant feedback and
explanations, and watch your mastery grow domain by domain against the
official exam blueprint.

It's deliberately a **single-user** tool: no accounts, no authentication, no
telemetry. Your answers stay in your own database — a SQLite file on your
machine, or your own Postgres database if you deploy to Vercel.

- **Factual progress, no gamification** — no XP, levels, or streaks. Mastery
  is simply the share of questions whose latest attempt is correct, overall
  and per exam domain.
- **Community-driven content** — question banks are plain JSON files in this
  repository, validated in CI. Anyone can add a certification via a pull
  request without touching application code: see
  [CONTRIBUTING.md](CONTRIBUTING.md).
- **Offline-friendly** — Local mode needs no network at all once installed.

Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4,
shadcn/ui (Radix), Drizzle ORM, and Zod.

## Run it locally with Docker (no Node.js required)

Requires [Docker](https://docs.docker.com/get-docker/) with the Compose
plugin (included in Docker Desktop).

```bash
git clone https://github.com/antonyftp/CertDojo.git
cd CertDojo
docker compose up -d --build
```

Open <http://localhost:3000>. Database migrations are applied automatically
on first start — no extra setup step. Your progress lives in the
`certdojo-data` named volume, so it survives restarts, rebuilds, and
`docker compose down`.

Day-to-day commands:

```bash
docker compose stop      # stop, keep everything
docker compose start     # start again
docker compose down      # remove the container — your data is kept
docker compose up -d     # recreate; progress is still there

git pull && docker compose up -d --build   # update to a new version
                                           # (new migrations apply on startup)

docker compose down -v   # reset: permanently deletes profile and progress
```

To serve on another port, edit `ports` in `docker-compose.yml`
(e.g. `"8080:3000"` for <http://localhost:8080>).

## Run it locally without Docker

Requires Node.js 20+ (24 recommended) and pnpm via corepack.

```bash
git clone https://github.com/antonyftp/CertDojo.git
cd CertDojo
corepack enable pnpm
pnpm install
pnpm dev
```

Open <http://localhost:3000>. The database is a SQLite file at
`data/certdojo.db` (created and migrated automatically on first run;
override the path with `SQLITE_PATH`). For a production build:
`pnpm build && pnpm start`.

## Deploy to Vercel

No `vercel.json` is required: Vercel auto-detects Next.js, and the pnpm
version is pinned by the `packageManager` field.

1. Push the repository to GitHub (or GitLab/Bitbucket) and import it on
   [vercel.com/new](https://vercel.com/new). The first deployment will build,
   but the app cannot store data yet.
2. Attach a Postgres database: in the Vercel dashboard open your project →
   **Storage** → **Create Database** → pick a Postgres provider (e.g. **Neon**)
   and connect it to the project. This injects `DATABASE_URL` (and the legacy
   `POSTGRES_URL` alias) into the project's environment variables.
3. Redeploy so the new environment variables are picked up. The app now runs
   in Vercel mode automatically — see [Database modes](#database-modes).
4. Apply the Postgres migrations once, from your machine:

   ```bash
   pnpm dlx vercel link            # select the Vercel project
   pnpm dlx vercel env pull .env.local
   pnpm db:migrate                 # applies src/db/migrations/postgres
   pnpm db:smoke-test              # optional: write/read/delete one row per table
   ```

   Repeat `pnpm db:migrate` whenever a new version ships schema changes.

Notes:

- If the app runs on Vercel without a Postgres database attached, requests
  fail with an explicit error instead of silently attempting to write a
  SQLite file to the read-only filesystem.
- The question banks under `/content` are read-only at runtime and are bundled
  into the serverless functions via `outputFileTracingIncludes` in
  `next.config.ts`. Nothing is ever written to disk in Vercel mode.

## Database modes

The mode is detected automatically — there is no toggle:

- **Local mode** (default): no Postgres variable set → SQLite file at
  `data/certdojo.db` (override with `SQLITE_PATH`). All data stays on your
  machine.
- **Vercel mode**: `POSTGRES_URL` present (injected by the Vercel Postgres /
  Neon integration; `DATABASE_URL` is accepted as an equivalent) → Postgres.

Mode detection lives only in `src/db/client.ts`. To test the Postgres path
locally, set `POSTGRES_URL` to a dev database (e.g. a free Neon instance) and
run `pnpm db:migrate` followed by `pnpm db:smoke-test`.

Your data is never locked in: **Settings → Export my data** downloads a JSON
backup (profile, tracked certifications, attempts) that you can re-import on
any other CertDojo instance, in either mode.

## Content structure

Certifications and question banks are JSON files versioned in this
repository — never stored in the database:

```
content/
  <provider>/            e.g. aws, cncf
    <slug>/              e.g. clf-c02, kcna
      meta.json          name, exam code, official URL, domain blueprint
      questions.json     the question bank
```

Everything is validated by strict Zod schemas — locally with
`pnpm validate-content`, and in CI on every pull request. The full format
reference, field-by-field, is in [CONTRIBUTING.md](CONTRIBUTING.md): adding a
certification is a pure-JSON contribution.

## Development

```bash
pnpm dev                # dev server on :3000
pnpm lint               # eslint
pnpm format:check       # prettier (pnpm format to write)
pnpm typecheck          # tsc --noEmit
pnpm test               # Vitest unit/integration tests
pnpm test:e2e           # Playwright e2e (once: pnpm exec playwright install --with-deps chromium)
pnpm validate-content   # validate /content against the Zod schemas
pnpm db:generate        # regenerate migrations for both dialects
pnpm db:migrate         # apply migrations for the detected mode
pnpm db:smoke-test      # write/read one row per table in the detected mode
```

The Playwright suite covers the critical flow (onboarding → quiz →
dashboard) against a throwaway SQLite database on a dedicated port — it never
touches your real data. CI (`.github/workflows/ci.yml`) runs lint, format
check, typecheck, content validation, unit tests, and the e2e suite on every
pull request.

## License

[MIT](LICENSE)
