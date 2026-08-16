import type { ReactNode } from "react";
import Link from "next/link";

import { BrandLockup } from "@/components/brand";
import { cn } from "@/lib/utils";

// The three "nothing here" moments — empty dashboard, not found, error —
// share one block (DESIGN.md Lot 7 amendment): a dashed rule, a mono kicker,
// a plain statement, and at most one way out. The dashed border is the same
// pattern the dashboard's empty state established.
export function DeadEnd({
  kicker,
  title,
  children,
  action,
  tone = "neutral",
}: {
  kicker: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  // "flag" is for an actual failure; not-found and empty states stay neutral,
  // so red keeps meaning "something broke".
  tone?: "neutral" | "flag";
}) {
  return (
    <section
      className={cn(
        "grid place-items-center gap-2 rounded-xl border border-dashed px-6 py-16 text-center",
        tone === "flag" ? "border-destructive/40" : "border-border",
      )}
    >
      <p
        className={cn(
          "font-mono text-xs tracking-widest uppercase",
          tone === "flag" ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {kicker}
      </p>
      <p className="font-medium">{title}</p>
      {children ? (
        <div className="text-muted-foreground max-w-prose text-sm leading-6">
          {children}
        </div>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  );
}

// Minimal top bar for screens that render outside a normal page's data (not
// found, error): the lockup and a single way back. The four data screens keep
// their own richer headers until DS-05 extracts a shared <AppHeader>.
export function DeadEndHeader({
  backHref = "/dashboard",
  backLabel = "Dashboard",
}) {
  return (
    <header className="bg-card border-b">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/">
          <BrandLockup />
        </Link>
        <Link
          href={backHref}
          className="text-muted-foreground hover:text-foreground font-mono text-xs tracking-widest uppercase"
        >
          ← {backLabel}
        </Link>
      </div>
    </header>
  );
}
