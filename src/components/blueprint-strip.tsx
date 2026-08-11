import { cn } from "@/lib/utils";
import {
  EXAM_READY_THRESHOLD,
  type DomainProgress,
} from "@/lib/progress/progress";

// Signature element (DESIGN.md): a 1:1 miniature of the official exam
// blueprint. Segment width = the domain's official weight, fill = the user's
// mastery of that domain (verified green, seal gold once exam-ready).
export function BlueprintStrip({ domains }: { domains: DomainProgress[] }) {
  const totalWeight =
    domains.reduce((sum, domain) => sum + domain.weight, 0) || 1;

  const description = domains
    .map(
      (domain) =>
        `${domain.domainName} (${domain.weight}% of exam): ${domain.masteryPercent}% mastered`,
    )
    .join("; ");

  return (
    <div className="grid gap-1">
      <div
        role="img"
        aria-label={`Exam blueprint — ${description}`}
        className="flex h-2.5 gap-[3px]"
      >
        {domains.map((domain) => (
          <div
            key={domain.domainId}
            title={`${domain.domainName} — ${domain.weight}% of exam · ${domain.correctCount}/${domain.totalQuestions} mastered (${domain.masteryPercent}%)`}
            className="bg-muted h-full overflow-hidden rounded-[2px] first:rounded-l-full last:rounded-r-full"
            style={{ flexBasis: `${(domain.weight / totalWeight) * 100}%` }}
          >
            <div
              className={cn(
                "h-full",
                domain.masteryPercent >= EXAM_READY_THRESHOLD * 100
                  ? "bg-seal"
                  : "bg-mastery",
              )}
              style={{ width: `${domain.masteryPercent}%` }}
            />
          </div>
        ))}
      </div>
      <div
        aria-hidden="true"
        className="text-muted-foreground flex gap-[3px] font-mono text-[10px]"
      >
        {domains.map((domain) => (
          <span
            key={domain.domainId}
            className="truncate"
            style={{ flexBasis: `${(domain.weight / totalWeight) * 100}%` }}
          >
            {domain.weight}%
          </span>
        ))}
      </div>
    </div>
  );
}
