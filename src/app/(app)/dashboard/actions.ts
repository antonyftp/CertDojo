"use server";

import { revalidatePath } from "next/cache";
import { inArray } from "drizzle-orm";
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

  const existing = await db
    .select()
    .from(schema.userCertifications)
    .where(
      inArray(schema.userCertifications.certificationSlug, certificationSlugs),
    );
  const existingBySlug = new Map(
    existing.map((row) => [row.certificationSlug, row]),
  );

  const slugsToInsert = certificationSlugs.filter(
    (slug) => !existingBySlug.has(slug),
  );
  const idsToReactivate = existing
    .filter((row) => !row.isActive)
    .map((row) => row.id);

  if (slugsToInsert.length > 0) {
    await db.insert(schema.userCertifications).values(
      slugsToInsert.map((slug) => ({
        certificationSlug: slug,
      })),
    );
  }

  if (idsToReactivate.length > 0) {
    await db
      .update(schema.userCertifications)
      .set({ isActive: true })
      .where(inArray(schema.userCertifications.id, idsToReactivate));
  }

  revalidatePath("/dashboard");

  return { status: "success" };
}
