import type { ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

// The "mono kicker" (DESIGN.md): small uppercase mono label naming a section
// or qualifying a value. Single definition — never hand-write the classes.
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
