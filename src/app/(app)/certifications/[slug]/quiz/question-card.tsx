"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { submitAnswer } from "@/app/(app)/certifications/[slug]/quiz/actions";
import { SheetOptionRow } from "@/components/sheet-option-row";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The client-safe slice of a question: no correctOptionIds, no explanation —
// those only ever arrive in the submitAnswer response (DESIGN.md "quiz
// session screens").
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
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The session remounts this card per question (keyed on question.id), which
  // would otherwise drop focus to <body> and restart a keyboard user at the
  // top of the document. Focusing the new stem preserves tab order and makes a
  // screen reader read the question (WCAG 2.4.3). One mount = one question.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

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
        <h2
          id={`question-${question.id}`}
          ref={headingRef}
          // Not in the tab order (-1), only a programmatic focus target.
          tabIndex={-1}
          className="rounded-sm text-lg leading-relaxed font-medium focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
        >
          {question.question}
        </h2>
      </div>

      {/* Labelled by the stem rather than a fixed string, so a screen reader
          announces which question these options belong to. */}
      <div
        className="grid gap-2"
        role="group"
        aria-labelledby={`question-${question.id}`}
      >
        {question.options.map((option, index) => {
          const letter = String.fromCharCode(97 + index);
          const isSelected = selectedIds.includes(option.id);
          const isCorrectOption =
            feedback?.correctOptionIds.includes(option.id) ?? false;
          const isWrongSelection = feedback
            ? isSelected && !isCorrectOption
            : false;

          const state = feedback
            ? isCorrectOption
              ? "correct"
              : isWrongSelection
                ? "incorrect"
                : "muted"
            : isSelected
              ? "selected"
              : "idle";

          return (
            <SheetOptionRow
              key={option.id}
              type={question.multipleAnswers ? "checkbox" : "radio"}
              name={`answer-${question.id}`}
              value={option.id}
              checked={isSelected}
              disabled={feedback !== null || pending}
              onChange={() => toggleOption(option.id)}
              state={state}
              // A ✓/✕ glyph, not green/red alone — the exact pair
              // deuteranopia collapses. The grade survives greyscale
              // (WCAG 1.4.1).
              indicator={
                state === "correct" ? "✓" : state === "incorrect" ? "✕" : letter
              }
            >
              <span>
                {option.text}
                {/* ...and in the accessible name, since the glyph is
                    aria-hidden and the inputs are disabled after grading
                    (WCAG 4.1.2). */}
                {feedback ? (
                  <span className="sr-only">
                    {isCorrectOption
                      ? isSelected
                        ? " — Correct answer. You selected this."
                        : " — Correct answer. You did not select this."
                      : isWrongSelection
                        ? " — Incorrect. You selected this."
                        : " — Not a correct answer."}
                  </span>
                ) : null}
              </span>
            </SheetOptionRow>
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
