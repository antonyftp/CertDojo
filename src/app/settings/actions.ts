"use server";

import { revalidatePath } from "next/cache";

import { restoreBackup } from "@/lib/backup/restore";
import { backupFileSchema } from "@/lib/backup/schema";

export type ImportState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "success";
      certifications: number;
      attempts: number;
    };

// A backup is a handful of small tables; anything bigger than this is not a
// CertDojo export.
const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

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

  await restoreBackup(parsed.data);

  // Every screen derives from the data that just changed (including the
  // onboarding gate in the (app) layout).
  revalidatePath("/", "layout");

  return {
    status: "success",
    certifications: parsed.data.userCertifications.length,
    attempts: parsed.data.questionAttempts.length,
  };
}
