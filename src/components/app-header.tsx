import type { ReactNode } from "react";
import Link from "next/link";

import { BrandLockup } from "@/components/brand";

// The slim top bar (DESIGN.md "Layout concept"), shared by every screen. The
// flex-wrap here and the min-w-0 on the trailing slot are what let it survive
// a narrow viewport.
export function AppHeader({
  homeHref = "/dashboard",
  children,
  below,
}: {
  // The onboarding screen has nowhere to go home to yet, so the lockup is
  // plain text there rather than a dead link.
  homeHref?: string | null;
  // Trailing slot: a back link, a status line, or actions.
  children?: ReactNode;
  // Full-width slot under the main row, inside the same ruled surface — the
  // quiz's session progress bar lives here.
  below?: ReactNode;
}) {
  return (
    <header className="bg-card border-b">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-4">
        {homeHref ? (
          <Link href={homeHref} className="shrink-0">
            <BrandLockup />
          </Link>
        ) : (
          <BrandLockup className="shrink-0" />
        )}
        {children ? (
          <div className="flex min-w-0 items-center gap-4">{children}</div>
        ) : null}
      </div>
      {below ? (
        <div className="mx-auto w-full max-w-5xl px-6 pb-3">{below}</div>
      ) : null}
    </header>
  );
}

// The back link every screen but the dashboard carries.
export function AppHeaderBackLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="text-muted-foreground hover:text-foreground truncate font-mono text-xs tracking-widest uppercase"
    >
      ← {label}
    </Link>
  );
}
