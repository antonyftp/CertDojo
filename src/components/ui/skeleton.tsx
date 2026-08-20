import { cn } from "@/lib/utils";

// Placeholder cell for a value that has not arrived yet. `bg-muted`, not
// shadcn's default `bg-accent`: accent is the scantron blue, and DESIGN.md
// reserves blue for interactive elements.
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-muted animate-pulse rounded-md", className)}
      {...props}
    />
  );
}
