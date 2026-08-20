import type { Metadata } from "next";
import Link from "next/link";

import {
  AddCertificationDialog,
  type ProviderGroup,
} from "@/components/add-certification-dialog";
import { AppHeader } from "@/components/app-header";
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
import { DeadEnd } from "@/components/dead-end";
import { Kicker } from "@/components/kicker";
import { computeCertificationProgress } from "@/lib/progress/progress";

export const metadata: Metadata = { title: "Dashboard — CertDojo" };

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
      <AppHeader homeHref={null}>
        <Link
          href="/settings"
          className="text-muted-foreground hover:text-foreground font-mono text-xs tracking-widest uppercase"
        >
          Settings
        </Link>
        <AddCertificationDialog providerGroups={availableGroups} />
      </AppHeader>
      <main
        id="main-content"
        className="mx-auto grid w-full max-w-5xl gap-8 px-6 py-10"
      >
        <section className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {profile.name}
          </h1>
          <p className="text-muted-foreground">{profile.jobTitle}</p>
          <Kicker className="mt-2">
            {`${cards.length} certification${cards.length === 1 ? "" : "s"} tracked`}
          </Kicker>
        </section>
        {cards.length === 0 ? (
          // Same block as the 404 and error screens (DESIGN.md
          // "dead-end states").
          <DeadEnd
            kicker="Nothing tracked"
            title="No certifications tracked yet."
          >
            Use “Track certification” above to pick one and start practicing.
          </DeadEnd>
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
