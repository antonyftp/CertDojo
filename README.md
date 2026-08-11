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
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm db:generate
```

## Database modes

- `DATABASE_PROVIDER=sqlite` uses `better-sqlite3` with `DATABASE_FILE`
- `DATABASE_PROVIDER=postgres` uses `DATABASE_URL` for Postgres / Neon

## Docker

```bash
docker compose up --build
```
