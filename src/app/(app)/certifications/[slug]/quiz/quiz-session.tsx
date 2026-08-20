"use client";

import { useState } from "react";
import Link from "next/link";

import {
  QuestionCard,
  type SessionQuestion,
} from "@/app/(app)/certifications/[slug]/quiz/question-card";
import { AppHeader, AppHeaderBackLink } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kicker } from "@/components/kicker";
import { Progress } from "@/components/ui/progress";
import { toPercent } from "@/lib/progress/progress";
import { cn } from "@/lib/utils";

export type { SessionQuestion };

type Certification = {
  slug: string;
  name: string;
  provider: string;
  examCode: string;
};

type Phase = "active" | "report";

// The graded half of a session (DESIGN.md "quiz session screens"): marking the
// answer sheet, then the score report. Attempts are persisted per answer by
// the submitAnswer Server Action, so leaving mid-session loses nothing.
//
// `questions` is exactly the session and nothing more — the picking happens
// server-side from ?batch= (see quiz-setup.tsx).
export function QuizSession({
  certification,
  questions: sessionQuestions,
  backHref,
  backLabel,
  setupHref,
  domain = null,
}: {
  certification: Certification;
  questions: SessionQuestion[];
  backHref: string;
  backLabel: string;
  // Where "Practice again" goes: the setup screen for this same scope.
  setupHref: string;
  // Set when the session is scoped to one blueprint domain: the question list
  // is already filtered server-side, so this only drives labels.
  domain?: { id: string; name: string } | null;
}) {
  const [phase, setPhase] = useState<Phase>("active");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<
    { questionId: string; isCorrect: boolean }[]
  >([]);

  function handleGraded(questionId: string, isCorrect: boolean) {
    setResults((current) => [...current, { questionId, isCorrect }]);
  }

  function handleAdvance() {
    if (currentIndex + 1 >= sessionQuestions.length) {
      setPhase("report");
    } else {
      setCurrentIndex((index) => index + 1);
    }
  }

  const currentQuestion = sessionQuestions[currentIndex];
  const correctCount = results.filter((result) => result.isCorrect).length;
  const sessionPercent = toPercent(correctCount, results.length);

  return (
    <div className="min-h-dvh">
      <AppHeader
        below={
          phase === "active" ? (
            <Progress
              value={(results.length / sessionQuestions.length) * 100}
              aria-label={`Session progress: ${results.length} of ${sessionQuestions.length} questions answered`}
              className="h-1.5"
            />
          ) : null
        }
      >
        {phase === "active" && currentQuestion ? (
          <span
            // Announced on change (WCAG 4.1.3), politely so it queues behind
            // the question stem that takes focus on each new card.
            role="status"
            aria-live="polite"
            className="text-muted-foreground truncate font-mono text-xs tracking-wider uppercase"
          >
            {certification.examCode} · Question {currentIndex + 1}/
            {sessionQuestions.length} · {currentQuestion.domainName}
          </span>
        ) : (
          <AppHeaderBackLink href={backHref} label={backLabel} />
        )}
      </AppHeader>

      <main
        id="main-content"
        className="mx-auto grid w-full max-w-2xl gap-8 px-6 py-10"
      >
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
              <Kicker>
                {`Session report · ${certification.examCode}${domain ? ` · ${domain.name}` : ""}`}
              </Kicker>
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
                    "font-mono text-2xs tracking-wider uppercase",
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
              <Button variant="outline" asChild>
                <Link href={setupHref}>Practice again</Link>
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
