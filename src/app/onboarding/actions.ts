"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import { getUserProfile, USER_PROFILE_ID } from "@/db/queries";
import { getCertificationBySlug } from "@/lib/content/loader";
import {
  onboardingFormSchema,
  type OnboardingFormState,
} from "@/app/onboarding/form-schema";

export async function completeOnboarding(
  _previousState: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const parsed = onboardingFormSchema.safeParse({
    name: formData.get("name"),
    jobTitle: formData.get("jobTitle"),
    certificationSlugs: formData.getAll("certificationSlugs"),
  });

  if (!parsed.success) {
    const flattened = z.flattenError(parsed.error);

    return {
      fieldErrors: {
        name: flattened.fieldErrors.name?.[0],
        jobTitle: flattened.fieldErrors.jobTitle?.[0],
        certificationSlugs: flattened.fieldErrors.certificationSlugs?.[0],
      },
    };
  }

  const { name, jobTitle, certificationSlugs } = parsed.data;

  const unknownSlugs = certificationSlugs.filter(
    (slug) => !getCertificationBySlug(slug),
  );

  if (unknownSlugs.length > 0) {
    return {
      fieldErrors: {},
      formError: `Unknown certification(s): ${unknownSlugs.join(", ")}. Reload the page and try again.`,
    };
  }

  // One-time onboarding (SPECIFICATIONS.md §2): if a completed profile
  // already exists (e.g. double submit or a second tab), never overwrite it.
  const existingProfile = await getUserProfile();

  if (!existingProfile?.onboardingDone) {
    const { db, schema } = getDatabase();

    await db
      .insert(schema.userProfile)
      .values({ id: USER_PROFILE_ID, name, jobTitle, onboardingDone: true })
      .onConflictDoUpdate({
        target: schema.userProfile.id,
        set: { name, jobTitle, onboardingDone: true },
      });

    await db.insert(schema.userCertifications).values(
      certificationSlugs.map((slug) => ({
        certificationSlug: slug,
      })),
    );
  }

  redirect("/dashboard");
}
