// Deliberately no "use client": with no hooks of its own, this renders on the
// server for the appearance control (which passes defaultChecked and no
// handler) and is bundled into the client for the quiz, which passes
// onChange. One component, both worlds.
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// The answer-sheet option row (DESIGN.md): a full-width label wrapping a
// visually hidden input, with the bubble as the only state indicator. Audit
// DS-09 found this skeleton reimplemented twice, character for character down
// to the has-[:focus-visible] ring. It now has three consumers: the quiz's
// question options, its batch picker, and the appearance control.
//
// The input stays a real <input type="radio"|"checkbox">, so keyboard
// behaviour, form submission, and the accessibility tree are the browser's
// job, not ours.
export function SheetOptionRow({
  type,
  name,
  value,
  checked,
  defaultChecked,
  disabled = false,
  onChange,
  indicator,
  state = "idle",
  className,
  children,
}: {
  type: "radio" | "checkbox";
  name: string;
  value: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: () => void;
  // What sits in the bubble: a letter, a tick, or nothing (a plain dot).
  indicator?: ReactNode;
  // "idle"/"selected" are pre-answer states; "correct"/"incorrect"/"muted"
  // are the graded ones.
  state?: "idle" | "selected" | "correct" | "incorrect" | "muted";
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 transition-colors",
        "has-[:focus-visible]:ring-ring/60 has-[:focus-visible]:ring-2",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        state === "correct" && "border-mastery/60 bg-mastery/10",
        state === "incorrect" && "border-destructive/60 bg-destructive/10",
        state === "muted" && "border-border text-muted-foreground",
        (state === "selected" || state === "idle") && [
          "border-input hover:bg-muted/40",
          // The real input is visually hidden, so selection has to be drawn
          // from its :checked state — otherwise an uncontrolled form (the
          // appearance control, which submits on a button) would give no
          // feedback at all when a different row is picked.
          "has-[:checked]:border-foreground/60 has-[:checked]:bg-muted/60",
        ],
        className,
      )}
    >
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-full border font-mono text-xs",
          state === "correct" && "border-mastery bg-mastery text-white",
          state === "incorrect" &&
            "border-destructive bg-destructive text-white",
          state === "muted" &&
            "border-muted-foreground/70 text-muted-foreground",
          (state === "selected" || state === "idle") && [
            "border-muted-foreground/70 text-muted-foreground",
            "peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background",
          ],
        )}
      >
        {indicator}
      </span>
      <span className="grid flex-1 gap-0.5 pt-0.5 text-sm leading-relaxed">
        {children}
      </span>
    </label>
  );
}
