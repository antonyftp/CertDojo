import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getAttemptsForCertification } from "@/db/queries";
import { getCertificationBySlug, getQuestions } from "@/lib/content/loader";
import {
  parseBatchParam,
  pickSessionQuestions,
  RANDOM_BATCH_SIZES,
} from "@/lib/quiz/quiz";
import { QuizSetup } from "@/app/(app)/certifications/[slug]/quiz/quiz-setup";
import {
  QuizSession,
  type SessionQuestion,
} from "@/app/(app)/certifications/[slug]/quiz/quiz-session";

export async function generateMetadata({
  params,
}: PageProps<"/certifications/[slug]/quiz">): Promise<Metadata> {
  const { slug } = await params;
  const meta = getCertificationBySlug(slug);

  return { title: meta ? `${meta.examCode} practice — CertDojo` : "CertDojo" };
}

export default async function QuizPage({
  params,
  searchParams,
}: PageProps<"/certifications/[slug]/quiz">) {
  const [{ slug }, { domain: domainParam, batch: batchParam }] =
    await Promise.all([params, searchParams]);
  const meta = getCertificationBySlug(slug);

  if (!meta) {
    notFound();
  }

  // Optional ?domain=<id> scopes the session to one blueprint domain: the
  // filter is applied here, server-side, so the client session never even
  // receives questions outside the domain. An id
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

  const masteredIds = new Set(
    attempts
      .filter((attempt) => attempt.isCorrect)
      .map((attempt) => attempt.questionId),
  );
  const unmasteredIds = new Set(
    questions.map((q) => q.id).filter((id) => !masteredIds.has(id)),
  );

  const backHref = domain ? `/certifications/${slug}` : "/dashboard";
  const backLabel = domain ? "Certification" : "Dashboard";

  // Without ?batch= there is no session yet and the setup screen renders from
  // counts alone; only once a batch is chosen does this request materialise
  // the questions it needs (see quiz-setup.tsx).
  const batch = batchParam === undefined ? null : parseBatchParam(batchParam);

  if (batch === null) {
    // A ?batch= value the setup screen never offers is a stale or
    // hand-edited link, and is treated like a bad ?domain=.
    if (batchParam !== undefined) {
      notFound();
    }

    return (
      <QuizSetup
        certification={{
          name: meta.name,
          provider: meta.provider,
          examCode: meta.examCode,
        }}
        domain={domain}
        backHref={backHref}
        backLabel={backLabel}
        choices={[
          { value: "all", label: "All questions", count: questions.length },
          {
            value: "unmastered",
            label: "Not yet mastered",
            count: unmasteredIds.size,
            disabled: unmasteredIds.size === 0,
          },
          ...RANDOM_BATCH_SIZES.filter((size) => size < questions.length).map(
            (size) => ({
              value: `random-${size}`,
              label: `${size} random`,
              count: size,
            }),
          ),
        ]}
      />
    );
  }

  const picked = pickSessionQuestions(questions, unmasteredIds, batch);

  if (picked.length === 0) {
    // Nothing to practise for this batch (e.g. ?batch=unmastered once
    // everything is mastered): send the user back to choose another rather
    // than opening an empty session.
    redirect(
      domain
        ? `/certifications/${slug}/quiz?domain=${domain.id}`
        : `/certifications/${slug}/quiz`,
    );
  }

  const domainNames = new Map(meta.domains.map((d) => [d.id, d.name]));

  // Client payload deliberately excludes correctOptionIds and explanation:
  // grading is server-side only (see actions.ts). requiredSelections tells
  // the client how many answers to pencil in — the same information a real
  // exam prints as "(Choose TWO)".
  const sessionQuestions: SessionQuestion[] = picked.map((question) => ({
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

  return (
    <QuizSession
      certification={{
        slug: meta.slug,
        name: meta.name,
        provider: meta.provider,
        examCode: meta.examCode,
      }}
      questions={sessionQuestions}
      backHref={backHref}
      backLabel={backLabel}
      setupHref={
        domain
          ? `/certifications/${slug}/quiz?domain=${domain.id}`
          : `/certifications/${slug}/quiz`
      }
      domain={domain}
    />
  );
}
