// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  getActiveTrackedCertifications,
  getAttemptsByCertification,
  getAttemptsForCertification,
  getUserProfile,
  USER_PROFILE_ID,
} from "@/db/queries";
import { setupSqliteDatabase } from "@/test/sqlite-fixture";

const getDb = setupSqliteDatabase();

describe("getUserProfile", () => {
  it("returns null when no profile row exists", async () => {
    expect(await getUserProfile()).toBeNull();
  });

  it("returns the singleton profile row", async () => {
    const { db, schema } = getDb();

    await db.insert(schema.userProfile).values({
      id: USER_PROFILE_ID,
      name: "Ada Lovelace",
      jobTitle: "Cloud Engineer",
      onboardingDone: true,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const profile = await getUserProfile();

    expect(profile).toMatchObject({
      id: USER_PROFILE_ID,
      name: "Ada Lovelace",
      jobTitle: "Cloud Engineer",
      onboardingDone: true,
    });
  });
});

describe("getActiveTrackedCertifications", () => {
  it("excludes deactivated certifications and orders by addedAt then id", async () => {
    const { db, schema } = getDb();

    // Inserted out of chronological order on purpose, to prove the query
    // sorts rather than returning insertion order.
    await db.insert(schema.userCertifications).values([
      {
        certificationSlug: "second",
        addedAt: new Date("2026-01-02T00:00:00.000Z"),
        isActive: true,
      },
      {
        certificationSlug: "deactivated",
        addedAt: new Date("2026-01-01T00:00:00.000Z"),
        isActive: false,
      },
      {
        certificationSlug: "first",
        addedAt: new Date("2026-01-01T00:00:00.000Z"),
        isActive: true,
      },
    ]);

    const rows = await getActiveTrackedCertifications();

    expect(rows.map((r) => r.certificationSlug)).toEqual(["first", "second"]);
  });

  it("breaks addedAt ties by id", async () => {
    const { db, schema } = getDb();
    const sameInstant = new Date("2026-01-01T00:00:00.000Z");

    const inserted = await db
      .insert(schema.userCertifications)
      .values([
        { certificationSlug: "b", addedAt: sameInstant, isActive: true },
        { certificationSlug: "a", addedAt: sameInstant, isActive: true },
      ])
      .returning();

    const rows = await getActiveTrackedCertifications();

    // Same addedAt for both -> id order decides, and ids were assigned in
    // insertion order ("b" first), not slug alphabetical order.
    expect(rows.map((r) => r.id)).toEqual(
      inserted.map((r) => r.id).sort((a, b) => a - b),
    );
  });

  it("returns an empty array when there are no active certifications", async () => {
    expect(await getActiveTrackedCertifications()).toEqual([]);
  });
});

describe("getAttemptsForCertification", () => {
  it("returns only attempts for the requested certification", async () => {
    const { db, schema } = getDb();

    await db.insert(schema.questionAttempts).values([
      {
        certificationSlug: "dva-c02",
        questionId: "q1",
        isCorrect: true,
        attemptsCount: 1,
        lastAttemptedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        certificationSlug: "clf-c02",
        questionId: "q1",
        isCorrect: false,
        attemptsCount: 1,
        lastAttemptedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);

    const rows = await getAttemptsForCertification("dva-c02");

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      certificationSlug: "dva-c02",
      questionId: "q1",
    });
  });

  it("returns an empty array for a certification with no attempts", async () => {
    expect(await getAttemptsForCertification("dva-c02")).toEqual([]);
  });
});

describe("getAttemptsByCertification", () => {
  it("returns an empty map when there are no attempts at all", async () => {
    const bySlug = await getAttemptsByCertification();

    expect(bySlug.size).toBe(0);
  });

  it("groups attempts by certification slug across multiple certifications", async () => {
    const { db, schema } = getDb();

    await db.insert(schema.questionAttempts).values([
      {
        certificationSlug: "dva-c02",
        questionId: "q1",
        isCorrect: true,
        attemptsCount: 1,
        lastAttemptedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        certificationSlug: "dva-c02",
        questionId: "q2",
        isCorrect: false,
        attemptsCount: 1,
        lastAttemptedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        certificationSlug: "clf-c02",
        questionId: "q1",
        isCorrect: true,
        attemptsCount: 1,
        lastAttemptedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);

    const bySlug = await getAttemptsByCertification();

    expect(bySlug.size).toBe(2);
    expect(
      bySlug
        .get("dva-c02")
        ?.map((r) => r.questionId)
        .sort(),
    ).toEqual(["q1", "q2"]);
    expect(bySlug.get("clf-c02")?.map((r) => r.questionId)).toEqual(["q1"]);
    // A certification with zero attempts must not appear as an (incorrect)
    // empty-array entry: the map only has keys for slugs that actually have
    // attempt rows.
    expect(bySlug.has("no-attempts-cert")).toBe(false);
  });
});
