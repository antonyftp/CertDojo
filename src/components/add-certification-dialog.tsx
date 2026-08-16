"use client";

import { useActionState, useState } from "react";
import { PlusIcon } from "lucide-react";

import {
  addCertifications,
  type AddCertificationsState,
} from "@/app/(app)/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const initialAddCertificationsState: AddCertificationsState = {
  status: "idle",
};

export type CertificationChoice = {
  slug: string;
  name: string;
  examCode: string;
};

export type ProviderGroup = {
  provider: string;
  certifications: CertificationChoice[];
};

// Adds tracked certifications from the dashboard without re-running
// onboarding (SPECIFICATIONS.md §5.2). `providerGroups` only contains
// certifications not currently tracked.
export function AddCertificationDialog({
  providerGroups,
}: {
  providerGroups: ProviderGroup[];
}) {
  const [open, setOpen] = useState(false);
  // Audit FE-02: this was the only form in the app wrapping its Server Action
  // in a client closure over startTransition. useActionState passes the
  // action itself to <form action>, which is what the other three forms do.
  const [state, formAction, pending] = useActionState(
    addCertifications,
    initialAddCertificationsState,
  );

  // Closing on success is an adjustment to a state change, not a side effect,
  // so it happens during render (React's "adjusting state when props change"
  // pattern) rather than in an effect — which would cost an extra render pass
  // and trips react-hooks/set-state-in-effect. Comparing object identity
  // makes it fire once per submission, so reopening the dialog afterwards
  // does not immediately re-close it.
  const [settledState, setSettledState] = useState(state);

  if (state !== settledState) {
    setSettledState(state);

    if (state.status === "success") {
      setOpen(false);
    }
  }

  const nothingLeftToTrack = providerGroups.length === 0;

  if (nothingLeftToTrack) {
    return (
      <Button variant="outline" disabled>
        <PlusIcon aria-hidden="true" />
        All certifications tracked
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PlusIcon aria-hidden="true" />
          Track certification
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Track a certification</DialogTitle>
          <DialogDescription>
            Progress starts at zero; previous attempts are restored if you
            tracked it before.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-6">
          <div className="grid max-h-80 gap-6 overflow-y-auto">
            {providerGroups.map((group) => (
              <fieldset key={group.provider} className="grid gap-3">
                <legend className="text-muted-foreground mb-2 font-mono text-xs tracking-widest uppercase">
                  {group.provider}
                </legend>
                {group.certifications.map((certification) => (
                  <div
                    key={certification.slug}
                    className="flex items-start gap-3"
                  >
                    <Checkbox
                      id={`add-certification-${certification.slug}`}
                      name="certificationSlugs"
                      value={certification.slug}
                    />
                    <Label
                      htmlFor={`add-certification-${certification.slug}`}
                      className="grid gap-0.5 font-normal"
                    >
                      <span>{certification.name}</span>
                      <span className="text-muted-foreground font-mono text-xs">
                        {certification.examCode}
                      </span>
                    </Label>
                  </div>
                ))}
              </fieldset>
            ))}
          </div>
          {state.status === "error" ? (
            <p className="text-destructive text-sm" role="alert">
              {state.message ?? "Something went wrong. Try again."}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Start tracking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
