import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CertificationStatus } from "@/lib/progress/progress";

// Status chips are worded and coloured like score-report bands (DESIGN.md).
const statusStyles: Record<
  CertificationStatus,
  { label: string; className: string }
> = {
  "not-started": {
    label: "Not started",
    className: "border-border text-muted-foreground",
  },
  // Mastery green, not accent blue: DESIGN.md limits blue to interactive
  // elements, and low-opacity green reads as "earned progress".
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
