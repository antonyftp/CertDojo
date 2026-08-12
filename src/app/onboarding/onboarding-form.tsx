"use client";

import { useActionState } from "react";

import { completeOnboarding } from "@/app/onboarding/actions";
import { initialOnboardingFormState } from "@/app/onboarding/form-schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type CertificationChoice = {
  slug: string;
  name: string;
  examCode: string;
};

export type ProviderGroup = {
  provider: string;
  certifications: CertificationChoice[];
};

export function OnboardingForm({
  providerGroups,
}: {
  providerGroups: ProviderGroup[];
}) {
  const [state, formAction, pending] = useActionState(
    completeOnboarding,
    initialOnboardingFormState,
  );

  return (
    <form action={formAction} className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>About you</CardTitle>
          <CardDescription>
            Asked once — CertDojo is a single-user tool with no account.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              placeholder="Ada Lovelace"
              aria-invalid={state.fieldErrors.name ? true : undefined}
            />
            {state.fieldErrors.name ? (
              <p className="text-destructive text-sm" role="alert">
                {state.fieldErrors.name}
              </p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="jobTitle">Job title</Label>
            <Input
              id="jobTitle"
              name="jobTitle"
              autoComplete="organization-title"
              placeholder="Cloud Engineer"
              aria-invalid={state.fieldErrors.jobTitle ? true : undefined}
            />
            {state.fieldErrors.jobTitle ? (
              <p className="text-destructive text-sm" role="alert">
                {state.fieldErrors.jobTitle}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Certifications to track</CardTitle>
          <CardDescription>
            Pick at least one. You can add or remove certifications later from
            the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          {providerGroups.map((group) => (
            <fieldset key={group.provider} className="grid gap-3">
              <legend className="text-muted-foreground mb-2 text-xs font-medium tracking-widest uppercase">
                {group.provider}
              </legend>
              {group.certifications.map((certification) => (
                <div
                  key={certification.slug}
                  className="flex items-start gap-3"
                >
                  <Checkbox
                    id={`certification-${certification.slug}`}
                    name="certificationSlugs"
                    value={certification.slug}
                  />
                  <Label
                    htmlFor={`certification-${certification.slug}`}
                    className="grid gap-0.5 font-normal"
                  >
                    <span>{certification.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {certification.examCode}
                    </span>
                  </Label>
                </div>
              ))}
            </fieldset>
          ))}
          {state.fieldErrors.certificationSlugs ? (
            <p className="text-destructive text-sm" role="alert">
              {state.fieldErrors.certificationSlugs}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {state.formError ? (
        <p className="text-destructive text-sm" role="alert">
          {state.formError}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Setting up…" : "Start practicing"}
      </Button>
    </form>
  );
}
