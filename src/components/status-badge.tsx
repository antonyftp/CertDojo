import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CertificationStatus } from "@/lib/progress/progress";

// Status chips are worded and coloured like score-report bands (DESIGN.md).
// Audit DS-04: the map lived in certification-card.tsx, was consumed through
// template literals instead of cn() by its two callers, and the quiz session
// re-typed the exam-ready classes by hand. One component, three call sites.
const statusStyles: Record<
  CertificationStatus,
  { label: string; className: string }
> = {
  "not-started": {
    label: "Not started",
    className: "border-border text-muted-foreground",
  },
  // Audit DS-03: this used bg-accent/text-accent-foreground — scantron blue —
  // on a non-interactive status chip, against DESIGN.md's rule that blue is
  // contractually limited to interactive elements. Mastery green at low
  // opacity says "earned progress", which is what in-progress means.
  "in-progress": {
    label: "In progress",
    className: "border-mastery/40 bg-mastery/10 text-mastery",
  },
  "exam-ready": {
    label: "Exam ready",
    className: "border-seal/40 bg-seal/15 text-seal",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: CertificationStatus;
  className?: string;
}) {
  const style = statusStyles[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-mono text-2xs tracking-wider uppercase",
        style.className,
        className,
      )}
    >
      {style.label}
    </Badge>
  );
}
