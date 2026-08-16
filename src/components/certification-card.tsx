import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { BlueprintStrip } from "@/components/blueprint-strip";
import { Kicker } from "@/components/kicker";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { CertificationMeta } from "@/lib/content/schema";
import type { CertificationProgress } from "@/lib/progress/progress";

export function CertificationCard({
  meta,
  progress,
}: {
  meta: CertificationMeta;
  progress: CertificationProgress;
}) {
  return (
    <Card data-testid="certification-card">
      <CardHeader>
        <CardDescription className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
          {meta.provider} · {meta.examCode}
        </CardDescription>
        <CardTitle className="text-base leading-snug">
          <Link
            href={`/certifications/${meta.slug}`}
            className="hover:underline"
          >
            {meta.name}
          </Link>
        </CardTitle>
        <CardAction>
          <StatusBadge status={progress.status} />
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-1.5">
          <div className="flex items-baseline justify-between gap-2 font-mono text-xs">
            <span className="text-muted-foreground tracking-wider uppercase">
              Mastery{" "}
              <span className="text-foreground font-medium">
                {progress.masteryPercent}%
              </span>
            </span>
            <span className="text-muted-foreground">
              {progress.correctCount}/{progress.totalQuestions} correct
            </span>
          </div>
          <Progress
            value={progress.masteryPercent}
            aria-label={`Mastery: ${progress.masteryPercent}%`}
            tone="mastery"
            className="h-2"
          />
        </div>
        <div className="grid gap-1.5">
          <Kicker as="span" className="text-2xs">
            Exam blueprint
          </Kicker>
          <BlueprintStrip domains={progress.domains} />
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button asChild size="sm" variant="outline" className="ml-auto">
          <Link href={`/certifications/${meta.slug}`}>Details</Link>
        </Button>
        <Button asChild size="sm">
          <Link href={`/certifications/${meta.slug}/quiz`}>
            Practice
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

// Degraded card for a tracked slug whose /content directory has been
// removed or renamed: keep the row visible instead of hiding user data.
export function MissingContentCard({ slug }: { slug: string }) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardDescription className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
          Unknown certification
        </CardDescription>
        <CardTitle className="text-base leading-snug">{slug}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          This certification is tracked but its content is missing from{" "}
          <code className="font-mono">/content</code>. Restore the content
          folder to see progress again.
        </p>
      </CardContent>
    </Card>
  );
}
