import { BrandLockup } from "@/components/brand";
import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the detail view's max-w-3xl column: identity block,
// the enlarged blueprint strip that anchors the screen, then the domain
// breakdown rows.
export default function CertificationDetailLoading() {
  return (
    <div className="min-h-dvh">
      <header className="bg-card border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <BrandLockup />
          <Skeleton className="h-3 w-24" />
        </div>
      </header>
      <main
        id="main-content"
        aria-busy="true"
        aria-label="Loading certification"
        className="mx-auto grid w-full max-w-3xl gap-8 px-6 py-10"
      >
        <section className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-40" />
        </section>

        <section className="grid gap-2">
          <Skeleton className="h-3 w-56" />
          <div className="flex h-4 gap-[3px]">
            {[30, 25, 25, 20].map((weight, index) => (
              <Skeleton
                key={index}
                className="h-full rounded-[2px] first:rounded-l-full last:rounded-r-full"
                style={{ flexBasis: `${weight}%` }}
              />
            ))}
          </div>
        </section>

        <section className="grid gap-3">
          <Skeleton className="h-2.5 w-36" />
          <ol className="bg-card divide-y rounded-xl border">
            {[0, 1, 2, 3].map((index) => (
              <li
                key={index}
                className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="grid gap-2">
                  <div className="flex items-baseline gap-3">
                    <Skeleton className="h-3 w-6" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="ml-auto h-2.5 w-20" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-2 flex-1" />
                    <Skeleton className="h-3 w-32 shrink-0" />
                  </div>
                </div>
                <Skeleton className="h-8 w-24" />
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
