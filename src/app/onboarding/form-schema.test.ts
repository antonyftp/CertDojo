import { describe, expect, it } from "vitest";

import { onboardingFormSchema } from "@/app/onboarding/form-schema";

describe("onboardingFormSchema", () => {
  const valid = {
    name: "Ada Lovelace",
    jobTitle: "Cloud Engineer",
    certificationSlugs: ["clf-c02"],
  };

  it("accepts a complete submission and trims text fields", () => {
    const parsed = onboardingFormSchema.parse({
      ...valid,
      name: "  Ada Lovelace  ",
    });

    expect(parsed.name).toBe("Ada Lovelace");
    expect(parsed.certificationSlugs).toEqual(["clf-c02"]);
  });

  it("rejects a missing or blank name", () => {
    expect(onboardingFormSchema.safeParse({ ...valid, name: "" }).success).toBe(
      false,
    );
    expect(
      onboardingFormSchema.safeParse({ ...valid, name: "   " }).success,
    ).toBe(false);
    expect(
      onboardingFormSchema.safeParse({ ...valid, name: null }).success,
    ).toBe(false);
  });

  it("rejects a missing or blank job title", () => {
    expect(
      onboardingFormSchema.safeParse({ ...valid, jobTitle: "  " }).success,
    ).toBe(false);
  });

  it("rejects an empty certification selection", () => {
    const parsed = onboardingFormSchema.safeParse({
      ...valid,
      certificationSlugs: [],
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects non-string selections (e.g. file uploads)", () => {
    const parsed = onboardingFormSchema.safeParse({
      ...valid,
      certificationSlugs: [new File([], "x.txt")],
    });

    expect(parsed.success).toBe(false);
  });
});
