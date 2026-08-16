// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { completeOnboarding } from "@/app/onboarding/actions";
import { USER_PROFILE_ID } from "@/db/queries";
import { setupSqliteDatabase } from "@/test/sqlite-fixture";

// completeOnboarding always redirects on success; outside a real request
// there is no App Router to catch the NEXT_REDIRECT signal, so it is
// mocked to a no-op and asserted on directly.
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const getDb = setupSqliteDatabase();

function formData(fields: Record<string, string | string[]>) {
  const data = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    for (const v of Array.isArray(value) ? value : [value]) {
      data.append(key, v);
    }
  }

  return data;
}

describe("completeOnboarding", () => {
  it("creates the profile and tracked certifications when none exists yet", async () => {
    const { db, schema } = getDb();
    const { redirect } = await import("next/navigation");

    const result = await completeOnboarding(
      { fieldErrors: {} },
      formData({
        name: "Ada Lovelace",
        jobTitle: "Cloud Engineer",
        certificationSlugs: ["dva-c02"],
      }),
    );

    // redirect() normally never returns (throws NEXT_REDIRECT); mocked as a
    // no-op here, so the function falls off the end and returns undefined.
    expect(result).toBeUndefined();
    expect(redirect).toHaveBeenCalledWith("/dashboard");

    const [profile] = await db.select().from(schema.userProfile);
    expect(profile).toMatchObject({
      id: USER_PROFILE_ID,
      name: "Ada Lovelace",
      jobTitle: "Cloud Engineer",
      onboardingDone: true,
    });

    const certs = await db.select().from(schema.userCertifications);
    expect(certs.map((c) => c.certificationSlug)).toEqual(["dva-c02"]);
  });

  it("never overwrites a profile that already completed onboarding", async () => {
    const { db, schema } = getDb();

    await db.insert(schema.userProfile).values({
      id: USER_PROFILE_ID,
      name: "Original Name",
      jobTitle: "Original Title",
      onboardingDone: true,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    await completeOnboarding(
      { fieldErrors: {} },
      formData({
        name: "Someone Else",
        jobTitle: "Different Title",
        certificationSlugs: ["dva-c02"],
      }),
    );

    const [profile] = await db.select().from(schema.userProfile);
    expect(profile.name).toBe("Original Name");
    expect(profile.jobTitle).toBe("Original Title");

    // The guard must also stop the certification insert that would
    // otherwise ride along with the (rejected) profile overwrite.
    const certs = await db.select().from(schema.userCertifications);
    expect(certs).toHaveLength(0);
  });

  it("completes an existing but not-yet-finished profile row (e.g. a partial import)", async () => {
    const { db, schema } = getDb();

    await db.insert(schema.userProfile).values({
      id: USER_PROFILE_ID,
      name: "Placeholder",
      jobTitle: "Placeholder",
      onboardingDone: false,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    await completeOnboarding(
      { fieldErrors: {} },
      formData({
        name: "Ada Lovelace",
        jobTitle: "Cloud Engineer",
        certificationSlugs: ["dva-c02"],
      }),
    );

    const [profile] = await db.select().from(schema.userProfile);
    expect(profile).toMatchObject({
      name: "Ada Lovelace",
      jobTitle: "Cloud Engineer",
      onboardingDone: true,
    });
  });

  it("persists the certifications before the profile, so a failure in between leaves onboarding reachable", async () => {
    const { db, schema } = getDb();

    // The two writes cannot be a transaction (neon-http has no transaction
    // support), so the ordering IS the safety mechanism: `onboardingDone`
    // gates access to /onboarding, and persisting it first would strand the
    // user on an empty dashboard with no way back.
    const insert = db.insert.bind(db);
    vi.spyOn(db, "insert").mockImplementation(((table: unknown) => {
      if (table === schema.userProfile) {
        throw new Error("profile write failed");
      }

      return insert(table as Parameters<typeof insert>[0]);
    }) as typeof db.insert);

    await expect(
      completeOnboarding(
        { fieldErrors: {} },
        formData({
          name: "Ada Lovelace",
          jobTitle: "Cloud Engineer",
          certificationSlugs: ["dva-c02"],
        }),
      ),
    ).rejects.toThrow("profile write failed");

    // No profile row at all: onboardingDone was never persisted, so the
    // /onboarding guard still lets the user back in to retry.
    expect(await db.select().from(schema.userProfile)).toHaveLength(0);
    // The certifications that did land are kept — the retry upserts over them.
    const certs = await db.select().from(schema.userCertifications);
    expect(certs.map((c) => c.certificationSlug)).toEqual(["dva-c02"]);

    vi.mocked(db.insert).mockRestore();

    await completeOnboarding(
      { fieldErrors: {} },
      formData({
        name: "Ada Lovelace",
        jobTitle: "Cloud Engineer",
        certificationSlugs: ["dva-c02"],
      }),
    );

    // The retry completes without tripping the unique index on the
    // certification it already wrote.
    const [profile] = await db.select().from(schema.userProfile);
    expect(profile.onboardingDone).toBe(true);
    expect(await db.select().from(schema.userCertifications)).toHaveLength(1);
  });

  it("accepts the same certification submitted twice without violating the unique index", async () => {
    const { db, schema } = getDb();

    const result = await completeOnboarding(
      { fieldErrors: {} },
      formData({
        name: "Ada Lovelace",
        jobTitle: "Cloud Engineer",
        certificationSlugs: ["dva-c02", "dva-c02"],
      }),
    );

    expect(result).toBeUndefined();

    const certs = await db.select().from(schema.userCertifications);
    expect(certs.map((c) => c.certificationSlug)).toEqual(["dva-c02"]);
  });

  it("rejects an unknown certification slug without touching the database", async () => {
    const { db, schema } = getDb();

    const result = await completeOnboarding(
      { fieldErrors: {} },
      formData({
        name: "Ada Lovelace",
        jobTitle: "Cloud Engineer",
        certificationSlugs: ["does-not-exist"],
      }),
    );

    expect(result.formError).toMatch(/does-not-exist/);
    expect(await db.select().from(schema.userProfile)).toHaveLength(0);
  });
});
