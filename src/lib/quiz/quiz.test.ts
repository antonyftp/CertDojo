import { describe, expect, it } from "vitest";

import { gradeAnswer, pickSessionQuestions } from "@/lib/quiz/quiz";

describe("gradeAnswer", () => {
  it("accepts the exact single correct option", () => {
    expect(gradeAnswer(["a"], ["a"])).toBe(true);
    expect(gradeAnswer(["a"], ["b"])).toBe(false);
  });

  it("requires exact set equality for multiple answers, in any order", () => {
    expect(gradeAnswer(["a", "c"], ["c", "a"])).toBe(true);
    expect(gradeAnswer(["a", "c"], ["a"])).toBe(false);
    expect(gradeAnswer(["a", "c"], ["a", "b"])).toBe(false);
    expect(gradeAnswer(["a", "c"], ["a", "b", "c"])).toBe(false);
  });

  it("gives no credit for an empty selection", () => {
    expect(gradeAnswer(["a"], [])).toBe(false);
  });
});

const bank = [
  { id: "q1" },
  { id: "q2" },
  { id: "q3" },
  { id: "q4" },
  { id: "q5" },
];

describe("pickSessionQuestions", () => {
  it("returns the full bank in order for 'all'", () => {
    const picked = pickSessionQuestions(bank, new Set(), { kind: "all" });

    expect(picked.map((q) => q.id)).toEqual(["q1", "q2", "q3", "q4", "q5"]);
  });

  it("keeps only not-yet-mastered questions, preserving bank order", () => {
    const picked = pickSessionQuestions(bank, new Set(["q4", "q2"]), {
      kind: "unmastered",
    });

    expect(picked.map((q) => q.id)).toEqual(["q2", "q4"]);
  });

  it("returns an empty session when everything is mastered", () => {
    const picked = pickSessionQuestions(bank, new Set(), {
      kind: "unmastered",
    });

    expect(picked).toEqual([]);
  });

  it("picks exactly `count` distinct questions from the bank at random", () => {
    const picked = pickSessionQuestions(bank, new Set(), {
      kind: "random",
      count: 3,
    });

    expect(picked).toHaveLength(3);
    expect(new Set(picked.map((q) => q.id)).size).toBe(3);

    for (const question of picked) {
      expect(bank).toContainEqual(question);
    }
  });

  it("caps a random batch at the bank size", () => {
    const picked = pickSessionQuestions(bank, new Set(), {
      kind: "random",
      count: 20,
    });

    expect(picked).toHaveLength(bank.length);
  });
});
