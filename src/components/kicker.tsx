import type { ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

// The "mono kicker" (DESIGN.md): small uppercase mono label naming a section
// or qualifying a value. Audit DS-07 counted ~24 hand-written copies of the
// same class string, plus one local SectionKicker in settings that was never
// exported. This is the single definition.
export function Kicker({
  children,
  className,
  as: Component = "p",
  ...props
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
} & Record<string, unknown>) {
  return (
    <Component
      {...props}
      className={cn(
        "text-muted-foreground font-mono text-xs tracking-widest uppercase",
        className,
      )}
    >
      {children}
    </Component>
  );
}
