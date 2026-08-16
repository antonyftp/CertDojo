"use client";

import { useActionState } from "react";

import { updateProfile } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ProfileFormProps = {
  initialName: string;
  initialJobTitle: string;
};

export function ProfileForm({
  initialName,
  initialJobTitle,
}: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(updateProfile, {
    status: "idle" as const,
  });

  // Pulled out of the JSX: the same four-clause narrowing was repeated for
  // every field and every error paragraph.
  const fieldErrors =
    state.status === "error" && "fieldErrors" in state
      ? state.fieldErrors
      : undefined;
  const nameError = fieldErrors?.name;
  const jobTitleError = fieldErrors?.jobTitle;

  return (
    // noValidate: `required` announces the state, the server owns the
    // messages — same reasoning as the onboarding form (audit A11Y-09).
    <form action={formAction} noValidate className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="profile-name">Name</Label>
        <Input
          id="profile-name"
          name="name"
          required
          autoComplete="name"
          defaultValue={initialName}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? "profile-name-error" : undefined}
        />
        {nameError ? (
          <p
            id="profile-name-error"
            className="text-destructive text-sm"
            role="alert"
          >
            {nameError}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="profile-job-title">Job title</Label>
        <Input
          id="profile-job-title"
          name="jobTitle"
          required
          autoComplete="organization-title"
          defaultValue={initialJobTitle}
          aria-invalid={jobTitleError ? true : undefined}
          aria-describedby={
            jobTitleError ? "profile-job-title-error" : undefined
          }
        />
        {jobTitleError ? (
          <p
            id="profile-job-title-error"
            className="text-destructive text-sm"
            role="alert"
          >
            {jobTitleError}
          </p>
        ) : null}
      </div>
      {state.status === "error" && "message" in state ? (
        <p className="text-destructive text-sm" role="alert">
          {state.message}
        </p>
      ) : null}
      {/* Audit DS-06: this was raw Tailwind green-600/green-400 while
          import-form.tsx used the --mastery token for the same kind of success
          line — two different greens on one page. */}
      {state.status === "success" ? (
        <p
          className="text-mastery font-mono text-xs tracking-widest uppercase"
          role="status"
        >
          ✓ Profile updated
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
