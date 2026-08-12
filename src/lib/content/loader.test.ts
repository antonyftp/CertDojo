import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

// The loader resolves /content from process.cwd() and caches everything in
// module state, so each test points cwd at a fixture tree and re-imports a
// fresh module instance.
const FIXTURES = path.join(import.meta.dirname, "__fixtures__");

async function loadFromFixture(scenario: string) {
  vi.spyOn(process, "cwd").mockReturnValue(path.join(FIXTURES, scenario));
  vi.resetModules();

  return import("@/lib/content/loader");
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getAllCertifications", () => {
  it("returns every certification sorted by provider then name", async () => {
    const loader = await loadFromFixture("valid");

    const all = loader.getAllCertifications();

    expect(all.map((meta) => `${meta.provider}/${meta.slug}`)).toEqual([
      "acme/widget-basics",
      "acme/zz-advanced",
      "beta-corp/api-basics",
    ]);
    expect(all[0]).toMatchObject({
      name: "Widget Basics",
      examCode: "WB-100",
      domains: [
        { id: "assembly", name: "Widget Assembly", weight: 60 },
        { id: "safety", name: "Widget Safety", weight: 40 },
      ],
    });
  });

  it("rejects the same slug appearing under two providers", async () => {
    const loader = await loadFromFixture("duplicate-slug");

    expect(() => loader.getAllCertifications()).toThrow(
      /Duplicate certification slug "widget-basics"/,
    );
  });

  it("rejects a meta.json whose slug does not match its directory", async () => {
    const loader = await loadFromFixture("mismatched-directory");

    expect(() => loader.getAllCertifications()).toThrow(
      /"acme\/some-other-slug".*"acme\/widget-basics"/,
    );
  });
});

describe("getCertificationBySlug", () => {
  it("returns the matching certification, undefined otherwise", async () => {
    const loader = await loadFromFixture("valid");

    expect(loader.getCertificationBySlug("api-basics")?.name).toBe(
      "API Basics",
    );
    expect(loader.getCertificationBySlug("nope")).toBeUndefined();
  });
});

describe("getQuestions", () => {
  it("returns the validated question bank for a slug", async () => {
    const loader = await loadFromFixture("valid");

    const questions = loader.getQuestions("widget-basics");

    expect(questions.map((question) => question.id)).toEqual([
      "wb-0001",
      "wb-0002",
    ]);
    expect(questions[1]).toMatchObject({
      multipleAnswers: true,
      correctOptionIds: ["a", "c"],
    });
  });

  it("serves cached questions on subsequent calls", async () => {
    const loader = await loadFromFixture("valid");

    const first = loader.getQuestions("widget-basics");

    expect(loader.getQuestions("widget-basics")).toBe(first);
  });

  it("throws for an unknown certification slug", async () => {
    const loader = await loadFromFixture("valid");

    expect(() => loader.getQuestions("nope")).toThrow(
      /Unknown certification slug "nope"/,
    );
  });

  it("rejects a question referencing a domain missing from meta.json", async () => {
    const loader = await loadFromFixture("unknown-domain");

    expect(() => loader.getQuestions("widget-basics")).toThrow(
      /domainId "not-in-the-blueprint" is not declared/,
    );
  });
});
