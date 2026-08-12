import "./load-env";

import { getRuntimeMode, getSqlitePath } from "@/db/client";
import { runMigrations } from "@/db/migrate";

async function main() {
  const mode = getRuntimeMode();

  console.log(
    mode === "postgres"
      ? "Applying Postgres migrations…"
      : `Applying SQLite migrations to ${getSqlitePath()}…`,
  );

  await runMigrations();

  console.log("Migrations applied.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
