import Link from "next/link";

import { DeadEnd, DeadEndHeader } from "@/components/dead-end";
import { Button } from "@/components/ui/button";

// Audit FE-04: notFound() is called in three places (certifications/[slug],
// and twice in the quiz route) but there was no custom 404, so those paths —
// and any unmatched URL — fell through to Next's unstyled default page.
// A root not-found.tsx covers both cases at once.
export default function NotFound() {
  return (
    <div className="min-h-dvh">
      <DeadEndHeader />
      <main
        id="main-content"
        className="mx-auto grid w-full max-w-5xl gap-8 px-6 py-10"
      >
        <DeadEnd
          kicker="404 · No record"
          title="This page does not exist."
          action={
            <Button asChild>
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          }
        >
          If you followed a link to a certification, its question bank may have
          been removed from <code className="font-mono">/content</code> since.
          Tracked certifications whose content is gone still appear on the
          dashboard.
        </DeadEnd>
      </main>
    </div>
  );
}
