import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getUserProfile } from "@/db/queries";

// Every route except /onboarding lives in this group: on each request the
// profile is read from the database and, until onboarding is completed, the
// app always redirects to /onboarding (SPECIFICATIONS.md §5.1). The check
// cannot live in the root layout, which also wraps /onboarding itself.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await getUserProfile();

  if (!profile?.onboardingDone) {
    redirect("/onboarding");
  }

  return children;
}
