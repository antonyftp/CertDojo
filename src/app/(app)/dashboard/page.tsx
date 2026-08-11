import { eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { getUserProfile } from "@/db/queries";
import { getCertificationBySlug } from "@/lib/content/loader";

// Minimal placeholder: Step 4 replaces this with the real dashboard (cards,
// progress bars, per-certification status) behind a §6.2 design plan.
export default async function DashboardPage() {
  // The (app) layout guarantees a completed profile at this point.
  const profile = (await getUserProfile())!;

  const { db, schema } = getDatabase();
  const tracked = await db
    .select()
    .from(schema.userCertifications)
    .where(eq(schema.userCertifications.isActive, true));

  return (
    <main className="mx-auto grid w-full max-w-3xl gap-8 px-6 py-16">
      <header className="grid gap-2">
        <p className="text-muted-foreground text-sm font-medium tracking-[0.3em] uppercase">
          CertPrep
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome, {profile.name}
        </h1>
        <p className="text-muted-foreground text-base leading-7">
          {profile.jobTitle}
        </p>
      </header>
      <section className="grid gap-3">
        <h2 className="text-lg font-medium">Tracked certifications</h2>
        <ul className="grid gap-2">
          {tracked.map((row) => {
            const meta = getCertificationBySlug(row.certificationSlug);

            return (
              <li
                key={row.id}
                className="border-border rounded-lg border px-4 py-3"
              >
                <span className="font-medium">
                  {meta?.name ?? row.certificationSlug}
                </span>{" "}
                <span className="text-muted-foreground text-sm">
                  {meta
                    ? `${meta.provider.toUpperCase()} · ${meta.examCode}`
                    : ""}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="text-muted-foreground text-sm">
          Progress tracking arrives with the full dashboard in the next step.
        </p>
      </section>
    </main>
  );
}
