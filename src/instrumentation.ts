// Runs once when the Next.js server starts, before it accepts requests.
// Local mode is meant to be turnkey (`docker compose up` or `pnpm dev` with
// no separate migrate step), so pending SQLite migrations are applied here
// automatically. Postgres (Vercel mode) migrations stay a deliberate manual
// step (`pnpm db:migrate`) — see DEV_PLAN_V1.md Step 9.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { getRuntimeMode } = await import("@/db/client");
  if (getRuntimeMode() !== "sqlite") return;

  const { runMigrations } = await import("@/db/migrate");
  await runMigrations();
}
