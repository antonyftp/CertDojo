import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightIcon, ExternalLinkIcon } from "lucide-react";

import { BlueprintStrip } from "@/components/blueprint-strip";
import { AppHeader, AppHeaderBackLink } from "@/components/app-header";
import { Kicker } from "@/components/kicker";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getAttemptsForCertification } from "@/db/queries";
import { getCertificationBySlug, getQuestions } from "@/lib/content/loader";
import { computeCertificationProgress } from "@/lib/progress/progress";

export async function generateMetadata({
  params,
}: PageProps<"/certifications/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const meta = getCertificationBySlug(slug);

  return { title: meta ? `${meta.examCode} — CertDojo` : "CertDojo" };
}

// Certification detail view (DEV_PLAN_V1.md Step 6): the full score report
// for one certification — the blueprint strip enlarged as the anchor, then
// the domain-by-domain breakdown table with a per-domain practice launcher
// (DESIGN.md Step 6 amendment).
export default async function CertificationDetailPage({
  params,
}: PageProps<"/certifications/[slug]">) {
  const { slug } = await params;
  const meta = getCertificationBySlug(slug);

  if (!meta) {
    notFound();
  }

  const questions = getQuestions(slug);
  const attempts = await getAttemptsForCertification(slug);
  const progress = computeCertificationProgress(meta, questions, attempts);

  return (
    <div className="min-h-dvh">
      <AppHeader>
        <AppHeaderBackLink href="/dashboard" label="Dashboard" />
      </AppHeader>

      <main
        id="main-content"
        className="mx-auto grid w-full max-w-3xl gap-8 px-6 py-10"
      >
        <section className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Kicker>{`${meta.provider} · ${meta.examCode}`}</Kicker>
            <StatusBadge status={progress.status} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.name}</h1>
          <p className="text-muted-foreground text-sm">{meta.description}</p>
          <a
            href={meta.officialUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary inline-flex w-fit items-center gap-1 font-mono text-xs tracking-wider uppercase hover:underline"
          >
            Official exam guide
            <ExternalLinkIcon aria-hidden="true" className="size-3" />
          </a>
        </section>

        <section className="grid gap-2">
          <p className="font-mono text-xs tracking-wider">
            <span className="text-muted-foreground uppercase">Mastery </span>
            <span className="font-medium">{progress.masteryPercent}%</span>
            <span className="text-muted-foreground">
              {" "}
              · {progress.correctCount}/{progress.totalQuestions} correct ·{" "}
              {progress.answeredCount}/{progress.totalQuestions} answered
            </span>
          </p>
          <BlueprintStrip domains={progress.domains} className="h-4" />
        </section>

        <section className="grid gap-3">
          <Kicker as="h2" className="text-2xs">
            Domain breakdown
          </Kicker>
          <ol className="bg-card divide-y rounded-xl border">
            {progress.domains.map((domain, index) => {
              const isSealed = domain.isExamReady;

              return (
                <li
                  key={domain.domainId}
                  className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div className="grid gap-2">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-muted-foreground font-mono text-xs">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="font-medium">{domain.domainName}</span>
                      <Kicker as="span" className="ml-auto text-2xs">
                        {`Weight ${domain.weight}%`}
                      </Kicker>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress
                        value={domain.masteryPercent}
                        aria-label={`${domain.domainName} mastery: ${domain.masteryPercent}%`}
                        tone={isSealed ? "seal" : "mastery"}
                        className="h-2"
                      />
                      <span className="text-muted-foreground shrink-0 font-mono text-xs">
                        {domain.masteryPercent}% · {domain.correctCount}/
                        {domain.totalQuestions} mastered
                      </span>
                    </div>
                  </div>
                  {domain.totalQuestions === 0 ? (
                    <Kicker as="span" className="text-2xs">
                      No questions yet
                    </Kicker>
                  ) : (
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={`/certifications/${meta.slug}/quiz?domain=${encodeURIComponent(domain.domainId)}`}
                      >
                        Practice
                        <ArrowRightIcon aria-hidden="true" />
                      </Link>
                    </Button>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        <div className="flex justify-end">
          <Button asChild>
            <Link href={`/certifications/${meta.slug}/quiz`}>
              Practice all questions
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
