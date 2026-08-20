import { cn } from "@/lib/utils";
import { type DomainProgress } from "@/lib/progress/progress";

// Signature element (DESIGN.md): a 1:1 miniature of the official exam
// blueprint. Segment width = the domain's official weight, fill = the user's
// mastery of that domain (verified green, seal gold once exam-ready).
export function BlueprintStrip({
  domains,
  className,
}: {
  domains: DomainProgress[];
  // Height override: the dashboard card uses the default h-2.5; the
  // certification detail view renders the same strip larger as its anchor.
  className?: string;
}) {
  const totalWeight =
    domains.reduce((sum, domain) => sum + domain.weight, 0) || 1;

  const description = domains
    .map(
      (domain) =>
        `${domain.domainName} (${domain.weight}% of exam): ${domain.masteryPercent}% mastered`,
    )
    .join("; ");

  return (
    // Container query rather than a viewport breakpoint: the strip appears at
    // two very different widths (dashboard card vs. detail view), so what
    // matters is how much room it actually got, not how wide the window is.
    <div className="@container grid gap-1">
      <div
        role="img"
        aria-label={`Exam blueprint — ${description}`}
        className={cn("flex h-2.5 gap-[3px]", className)}
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
                domain.isExamReady ? "bg-seal" : "bg-mastery",
              )}
              style={{ width: `${domain.masteryPercent}%` }}
            />
          </div>
        ))}
      </div>
      {/* Hidden below the width where an 8%-weighted segment's label would
          still be readable. Nothing is lost: the strip itself stays, and the
          full breakdown is in its aria-label and each segment's title. */}
      <div
        aria-hidden="true"
        className="text-muted-foreground @max-[22rem]:hidden flex gap-[3px] font-mono text-2xs"
      >
        {domains.map((domain) => (
          <span
            key={domain.domainId}
            className="min-w-0 truncate"
            style={{ flexBasis: `${(domain.weight / totalWeight) * 100}%` }}
          >
            {domain.weight}%
          </span>
        ))}
      </div>
    </div>
  );
}
