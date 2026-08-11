import { redirect } from "next/navigation";

import {
  OnboardingForm,
  type ProviderGroup,
} from "@/app/onboarding/onboarding-form";
import { getUserProfile } from "@/db/queries";
import { getAllCertifications } from "@/lib/content/loader";

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
    <main className="mx-auto grid w-full max-w-xl gap-8 px-6 py-16">
      <header className="grid gap-2">
        <p className="text-muted-foreground text-sm font-medium tracking-[0.3em] uppercase">
          CertPrep
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Set up your practice space
        </h1>
        <p className="text-muted-foreground text-base leading-7">
          Tell CertPrep who you are and which certifications you are preparing
          for. Everything stays on this instance.
        </p>
      </header>
      <OnboardingForm providerGroups={getProviderGroups()} />
    </main>
  );
}
