import { z } from "zod";

// Validates the onboarding form submission (SPECIFICATIONS.md §5.1). Kept
// separate from actions.ts so it stays importable outside the react-server
// condition (unit tests). Slug existence against /content is checked in the
// Server Action, since the content loader is server-only.

export const onboardingFormSchema = z.object({
  name: z
    .string("Please enter your name.")
    .trim()
    .min(1, "Please enter your name.")
    .max(120, "Name must be 120 characters or fewer."),
  jobTitle: z
    .string("Please enter your job title.")
    .trim()
    .min(1, "Please enter your job title.")
    .max(120, "Job title must be 120 characters or fewer."),
  certificationSlugs: z
    .array(z.string(), "Select at least one certification to track.")
    .min(1, "Select at least one certification to track."),
});

export type OnboardingFormValues = z.infer<typeof onboardingFormSchema>;

export type OnboardingFormState = {
  fieldErrors: {
    name?: string;
    jobTitle?: string;
    certificationSlugs?: string;
  };
  formError?: string;
};

export const initialOnboardingFormState: OnboardingFormState = {
  fieldErrors: {},
};
