import { cn } from "@/lib/utils";

// Placeholder cell for a value that has not arrived yet. `bg-muted` rather
// than shadcn's default `bg-accent`: accent is the scantron blue tint, and
// DESIGN.md reserves blue for interactive elements — a skeleton is the least
// interactive thing on the page.
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-muted animate-pulse rounded-md", className)}
      {...props}
    />
  );
}
