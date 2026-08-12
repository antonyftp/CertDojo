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

export function ProfileForm({ initialName, initialJobTitle }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(updateProfile, {
    status: "idle" as const,
  });

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="profile-name">Name</Label>
        <Input
          id="profile-name"
          name="name"
          autoComplete="name"
          defaultValue={initialName}
          aria-invalid={
            state.status === "error" && "fieldErrors" in state && state.fieldErrors?.name
              ? true
              : undefined
          }
        />
        {state.status === "error" && "fieldErrors" in state && state.fieldErrors?.name ? (
          <p className="text-destructive text-sm" role="alert">
            {state.fieldErrors.name}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="profile-job-title">Job title</Label>
        <Input
          id="profile-job-title"
          name="jobTitle"
          autoComplete="organization-title"
          defaultValue={initialJobTitle}
          aria-invalid={
            state.status === "error" && "fieldErrors" in state && state.fieldErrors?.jobTitle
              ? true
              : undefined
          }
        />
        {state.status === "error" && "fieldErrors" in state && state.fieldErrors?.jobTitle ? (
          <p className="text-destructive text-sm" role="alert">
            {state.fieldErrors.jobTitle}
          </p>
        ) : null}
      </div>
      {state.status === "error" && "message" in state ? (
        <p className="text-destructive text-sm" role="alert">
          {state.message}
        </p>
      ) : null}
      {state.status === "success" ? (
        <p className="text-sm text-green-600 dark:text-green-400" role="status">
          Profile updated.
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
