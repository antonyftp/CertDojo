import { BrandLockup } from "@/components/brand";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Audit FE-03. The skeleton mirrors the real dashboard cell for cell — same
// header, same max-w-5xl column, same two-column card grid — so nothing
// shifts when the data lands. The blueprint strip keeps its segments and
// drops its fills: an answer sheet that has not been scanned yet
// (DESIGN.md Lot 7 amendment).
function CertificationCardSkeleton() {
  return (
    <Card>
      <CardHeader className="gap-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-5 w-3/4" />
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>
        <div className="grid gap-1.5">
          <Skeleton className="h-2.5 w-28" />
          <div className="flex h-2.5 gap-[3px]">
            {[30, 25, 25, 20].map((weight, index) => (
              <Skeleton
                key={index}
                className="h-full rounded-[2px] first:rounded-l-full last:rounded-r-full"
                style={{ flexBasis: `${weight}%` }}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardLoading() {
  return (
    <div className="min-h-dvh">
      <header className="bg-card border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <BrandLockup />
          <div className="flex items-center gap-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-9 w-44" />
          </div>
        </div>
      </header>
      <main
        id="main-content"
        aria-busy="true"
        aria-label="Loading dashboard"
        className="mx-auto grid w-full max-w-5xl gap-8 px-6 py-10"
      >
        <section className="grid gap-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 h-3 w-48" />
        </section>
        <section className="grid gap-4 md:grid-cols-2">
          <CertificationCardSkeleton />
          <CertificationCardSkeleton />
        </section>
      </main>
    </div>
  );
}
