// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { addCertifications } from "@/app/(app)/dashboard/actions";
import { setupSqliteDatabase } from "@/test/sqlite-fixture";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const getDb = setupSqliteDatabase();

function formData(slugs: string[]) {
  const data = new FormData();

  for (const slug of slugs) {
    data.append("certificationSlugs", slug);
  }

  return data;
}

describe("addCertifications", () => {
  it("inserts a brand-new certification", async () => {
    const { db, schema } = getDb();

    const result = await addCertifications(
      { status: "idle" },
      formData(["dva-c02"]),
    );

    expect(result).toEqual({ status: "success" });

    const certs = await db.select().from(schema.userCertifications);
    expect(certs).toHaveLength(1);
    expect(certs[0]).toMatchObject({
      certificationSlug: "dva-c02",
      isActive: true,
    });
  });

  it("reactivates a previously deactivated certification without recreating the row (attempt history survives remove/re-add)", async () => {
    const { db, schema } = getDb();

    const [existing] = await db
      .insert(schema.userCertifications)
      .values({
        certificationSlug: "dva-c02",
        addedAt: new Date("2026-01-01T00:00:00.000Z"),
        isActive: false,
      })
      .returning();

    const result = await addCertifications(
      { status: "idle" },
      formData(["dva-c02"]),
    );

    expect(result).toEqual({ status: "success" });

    const certs = await db.select().from(schema.userCertifications);
    // Exactly one row for this slug, same id as before the call: proves
    // this was an UPDATE, not an INSERT that happened to also toggle it.
    expect(certs).toHaveLength(1);
    expect(certs[0].id).toBe(existing.id);
    expect(certs[0].isActive).toBe(true);
    // Re-adding is not re-tracking: the upsert only flips is_active, so the
    // original tracking date is preserved.
    expect(certs[0].addedAt.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("leaves an already-active certification alone (no duplicate row)", async () => {
    const { db, schema } = getDb();

    await db.insert(schema.userCertifications).values({
      certificationSlug: "dva-c02",
      addedAt: new Date("2026-01-01T00:00:00.000Z"),
      isActive: true,
    });

    await addCertifications({ status: "idle" }, formData(["dva-c02"]));

    expect(await db.select().from(schema.userCertifications)).toHaveLength(1);
  });

  it("accepts the same certification submitted twice without violating the unique index", async () => {
    const { db, schema } = getDb();

    const result = await addCertifications(
      { status: "idle" },
      formData(["dva-c02", "dva-c02"]),
    );

    expect(result).toEqual({ status: "success" });
    expect(await db.select().from(schema.userCertifications)).toHaveLength(1);
  });

  it("rejects an unknown certification slug without writing anything", async () => {
    const { db, schema } = getDb();

    const result = await addCertifications(
      { status: "idle" },
      formData(["does-not-exist"]),
    );

    expect(result.status).toBe("error");
    expect(result.message).toMatch(/does-not-exist/);
    expect(await db.select().from(schema.userCertifications)).toHaveLength(0);
  });
});
