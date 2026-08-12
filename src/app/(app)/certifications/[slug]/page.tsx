import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightIcon, ExternalLinkIcon } from "lucide-react";

import { BlueprintStrip } from "@/components/blueprint-strip";
import { BrandLockup } from "@/components/brand";
import { statusChip } from "@/components/certification-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getAttemptsForCertification } from "@/db/queries";
import { getCertificationBySlug, getQuestions } from "@/lib/content/loader";
import {
  computeCertificationProgress,
  EXAM_READY_THRESHOLD,
} from "@/lib/progress/progress";
import { cn } from "@/lib/utils";

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
  const chip = statusChip[progress.status];

  return (
    <div className="min-h-dvh">
      <header className="bg-card border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/dashboard">
            <BrandLockup />
          </Link>
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground font-mono text-xs tracking-widest uppercase"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-3xl gap-8 px-6 py-10">
        <section className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
              {meta.provider} · {meta.examCode}
            </p>
            <Badge
              variant="outline"
              className={`font-mono text-[10px] tracking-wider uppercase ${chip.className}`}
            >
              {chip.label}
            </Badge>
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
          <h2 className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
            Domain breakdown
          </h2>
          <ol className="bg-card divide-y rounded-xl border">
            {progress.domains.map((domain, index) => {
              const isSealed =
                domain.masteryPercent >= EXAM_READY_THRESHOLD * 100;

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
                      <span className="text-muted-foreground ml-auto font-mono text-[10px] tracking-widest uppercase">
                        Weight {domain.weight}%
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress
                        value={domain.masteryPercent}
                        aria-label={`${domain.domainName} mastery: ${domain.masteryPercent}%`}
                        className={cn(
                          "bg-muted h-2",
                          isSealed
                            ? "[&>[data-slot=progress-indicator]]:bg-seal"
                            : "[&>[data-slot=progress-indicator]]:bg-mastery",
                        )}
                      />
                      <span className="text-muted-foreground shrink-0 font-mono text-xs">
                        {domain.masteryPercent}% · {domain.correctCount}/
                        {domain.totalQuestions} mastered
                      </span>
                    </div>
                  </div>
                  {domain.totalQuestions === 0 ? (
                    <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                      No questions yet
                    </span>
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
