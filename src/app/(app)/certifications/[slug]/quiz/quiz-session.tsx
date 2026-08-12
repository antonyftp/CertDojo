"use client";

import { useState } from "react";
import Link from "next/link";

import {
  QuestionCard,
  type SessionQuestion,
} from "@/app/(app)/certifications/[slug]/quiz/question-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  pickSessionQuestions,
  RANDOM_BATCH_SIZES,
  type SessionBatch,
} from "@/lib/quiz/quiz";
import { cn } from "@/lib/utils";

export type { SessionQuestion };

type Certification = {
  slug: string;
  name: string;
  provider: string;
  examCode: string;
};

type Phase = "setup" | "active" | "report";

type BatchValue = "all" | "unmastered" | `random-${number}`;

function toBatch(value: BatchValue): SessionBatch {
  if (value === "all") {
    return { kind: "all" };
  }

  if (value === "unmastered") {
    return { kind: "unmastered" };
  }

  return { kind: "random", count: Number(value.slice("random-".length)) };
}

// The whole quiz session lives on the client as three states of one page
// (DESIGN.md Step 5 amendment): the exam form (setup), marking the answer
// sheet (questions), the score report (summary). Attempts are persisted
// per answer by the submitAnswer Server Action, so leaving mid-session
// loses nothing.
export function QuizSession({
  certification,
  questions,
  initialUnmasteredIds,
  domain = null,
}: {
  certification: Certification;
  questions: SessionQuestion[];
  initialUnmasteredIds: string[];
  // Set when the session is scoped to one blueprint domain (Step 6): the
  // question list is already filtered server-side; this only drives labels
  // and sends back links to the certification detail view instead of the
  // dashboard.
  domain?: { id: string; name: string } | null;
}) {
  const [unmasteredIds, setUnmasteredIds] = useState(
    () => new Set(initialUnmasteredIds),
  );
  const [batchValue, setBatchValue] = useState<BatchValue>(
    initialUnmasteredIds.length > 0 ? "unmastered" : "all",
  );
  const [phase, setPhase] = useState<Phase>("setup");
  const [sessionQuestions, setSessionQuestions] = useState<SessionQuestion[]>(
    [],
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<
    { questionId: string; isCorrect: boolean }[]
  >([]);

  const batchChoices: {
    value: BatchValue;
    label: string;
    count: number;
    disabled?: boolean;
  }[] = [
    { value: "all", label: "All questions", count: questions.length },
    {
      value: "unmastered",
      label: "Not yet mastered",
      count: unmasteredIds.size,
      disabled: unmasteredIds.size === 0,
    },
    ...RANDOM_BATCH_SIZES.filter((size) => size < questions.length).map(
      (size) => ({
        value: `random-${size}` as const,
        label: `${size} random`,
        count: size,
      }),
    ),
  ];

  function startSession() {
    const picked = pickSessionQuestions(
      questions,
      unmasteredIds,
      toBatch(batchValue),
    );

    if (picked.length === 0) {
      return;
    }

    setSessionQuestions(picked);
    setCurrentIndex(0);
    setResults([]);
    setPhase("active");
  }

  function handleGraded(questionId: string, isCorrect: boolean) {
    setResults((current) => [...current, { questionId, isCorrect }]);
    setUnmasteredIds((current) => {
      const next = new Set(current);

      if (isCorrect) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }

      return next;
    });
  }

  function handleAdvance() {
    if (currentIndex + 1 >= sessionQuestions.length) {
      setPhase("report");
    } else {
      setCurrentIndex((index) => index + 1);
    }
  }

  function restart() {
    setBatchValue(unmasteredIds.size > 0 ? "unmastered" : "all");
    setPhase("setup");
  }

  const backHref = domain
    ? `/certifications/${certification.slug}`
    : "/dashboard";
  const backLabel = domain ? "Certification" : "Dashboard";

  const currentQuestion = sessionQuestions[currentIndex];
  const correctCount = results.filter((result) => result.isCorrect).length;
  const sessionPercent =
    results.length === 0
      ? 0
      : Math.round((correctCount / results.length) * 100);

  return (
    <div className="min-h-dvh">
      <header className="bg-card border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/dashboard"
            className="font-mono text-sm font-semibold tracking-widest"
          >
            CERTDOJO<span className="text-primary">{"///"}</span>
          </Link>
          {phase === "active" && currentQuestion ? (
            <span className="text-muted-foreground truncate font-mono text-xs tracking-wider uppercase">
              {certification.examCode} · Question {currentIndex + 1}/
              {sessionQuestions.length} · {currentQuestion.domainName}
            </span>
          ) : (
            <Link
              href={backHref}
              className="text-muted-foreground hover:text-foreground font-mono text-xs tracking-widest uppercase"
            >
              ← {backLabel}
            </Link>
          )}
        </div>
        {phase === "active" ? (
          <div className="mx-auto w-full max-w-5xl px-6 pb-3">
            <Progress
              value={(results.length / sessionQuestions.length) * 100}
              aria-label={`Session progress: ${results.length} of ${sessionQuestions.length} questions answered`}
              className="h-1.5"
            />
          </div>
        ) : null}
      </header>

      <main className="mx-auto grid w-full max-w-2xl gap-8 px-6 py-10">
        {phase === "setup" ? (
          <>
            <section className="grid gap-1">
              <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
                {certification.provider} · {certification.examCode}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight">
                Practice session
              </h1>
              <p className="text-muted-foreground">{certification.name}</p>
              {domain ? (
                <p className="text-muted-foreground mt-1 font-mono text-xs tracking-widest uppercase">
                  Domain · {domain.name}
                </p>
              ) : null}
            </section>
            <section className="grid gap-2" aria-label="Question batch">
              {batchChoices.map((choice) => {
                const isSelected = batchValue === choice.value;

                return (
                  <label
                    key={choice.value}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                      "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/60",
                      choice.disabled
                        ? "cursor-not-allowed opacity-50"
                        : "cursor-pointer",
                      isSelected && !choice.disabled
                        ? "border-primary/60 bg-accent/60"
                        : "border-border hover:bg-muted/40",
                    )}
                  >
                    <input
                      type="radio"
                      name="batch"
                      value={choice.value}
                      checked={isSelected}
                      disabled={choice.disabled}
                      onChange={() => setBatchValue(choice.value)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-4 shrink-0 rounded-full border-2",
                        isSelected && !choice.disabled
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/40",
                      )}
                    />
                    <span className="grid gap-0.5">
                      <span className="font-mono text-sm tracking-wider uppercase">
                        {choice.label}
                      </span>
                      {choice.disabled ? (
                        <span className="text-muted-foreground text-xs">
                          Everything is mastered — run all questions to keep it
                          sharp.
                        </span>
                      ) : null}
                    </span>
                    <span className="text-muted-foreground ml-auto font-mono text-sm">
                      {choice.count}
                    </span>
                  </label>
                );
              })}
            </section>
            <div className="flex justify-end">
              <Button onClick={startSession}>Start session</Button>
            </div>
          </>
        ) : null}

        {phase === "active" && currentQuestion ? (
          <QuestionCard
            key={currentQuestion.id}
            certificationSlug={certification.slug}
            question={currentQuestion}
            isLast={currentIndex + 1 >= sessionQuestions.length}
            onGraded={handleGraded}
            onAdvance={handleAdvance}
          />
        ) : null}

        {phase === "report" ? (
          <>
            <section className="grid gap-4">
              <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
                Session report · {certification.examCode}
                {domain ? ` · ${domain.name}` : ""}
              </p>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                <span className="font-mono text-4xl font-semibold">
                  {correctCount}/{results.length}
                </span>
                <span className="text-muted-foreground font-mono text-xl">
                  {sessionPercent}%
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "font-mono text-[10px] tracking-wider uppercase",
                    sessionPercent >= 80
                      ? "border-seal/40 bg-seal/15 text-seal"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {sessionPercent >= 80 ? "Exam-ready pace" : "Keep practicing"}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                {correctCount} correct · {results.length - correctCount}{" "}
                incorrect. Your attempts are saved — the dashboard already
                reflects this session.
              </p>
            </section>
            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="outline" onClick={restart}>
                Practice again
              </Button>
              <Button asChild>
                <Link href={backHref}>Back to {backLabel.toLowerCase()}</Link>
              </Button>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
