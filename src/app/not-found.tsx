import Link from "next/link";

import { DeadEnd, DeadEndHeader } from "@/components/dead-end";
import { Button } from "@/components/ui/button";

// Covers both the notFound() calls inside the app (certifications/[slug], and
// twice in the quiz route) and any URL matching no route at all.
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
