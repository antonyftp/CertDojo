import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { BlueprintStrip } from "@/components/blueprint-strip";
import { Badge } from "@/components/ui/badge";
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
import type {
  CertificationProgress,
  CertificationStatus,
} from "@/lib/progress/progress";

// Status chips are worded and colored like score-report bands (DESIGN.md):
// exam-ready wears the credential-seal gold, in-progress the interactive
// blue tint, not-started stays quiet.
const statusChip: Record<
  CertificationStatus,
  { label: string; className: string }
> = {
  "not-started": {
    label: "Not started",
    className: "border-border text-muted-foreground",
  },
  "in-progress": {
    label: "In progress",
    className: "border-primary/30 bg-accent text-accent-foreground",
  },
  "exam-ready": {
    label: "Exam ready",
    className: "border-seal/40 bg-seal/15 text-seal",
  },
};

export function CertificationCard({
  meta,
  progress,
}: {
  meta: CertificationMeta;
  progress: CertificationProgress;
}) {
  const chip = statusChip[progress.status];

  return (
    <Card>
      <CardHeader>
        <CardDescription className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
          {meta.provider} · {meta.examCode}
        </CardDescription>
        <CardTitle className="text-base leading-snug">{meta.name}</CardTitle>
        <CardAction>
          <Badge
            variant="outline"
            className={`font-mono text-[10px] tracking-wider uppercase ${chip.className}`}
          >
            {chip.label}
          </Badge>
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
            className="bg-muted h-2 [&>[data-slot=progress-indicator]]:bg-mastery"
          />
        </div>
        <div className="grid gap-1.5">
          <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
            Exam blueprint
          </span>
          <BlueprintStrip domains={progress.domains} />
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild size="sm" className="ml-auto">
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
