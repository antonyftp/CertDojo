"use client";

import { useEffect } from "react";

import { DeadEnd, DeadEndHeader } from "@/components/dead-end";
import { Button } from "@/components/ui/button";

// At the app root rather than inside (app): an error file wraps its CHILD
// segments, so this one also covers /settings, /onboarding, and the
// getUserProfile() read in (app)/layout.tsx — the most likely thing to throw
// when the database is unreachable. A failure in the root layout itself would
// need global-error.tsx, which renders without the app's styles; not worth it.
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  // Next 16.3 renamed the recovery prop: retry() re-fetches and re-renders
  // the boundary's children, where the older reset() only cleared state.
  retry: () => void;
}) {
  useEffect(() => {
    // Self-hosted, single-user app: the server console is the error reporting
    // service.
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-dvh">
      <DeadEndHeader />
      <main
        id="main-content"
        className="mx-auto grid w-full max-w-5xl gap-8 px-6 py-10"
      >
        <DeadEnd
          tone="flag"
          kicker="Scoring error"
          title="Something went wrong loading this screen."
          action={<Button onClick={() => retry()}>Try again</Button>}
        >
          <p>
            Your data has not been changed. If this keeps happening, the
            database is the first place to look — in Local mode check that{" "}
            <code className="font-mono">data/certdojo.db</code> is readable, in
            Vercel mode that the Postgres database is reachable.
          </p>
          {error.digest ? (
            <p className="mt-3 font-mono text-xs tracking-wider">
              Reference {error.digest}
            </p>
          ) : null}
        </DeadEnd>
      </main>
    </div>
  );
}
