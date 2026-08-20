// Pure quiz-session logic (SPECIFICATIONS.md §5.3), shared by the submit
// Server Action (grading) and the client session component (batch
// selection). No server-only imports: must stay importable from the client.

// A batch is what the user picks on the session setup screen:
// all / not-yet-mastered / N random.
export type SessionBatch =
  { kind: "all" } | { kind: "unmastered" } | { kind: "random"; count: number };

// Random batch sizes offered on the setup screen; a size is only shown when
// it is strictly smaller than the bank ("all" already covers the rest).
export const RANDOM_BATCH_SIZES = [10, 20];

// An answer is correct iff the selected set equals the correct set exactly —
// no partial credit, matching how certification exams score multi-answer
// questions.
export function gradeAnswer(
  correctOptionIds: readonly string[],
  selectedOptionIds: readonly string[],
): boolean {
  const correct = new Set(correctOptionIds);
  const selected = new Set(selectedOptionIds);

  return (
    correct.size === selected.size &&
    [...selected].every((id) => correct.has(id))
  );
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

// Selects the questions for a session. "all" and "unmastered" keep bank
// order (stable for review); "random" shuffles before taking `count`.
export function pickSessionQuestions<T extends { id: string }>(
  questions: readonly T[],
  unmasteredIds: ReadonlySet<string>,
  batch: SessionBatch,
): T[] {
  switch (batch.kind) {
    case "all":
      return [...questions];
    case "unmastered":
      return questions.filter((question) => unmasteredIds.has(question.id));
    case "random":
      return shuffle([...questions]).slice(0, batch.count);
  }
}

// The batch as it travels in the URL. Putting the choice in `?batch=` — the
// way `?domain=` already works — is what lets the server pick the session's
// questions and send only those, instead of shipping the whole bank to the
// client and filtering it after hydration.
export type BatchParam = "all" | "unmastered" | `random-${number}`;

export function batchParamValue(batch: SessionBatch): BatchParam {
  return batch.kind === "random" ? `random-${batch.count}` : batch.kind;
}

// Returns null for anything not offered by the setup screen, so a
// hand-edited or stale link is rejected rather than silently reinterpreted.
export function parseBatchParam(value: unknown): SessionBatch | null {
  if (value === "all") {
    return { kind: "all" };
  }

  if (value === "unmastered") {
    return { kind: "unmastered" };
  }

  if (typeof value === "string" && value.startsWith("random-")) {
    const count = Number(value.slice("random-".length));

    return RANDOM_BATCH_SIZES.includes(count)
      ? { kind: "random", count }
      : null;
  }

  return null;
}
