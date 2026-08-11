import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getAttemptsForCertification } from "@/db/queries";
import { getCertificationBySlug, getQuestions } from "@/lib/content/loader";
import {
  QuizSession,
  type SessionQuestion,
} from "@/app/(app)/certifications/[slug]/quiz/quiz-session";

export async function generateMetadata({
  params,
}: PageProps<"/certifications/[slug]/quiz">): Promise<Metadata> {
  const { slug } = await params;
  const meta = getCertificationBySlug(slug);

  return { title: meta ? `${meta.examCode} practice — CertPrep` : "CertPrep" };
}

export default async function QuizPage({
  params,
  searchParams,
}: PageProps<"/certifications/[slug]/quiz">) {
  const [{ slug }, { domain: domainParam }] = await Promise.all([
    params,
    searchParams,
  ]);
  const meta = getCertificationBySlug(slug);

  if (!meta) {
    notFound();
  }

  // Optional ?domain=<id> scopes the session to one blueprint domain
  // (DEV_PLAN_V1.md Step 6): the filter is applied here, server-side, so the
  // client session never even receives questions outside the domain. An id
  // that is not in the blueprint is a broken/stale link → 404.
  let domain: { id: string; name: string } | null = null;

  if (domainParam !== undefined) {
    const match =
      typeof domainParam === "string"
        ? meta.domains.find((candidate) => candidate.id === domainParam)
        : undefined;

    if (!match) {
      notFound();
    }

    domain = { id: match.id, name: match.name };
  }

  const questions = getQuestions(slug).filter(
    (question) => domain === null || question.domainId === domain.id,
  );
  const attempts = await getAttemptsForCertification(slug);
  const domainNames = new Map(
    meta.domains.map((domain) => [domain.id, domain.name]),
  );

  // Client payload deliberately excludes correctOptionIds and explanation:
  // grading is server-side only (see actions.ts). requiredSelections tells
  // the client how many answers to pencil in — the same information a real
  // exam prints as "(Choose TWO)".
  const sessionQuestions: SessionQuestion[] = questions.map((question) => ({
    id: question.id,
    domainName: domainNames.get(question.domainId) ?? question.domainId,
    question: question.question,
    multipleAnswers: question.multipleAnswers,
    requiredSelections: question.multipleAnswers
      ? question.correctOptionIds.length
      : 1,
    options: question.options.map((option) => ({
      id: option.id,
      text: option.text,
    })),
  }));

  const masteredIds = new Set(
    attempts
      .filter((attempt) => attempt.isCorrect)
      .map((attempt) => attempt.questionId),
  );
  const unmasteredIds = questions
    .map((question) => question.id)
    .filter((id) => !masteredIds.has(id));

  return (
    <QuizSession
      certification={{
        slug: meta.slug,
        name: meta.name,
        provider: meta.provider,
        examCode: meta.examCode,
      }}
      questions={sessionQuestions}
      initialUnmasteredIds={unmasteredIds}
      domain={domain}
    />
  );
}
