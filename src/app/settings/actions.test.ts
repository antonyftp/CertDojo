// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { importUserData, updateProfile } from "@/app/settings/actions";
import { USER_PROFILE_ID } from "@/db/queries";
import { setupSqliteDatabase } from "@/test/sqlite-fixture";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const getDb = setupSqliteDatabase();

function formData(fields: Record<string, string>) {
  const data = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    data.append(key, value);
  }

  return data;
}

describe("updateProfile", () => {
  it("errors when no profile exists yet, without creating one", async () => {
    const { db, schema } = getDb();

    const result = await updateProfile(
      { status: "idle" },
      formData({ name: "Ada Lovelace", jobTitle: "Cloud Engineer" }),
    );

    expect(result).toEqual({
      status: "error",
      message: "Profile not found. Complete onboarding first.",
    });
    expect(await db.select().from(schema.userProfile)).toHaveLength(0);
  });

  it("updates an existing profile", async () => {
    const { db, schema } = getDb();

    await db.insert(schema.userProfile).values({
      id: USER_PROFILE_ID,
      name: "Old Name",
      jobTitle: "Old Title",
      onboardingDone: true,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const result = await updateProfile(
      { status: "idle" },
      formData({ name: "New Name", jobTitle: "New Title" }),
    );

    expect(result).toEqual({ status: "success" });

    const [profile] = await db.select().from(schema.userProfile);
    expect(profile).toMatchObject({ name: "New Name", jobTitle: "New Title" });
  });
});

describe("importUserData", () => {
  function fileFormData(file: File | null) {
    const data = new FormData();

    if (file) {
      data.append("file", file);
    }

    return data;
  }

  it("errors when no file was chosen", async () => {
    const result = await importUserData({ status: "idle" }, fileFormData(null));

    expect(result).toEqual({
      status: "error",
      message: "Choose a backup file to import.",
    });
  });

  it("errors on an empty file", async () => {
    const emptyFile = new File([], "backup.json", {
      type: "application/json",
    });

    const result = await importUserData(
      { status: "idle" },
      fileFormData(emptyFile),
    );

    expect(result).toEqual({
      status: "error",
      message: "Choose a backup file to import.",
    });
  });

  it("errors on invalid JSON, without writing anything", async () => {
    const { db, schema } = getDb();
    const badFile = new File(["not valid json{"], "backup.json", {
      type: "application/json",
    });

    const result = await importUserData(
      { status: "idle" },
      fileFormData(badFile),
    );

    expect(result).toEqual({
      status: "error",
      message: "This file is not valid JSON. Nothing was imported.",
    });
    expect(await db.select().from(schema.userProfile)).toHaveLength(0);
  });

  it("errors on JSON that does not match the backup schema, without writing anything", async () => {
    const { db, schema } = getDb();
    const wrongShapeFile = new File(
      [JSON.stringify({ hello: "world" })],
      "backup.json",
      { type: "application/json" },
    );

    const result = await importUserData(
      { status: "idle" },
      fileFormData(wrongShapeFile),
    );

    expect(result.status).toBe("error");
    expect((result as { message: string }).message).toMatch(
      /not a valid CertDojo backup/,
    );
    expect(await db.select().from(schema.userProfile)).toHaveLength(0);
  });

  it("imports a valid backup and reports the counts", async () => {
    const { db, schema } = getDb();
    const validFile = new File(
      [
        JSON.stringify({
          app: "certdojo",
          formatVersion: 1,
          exportedAt: "2026-08-01T00:00:00.000Z",
          userProfile: {
            name: "Ada Lovelace",
            jobTitle: "Cloud Engineer",
            onboardingDone: true,
            createdAt: "2026-07-01T00:00:00.000Z",
          },
          userCertifications: [
            {
              certificationSlug: "dva-c02",
              addedAt: "2026-07-05T00:00:00.000Z",
              isActive: true,
            },
          ],
          questionAttempts: [],
        }),
      ],
      "backup.json",
      { type: "application/json" },
    );

    const result = await importUserData(
      { status: "idle" },
      fileFormData(validFile),
    );

    expect(result).toEqual({
      status: "success",
      certifications: 1,
      attempts: 0,
    });
    expect(await db.select().from(schema.userProfile)).toHaveLength(1);
  });
});
