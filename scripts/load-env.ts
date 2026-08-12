// Side-effect import: makes .env.local visible to the CLI scripts, which run
// under tsx (unlike `next dev`/`next build`, tsx does not load env files).
// Needed for the documented Vercel migration flow: `vercel env pull
// .env.local` then `pnpm db:migrate`. Variables already present in the
// environment are never overridden.

import fs from "node:fs";

if (fs.existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}
