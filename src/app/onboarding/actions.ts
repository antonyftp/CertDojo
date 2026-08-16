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

    // Write order is a correctness constraint, not a style choice. These two
    // statements cannot be made atomic (the production neon-http driver has
    // no transaction support — see the note in src/db/client.ts), so the
    // certifications go FIRST: `onboardingDone: true` is the flag the
    // /onboarding guard redirects on, and persisting it before the
    // certifications would, on a failure in between, strand the user on an
    // empty dashboard with no way back into onboarding.
    // The upsert makes a retry after a partial failure a no-op rather than a
    // unique-constraint violation.
    const addedAt = new Date();
    // Deduplicated because the same slug submitted twice would hit the unique
    // index twice in one statement — which Postgres rejects outright ("ON
    // CONFLICT DO UPDATE command cannot affect row a second time").
    const uniqueSlugs = [...new Set(certificationSlugs)];

    await db
      .insert(schema.userCertifications)
      .values(
        uniqueSlugs.map((slug) => ({
          certificationSlug: slug,
          // Set explicitly: Postgres' defaultNow() is evaluated once per
          // statement while SQLite's $defaultFn is evaluated once per row, so
          // a multi-row insert would otherwise drift between the two modes.
          addedAt,
        })),
      )
      .onConflictDoUpdate({
        target: schema.userCertifications.certificationSlug,
        set: { isActive: true },
      });

    await db
      .insert(schema.userProfile)
      .values({ id: USER_PROFILE_ID, name, jobTitle, onboardingDone: true })
      .onConflictDoUpdate({
        target: schema.userProfile.id,
        set: { name, jobTitle, onboardingDone: true },
      });
  }

  redirect("/dashboard");
}
