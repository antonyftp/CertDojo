import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  OnboardingForm,
  type ProviderGroup,
} from "@/app/onboarding/onboarding-form";
import { BrandLockup } from "@/components/brand";
import { getUserProfile } from "@/db/queries";
import { getAllCertifications } from "@/lib/content/loader";

// Audit A11Y-07: see the dashboard page (WCAG 2.4.2).
export const metadata: Metadata = { title: "Set up — CertDojo" };

// Onboarding state lives in the database and must be read per request,
// never at build time.
export const dynamic = "force-dynamic";

function getProviderGroups(): ProviderGroup[] {
  const groups = new Map<string, ProviderGroup>();

  // Already sorted by provider then name by the loader.
  for (const meta of getAllCertifications()) {
    let group = groups.get(meta.provider);

    if (!group) {
      group = { provider: meta.provider, certifications: [] };
      groups.set(meta.provider, group);
    }

    group.certifications.push({
      slug: meta.slug,
      name: meta.name,
      examCode: meta.examCode,
    });
  }

  return [...groups.values()];
}

export default async function OnboardingPage() {
  const profile = await getUserProfile();

  // One-time onboarding: once completed, this page is no longer reachable.
  if (profile?.onboardingDone) {
    redirect("/dashboard");
  }

  return (
    <main
      id="main-content"
      className="mx-auto grid w-full max-w-xl gap-8 px-6 py-16"
    >
      <header className="grid gap-2">
        <BrandLockup className="mb-2" />
        {/* Audit DS-10: this was the only h1 in the app at text-3xl; the
            other four screens are all text-2xl, and DESIGN.md gives no reason
            for onboarding to differ. */}
        <h1 className="text-2xl font-semibold tracking-tight">
          Set up your practice space
        </h1>
        <p className="text-muted-foreground text-base leading-7">
          Tell CertDojo who you are and which certifications you are preparing
          for. Everything stays on this instance.
        </p>
      </header>
      <OnboardingForm providerGroups={getProviderGroups()} />
      <p className="text-muted-foreground text-sm">
        Moving from another machine?{" "}
        <Link href="/settings" className="text-primary hover:underline">
          Import your exported data
        </Link>{" "}
        instead.
      </p>
    </main>
  );
}
