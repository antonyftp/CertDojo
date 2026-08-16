import { BrandLockup } from "@/components/brand";
import { Skeleton } from "@/components/ui/skeleton";

// Audit FE-03. The quiz opens on its setup phase (batch picker), so this
// mirrors that — max-w-2xl column, identity block, then the answer-sheet rows
// of the batch choices — not the question view the user has not reached yet.
export default function QuizLoading() {
  return (
    <div className="min-h-dvh">
      <header className="bg-card border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <BrandLockup />
          <Skeleton className="h-3 w-28" />
        </div>
      </header>
      <main
        id="main-content"
        aria-busy="true"
        aria-label="Loading practice session"
        className="mx-auto grid w-full max-w-2xl gap-8 px-6 py-10"
      >
        <section className="grid gap-2">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72" />
        </section>
        <section className="grid gap-2">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <Skeleton className="size-4 rounded-full" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="ml-auto h-3 w-16" />
            </div>
          ))}
        </section>
        <Skeleton className="h-9 w-40" />
      </main>
    </div>
  );
}
