"use client";

import * as React from "react";
import { Progress as ProgressPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

// Tone is part of what a progress bar means here, so it lives in the component
// rather than in a caller's override: DESIGN.md reserves blue for interactive
// elements, green and gold for what has been earned.
const TONES = {
  primary: { track: "bg-primary/20", indicator: "bg-primary" },
  mastery: { track: "bg-muted", indicator: "bg-mastery" },
  seal: { track: "bg-muted", indicator: "bg-seal" },
} as const;

function Progress({
  className,
  value,
  tone = "primary",
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  tone?: keyof typeof TONES;
}) {
  const { track, indicator } = TONES[tone];

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full",
        track,
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn("h-full w-full flex-1 transition-all", indicator)}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
