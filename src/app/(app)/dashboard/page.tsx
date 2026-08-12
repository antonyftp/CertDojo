import Link from "next/link";

import {
  AddCertificationDialog,
  type ProviderGroup,
} from "@/components/add-certification-dialog";
import {
  CertificationCard,
  MissingContentCard,
} from "@/components/certification-card";
import {
  getActiveTrackedCertifications,
  getAttemptsByCertification,
  getUserProfile,
} from "@/db/queries";
import {
  getAllCertifications,
  getCertificationBySlug,
  getQuestions,
} from "@/lib/content/loader";
import { computeCertificationProgress } from "@/lib/progress/progress";

export default async function DashboardPage() {
  // The (app) layout guarantees a completed profile at this point.
  const profile = (await getUserProfile())!;
  const [tracked, attemptsBySlug] = await Promise.all([
    getActiveTrackedCertifications(),
    getAttemptsByCertification(),
  ]);

  const cards = tracked.map((row) => {
    const meta = getCertificationBySlug(row.certificationSlug);

    if (!meta) {
      return { id: row.id, slug: row.certificationSlug, meta: null };
    }

    const progress = computeCertificationProgress(
      meta,
      getQuestions(meta.slug),
      attemptsBySlug.get(meta.slug) ?? [],
    );

    return { id: row.id, slug: meta.slug, meta, progress };
  });

  const trackedSlugs = new Set(tracked.map((row) => row.certificationSlug));
  const availableGroups: ProviderGroup[] = [];

  for (const meta of getAllCertifications()) {
    if (trackedSlugs.has(meta.slug)) {
      continue;
    }

    const choice = {
      slug: meta.slug,
      name: meta.name,
      examCode: meta.examCode,
    };
    const group = availableGroups.find((g) => g.provider === meta.provider);

    if (group) {
      group.certifications.push(choice);
    } else {
      availableGroups.push({
        provider: meta.provider,
        certifications: [choice],
      });
    }
  }

  return (
    <div className="min-h-dvh">
      <header className="bg-card border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <span className="font-mono text-sm font-semibold tracking-widest">
            CERTPREP<span className="text-primary">{"///"}</span>
          </span>
          <div className="flex items-center gap-4">
            <Link
              href="/settings"
              className="text-muted-foreground hover:text-foreground font-mono text-xs tracking-widest uppercase"
            >
              Settings
            </Link>
            <AddCertificationDialog providerGroups={availableGroups} />
          </div>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-5xl gap-8 px-6 py-10">
        <section className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {profile.name}
          </h1>
          <p className="text-muted-foreground">{profile.jobTitle}</p>
          <p className="text-muted-foreground mt-2 font-mono text-xs tracking-widest uppercase">
            {cards.length} certification{cards.length === 1 ? "" : "s"} tracked
          </p>
        </section>
        {cards.length === 0 ? (
          <section className="border-border grid place-items-center gap-2 rounded-xl border border-dashed px-6 py-16 text-center">
            <p className="font-medium">No certifications tracked yet.</p>
            <p className="text-muted-foreground text-sm">
              Use “Track certification” above to pick one and start practicing.
            </p>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2">
            {cards.map((card) =>
              card.meta ? (
                <CertificationCard
                  key={card.id}
                  meta={card.meta}
                  progress={card.progress}
                />
              ) : (
                <MissingContentCard key={card.id} slug={card.slug} />
              ),
            )}
          </section>
        )}
      </main>
    </div>
  );
}
