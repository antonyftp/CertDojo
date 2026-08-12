# CertDojo

CertDojo is an open-source Next.js 16 App Router starter for certification study plans. It includes React 19, TypeScript, Tailwind CSS 4, shadcn/ui-compatible components, Zustand state, Drizzle ORM, Zod validation, Vitest, Playwright, Docker packaging, and pnpm.

## Stack

- Next.js 16.3
- React 19.2
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui-compatible component setup
- Zustand 5
- Drizzle ORM + drizzle-kit 0.45
- SQLite via better-sqlite3 for local mode
- Postgres via `@neondatabase/serverless` or `pg` for Vercel mode
- Zod 4
- Vitest + Testing Library
- Playwright
- Docker + docker-compose
- pnpm
- MIT license

## Getting started

```bash
corepack enable pnpm
pnpm install
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000.

## Scripts

```bash
pnpm dev
pnpm build
pnpm lint
pnpm format
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm db:generate   # regenerate migrations for both dialects
pnpm db:migrate    # apply migrations for the detected mode
pnpm db:smoke-test # write/read one row per table in the detected mode
```

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

## Docker

```bash
docker compose up --build
```

## Deploying to Vercel

No `vercel.json` is required: Vercel auto-detects Next.js, and the pnpm
version is pinned by the `packageManager` field. The `output: "standalone"`
setting only affects the Docker image and is ignored on Vercel.

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
