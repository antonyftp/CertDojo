import { z } from "zod";

// Zod schemas for the certification content stored under /content
// (SPECIFICATIONS.md §4.3). Strict objects so community PRs fail loudly on
// typos or unknown fields instead of silently dropping them.

export const domainSchema = z.strictObject({
  id: z
    .string()
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "must be a kebab-case identifier (lowercase letters, digits, hyphens)",
    ),
  name: z.string().min(1),
  weight: z.number().int().min(1).max(100),
});

export const certificationMetaSchema = z
  .strictObject({
    slug: z
      .string()
      .regex(
        /^[a-z0-9]+(-[a-z0-9]+)*$/,
        "must be a kebab-case identifier (lowercase letters, digits, hyphens)",
      ),
    provider: z
      .string()
      .regex(
        /^[a-z0-9]+(-[a-z0-9]+)*$/,
        "must be a kebab-case identifier (lowercase letters, digits, hyphens)",
      ),
    name: z.string().min(1),
    examCode: z.string().min(1),
    description: z.string().min(1),
    officialUrl: z.url(),
    domains: z.array(domainSchema).min(1),
  })
  .superRefine((meta, ctx) => {
    const seen = new Set<string>();

    meta.domains.forEach((domain, index) => {
      if (seen.has(domain.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["domains", index, "id"],
          message: `duplicate domain id "${domain.id}"`,
        });
      }
      seen.add(domain.id);
    });
  });

export const questionOptionSchema = z.strictObject({
  id: z.string().min(1),
  text: z.string().min(1),
});

export const questionSchema = z
  .strictObject({
    id: z.string().min(1),
    domainId: z.string().min(1),
    question: z.string().min(1),
    multipleAnswers: z.boolean(),
    options: z.array(questionOptionSchema).min(2),
    correctOptionIds: z.array(z.string().min(1)).min(1),
    explanation: z.string().min(1),
  })
  .superRefine((question, ctx) => {
    const optionIds = new Set<string>();

    question.options.forEach((option, index) => {
      if (optionIds.has(option.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["options", index, "id"],
          message: `duplicate option id "${option.id}"`,
        });
      }
      optionIds.add(option.id);
    });

    const seenCorrect = new Set<string>();

    question.correctOptionIds.forEach((correctId, index) => {
      if (!optionIds.has(correctId)) {
        ctx.addIssue({
          code: "custom",
          path: ["correctOptionIds", index],
          message: `"${correctId}" does not match any option id`,
        });
      }

      if (seenCorrect.has(correctId)) {
        ctx.addIssue({
          code: "custom",
          path: ["correctOptionIds", index],
          message: `duplicate correct option id "${correctId}"`,
        });
      }
      seenCorrect.add(correctId);
    });

    if (!question.multipleAnswers && question.correctOptionIds.length !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["correctOptionIds"],
        message:
          "single-answer questions (multipleAnswers: false) must have exactly one correct option",
      });
    }

    if (question.multipleAnswers && question.correctOptionIds.length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["correctOptionIds"],
        message:
          "multiple-answer questions (multipleAnswers: true) must have at least two correct options",
      });
    }
  });

export const questionsFileSchema = z
  .array(questionSchema)
  .min(1)
  .superRefine((questions, ctx) => {
    const seen = new Set<string>();

    questions.forEach((question, index) => {
      if (seen.has(question.id)) {
        ctx.addIssue({
          code: "custom",
          path: [index, "id"],
          message: `duplicate question id "${question.id}"`,
        });
      }
      seen.add(question.id);
    });
  });

export type CertificationDomain = z.infer<typeof domainSchema>;
export type CertificationMeta = z.infer<typeof certificationMetaSchema>;
export type QuestionOption = z.infer<typeof questionOptionSchema>;
export type Question = z.infer<typeof questionSchema>;

// Checks spanning meta.json and questions.json, shared by the loader and
// scripts/validate-content.ts. Returns human-readable issues, empty if OK.
export function findCrossFileIssues(
  meta: CertificationMeta,
  questions: Question[],
): string[] {
  const domainIds = new Set(meta.domains.map((domain) => domain.id));

  return questions
    .filter((question) => !domainIds.has(question.domainId))
    .map(
      (question) =>
        `question "${question.id}": domainId "${question.domainId}" is not declared in meta.json domains`,
    );
}
