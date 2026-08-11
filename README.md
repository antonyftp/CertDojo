# CertPrep

CertPrep is an open-source Next.js 16 App Router starter for certification study plans. It includes React 19, TypeScript, Tailwind CSS 4, shadcn/ui-compatible components, Zustand state, Drizzle ORM, Zod validation, Vitest, Playwright, Docker packaging, and pnpm.

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
  `data/certprep.db` (override with `SQLITE_PATH`). All data stays on your
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
