"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import { getCertificationBySlug } from "@/lib/content/loader";

export type AddCertificationsState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const addCertificationsSchema = z.object({
  certificationSlugs: z
    .array(z.string().min(1))
    .min(1, "Select at least one certification."),
});

// Adds tracked certifications from the dashboard without re-running
// onboarding (SPECIFICATIONS.md §5.2/§5.6). Re-activates a previously
// deactivated row instead of inserting a duplicate, so attempt history
// survives remove/re-add cycles.
export async function addCertifications(
  _previousState: AddCertificationsState,
  formData: FormData,
): Promise<AddCertificationsState> {
  const parsed = addCertificationsSchema.safeParse({
    certificationSlugs: formData.getAll("certificationSlugs"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: z.flattenError(parsed.error).fieldErrors.certificationSlugs?.[0],
    };
  }

  const { certificationSlugs } = parsed.data;
  const unknownSlugs = certificationSlugs.filter(
    (slug) => !getCertificationBySlug(slug),
  );

  if (unknownSlugs.length > 0) {
    return {
      status: "error",
      message: `Unknown certification(s): ${unknownSlugs.join(", ")}. Reload the page and try again.`,
    };
  }

  const { db, schema } = getDatabase();

  // Slugs deduplicated and addedAt set explicitly: both are dual-dialect
  // requirements, see the note in src/db/client.ts.
  const uniqueSlugs = [...new Set(certificationSlugs)];
  const addedAt = new Date();

  // One upsert on the unique certification_slug does both jobs: insert the
  // new slugs, flip is_active back on for the ones that were removed. It
  // touches neither the existing row's id nor its addedAt, so attempt history
  // and original tracking date survive a remove/re-add cycle.
  await db
    .insert(schema.userCertifications)
    .values(
      uniqueSlugs.map((slug) => ({
        certificationSlug: slug,
        addedAt,
      })),
    )
    .onConflictDoUpdate({
      target: schema.userCertifications.certificationSlug,
      set: { isActive: true },
    });

  revalidatePath("/dashboard");

  return { status: "success" };
}
