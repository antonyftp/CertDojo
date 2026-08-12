"use client";

import { useActionState } from "react";
import { UploadIcon } from "lucide-react";

import {
  importUserData,
  type ImportState,
} from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialImportState: ImportState = { status: "idle" };

// Import half of SPECIFICATIONS.md §5.5. Feedback is an inline mono status
// line, never a toast (DESIGN.md Step 7 amendment): flag red for a rejected
// file, verified green for restored records.
export function ImportForm() {
  const [state, formAction, pending] = useActionState(
    importUserData,
    initialImportState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="import-file">Backup file</Label>
        <Input
          id="import-file"
          name="file"
          type="file"
          accept="application/json,.json"
          required
        />
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          <UploadIcon aria-hidden="true" />
          {pending ? "Importing…" : "Import file"}
        </Button>
      </div>
      {state.status === "error" ? (
        <p className="text-destructive font-mono text-xs" role="alert">
          ✕ {state.message}
        </p>
      ) : null}
      {state.status === "success" ? (
        <p className="text-mastery font-mono text-xs" role="status">
          ✓ RECORDS RESTORED — {state.certifications} certification
          {state.certifications === 1 ? "" : "s"} · {state.attempts} attempt
          {state.attempts === 1 ? "" : "s"}
        </p>
      ) : null}
    </form>
  );
}
