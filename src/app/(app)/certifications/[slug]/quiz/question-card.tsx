"use client";

import { useState, useTransition } from "react";

import { submitAnswer } from "@/app/(app)/certifications/[slug]/quiz/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The client-safe slice of a question: no correctOptionIds, no explanation —
// those only ever arrive in the submitAnswer response (DESIGN.md Step 5).
export type SessionQuestion = {
  id: string;
  domainName: string;
  question: string;
  multipleAnswers: boolean;
  // How many answers to pencil in — what a real exam prints as "(Choose TWO)".
  requiredSelections: number;
  options: { id: string; text: string }[];
};

type Feedback = {
  isCorrect: boolean;
  correctOptionIds: string[];
  explanation: string;
};

// One question, rendered as a strip of the answer sheet: mono bubble letters
// that fill in when selected, grading shown inline on the rows themselves
// (never a toast), explanation unfolding in a left-ruled panel.
export function QuestionCard({
  certificationSlug,
  question,
  isLast,
  onGraded,
  onAdvance,
}: {
  certificationSlug: string;
  question: SessionQuestion;
  isLast: boolean;
  onGraded: (questionId: string, isCorrect: boolean) => void;
  onAdvance: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleOption(optionId: string) {
    if (feedback || pending) {
      return;
    }

    setSelectedIds((current) => {
      if (!question.multipleAnswers) {
        return [optionId];
      }

      return current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
    });
  }

  function submit() {
    startTransition(async () => {
      const result = await submitAnswer({
        certificationSlug,
        questionId: question.id,
        selectedOptionIds: selectedIds,
      });

      if (result.status === "error") {
        setErrorMessage(result.message);
        return;
      }

      setErrorMessage(null);
      setFeedback(result);
      onGraded(question.id, result.isCorrect);
    });
  }

  const canSubmit =
    !pending && selectedIds.length === question.requiredSelections;

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        {question.multipleAnswers ? (
          <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
            Select {question.requiredSelections} answers
          </p>
        ) : null}
        <h2 className="text-lg leading-relaxed font-medium">
          {question.question}
        </h2>
      </div>

      <div className="grid gap-2" role="group" aria-label="Answer options">
        {question.options.map((option, index) => {
          const letter = String.fromCharCode(97 + index);
          const isSelected = selectedIds.includes(option.id);
          const isCorrectOption =
            feedback?.correctOptionIds.includes(option.id) ?? false;
          const isWrongSelection = feedback
            ? isSelected && !isCorrectOption
            : false;

          return (
            <label
              key={option.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/60",
                feedback
                  ? isCorrectOption
                    ? "border-mastery/60 bg-mastery/10"
                    : isWrongSelection
                      ? "border-destructive/60 bg-destructive/10"
                      : "border-border opacity-60"
                  : cn(
                      "cursor-pointer",
                      isSelected
                        ? "border-foreground/60 bg-muted/60"
                        : "border-border hover:bg-muted/40",
                    ),
              )}
            >
              <input
                type={question.multipleAnswers ? "checkbox" : "radio"}
                name={`answer-${question.id}`}
                value={option.id}
                checked={isSelected}
                disabled={feedback !== null || pending}
                onChange={() => toggleOption(option.id)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border font-mono text-xs",
                  feedback
                    ? isCorrectOption
                      ? "border-mastery bg-mastery text-white"
                      : isWrongSelection
                        ? "border-destructive bg-destructive text-white"
                        : "border-muted-foreground/40 text-muted-foreground"
                    : isSelected
                      ? "border-foreground bg-foreground text-background"
                      : "border-muted-foreground/40 text-muted-foreground",
                )}
              >
                {letter}
              </span>
              <span className="pt-0.5 text-sm leading-relaxed">
                {option.text}
              </span>
            </label>
          );
        })}
      </div>

      {errorMessage ? (
        <p className="text-destructive text-sm" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {feedback ? (
        <div
          className={cn(
            "grid gap-2 border-l-2 py-1 pl-4",
            feedback.isCorrect ? "border-mastery" : "border-destructive",
          )}
          role="status"
        >
          <p
            className={cn(
              "font-mono text-xs font-medium tracking-widest uppercase",
              feedback.isCorrect ? "text-mastery" : "text-destructive",
            )}
          >
            {feedback.isCorrect ? "✓ Correct" : "✕ Incorrect"}
          </p>
          <p className="text-sm leading-relaxed">{feedback.explanation}</p>
        </div>
      ) : null}

      <div className="flex justify-end">
        {feedback ? (
          <Button onClick={onAdvance}>
            {isLast ? "View session report" : "Next question"}
          </Button>
        ) : (
          <Button onClick={submit} disabled={!canSubmit}>
            {pending ? "Grading…" : "Submit answer"}
          </Button>
        )}
      </div>
    </div>
  );
}
