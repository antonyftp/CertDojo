import { buildBackupFile } from "@/lib/backup/export";

// "Export my data" (SPECIFICATIONS.md §5.5) is a plain GET download rather
// than a Server Action: actions cannot set Content-Disposition, and a real
// <a href> works with JavaScript disabled.
export const dynamic = "force-dynamic";

export async function GET() {
  const backup = await buildBackupFile();

  if (!backup) {
    return Response.json(
      { error: "Nothing to export yet: no profile exists on this instance." },
      { status: 404 },
    );
  }

  const date = new Date().toISOString().slice(0, 10);

  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="certdojo-backup-${date}.json"`,
    },
  });
}
