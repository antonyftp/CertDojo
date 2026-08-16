"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import { USER_PROFILE_ID } from "@/db/queries";
import { restoreBackup } from "@/lib/backup/restore";
import { backupFileSchema } from "@/lib/backup/schema";
import { isThemePreference, THEME_COOKIE } from "@/lib/theme";

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please enter your name.")
    .max(120, "Name must be 120 characters or fewer."),
  jobTitle: z
    .string()
    .trim()
    .min(1, "Please enter your job title.")
    .max(120, "Job title must be 120 characters or fewer."),
});

export type ProfileState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string }
  | { status: "error"; fieldErrors: { name?: string; jobTitle?: string } };

export async function updateProfile(
  _previousState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    jobTitle: formData.get("jobTitle"),
  });

  if (!parsed.success) {
    const flattened = z.flattenError(parsed.error);
    return {
      status: "error",
      fieldErrors: {
        name: flattened.fieldErrors.name?.[0],
        jobTitle: flattened.fieldErrors.jobTitle?.[0],
      },
    };
  }

  const { db, schema } = getDatabase();

  const updated = await db
    .update(schema.userProfile)
    .set({ name: parsed.data.name, jobTitle: parsed.data.jobTitle })
    .where(eq(schema.userProfile.id, USER_PROFILE_ID))
    .returning({ id: schema.userProfile.id });

  if (updated.length === 0) {
    return {
      status: "error",
      message: "Profile not found. Complete onboarding first.",
    };
  }

  // Audit FE-06: only these two screens show the name and job title.
  // The previous revalidatePath("/", "layout") also dropped every
  // /certifications/* entry, which a profile edit cannot affect.
  revalidatePath("/settings");
  revalidatePath("/dashboard");

  return { status: "success" };
}

export type ImportState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "success";
      certifications: number;
      attempts: number;
    };

// A backup is a handful of small tables; anything bigger than this is not a
// CertDojo export. Must stay below `serverActions.bodySizeLimit` in
// next.config.ts (4MB), otherwise Next rejects the request with a generic
// framework error before this friendlier check ever runs.
const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

// Import half of SPECIFICATIONS.md §5.5: the whole file is validated before
// the first write, so a malformed file never touches the database.
export async function importUserData(
  _previousState: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a backup file to import." };
  }

  if (file.size > MAX_IMPORT_BYTES) {
    return {
      status: "error",
      message: "This file is too large to be a CertDojo backup.",
    };
  }

  let json: unknown;

  try {
    json = JSON.parse(await file.text());
  } catch {
    return {
      status: "error",
      message: "This file is not valid JSON. Nothing was imported.",
    };
  }

  const parsed = backupFileSchema.safeParse(json);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue.path.length > 0 ? ` (at ${issue.path.join(".")})` : "";

    return {
      status: "error",
      message: `This file is not a valid CertDojo backup: ${issue.message}${where}. Nothing was imported.`,
    };
  }

  // An uncaught throw here would escape the Server Action as a generic Next
  // error — and skip the revalidate below, leaving the UI showing stale data
  // over a database that may have partially changed. Every write in
  // restoreBackup is an idempotent upsert, so retrying the same file is safe
  // and is the right advice to give.
  try {
    await restoreBackup(parsed.data);
  } catch (error) {
    console.error("Backup import failed", error);

    return {
      status: "error",
      message:
        "The import failed while writing to the database. Your data may be partially updated — importing the same file again is safe and will finish the job.",
    };
  }

  // Every screen derives from the data that just changed (including the
  // onboarding gate in the (app) layout).
  revalidatePath("/", "layout");

  return {
    status: "success",
    certifications: parsed.data.userCertifications.length,
    attempts: parsed.data.questionAttempts.length,
  };
}

// Theme preference (audit DS-01). A Server Action writing a cookie, so the
// control works with JavaScript disabled like every other write in the app.
// No validation errors to report: the value comes from a fixed radio group
// and anything else is simply rejected.
export async function setTheme(formData: FormData): Promise<void> {
  const value = formData.get("theme");

  if (!isThemePreference(value)) {
    return;
  }

  (await cookies()).set(THEME_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // A year: this is a preference, not a session.
    maxAge: 60 * 60 * 24 * 365,
  });

  // The attribute is written by the root layout, so every route's HTML
  // changes — this is the one case where invalidating the whole tree is
  // exactly right.
  revalidatePath("/", "layout");
}
