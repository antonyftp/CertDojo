"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { useStudySessionStore } from "@/lib/study-session-store";
import { studyTopicSchema } from "@/lib/validation";

export function StudyPlanner() {
  const { topic, plannedSessions, setTopic, incrementSessions } =
    useStudySessionStore();
  const [draftTopic, setDraftTopic] = useState(topic);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = studyTopicSchema.safeParse({ topic: draftTopic });

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Enter a valid topic.");
      return;
    }

    setTopic(result.data.topic);
    incrementSessions();
    setError(null);
  }

  return (
    <section className="grid gap-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="grid gap-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
          Study planner
        </p>
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Build a focused certification plan.
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Tailwind 4 styling, Zustand state, and Zod validation are wired into
          this starter.
        </p>
      </div>

      <form className="grid gap-3" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Certification topic
          <input
            aria-label="Certification topic"
            className="h-10 rounded-md border border-zinc-300 bg-transparent px-3 text-sm outline-none ring-offset-2 transition focus-visible:ring-2 focus-visible:ring-zinc-950 dark:border-zinc-700 dark:focus-visible:ring-zinc-50"
            name="topic"
            onChange={(event) => setDraftTopic(event.target.value)}
            value={draftTopic}
          />
        </label>
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button type="submit">Save topic</Button>
          <Button type="button" variant="secondary" onClick={incrementSessions}>
            Add session
          </Button>
        </div>
      </form>

      <dl className="grid gap-3 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-sm text-zinc-500">Current topic</dt>
          <dd className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            {topic}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-sm text-zinc-500">Planned sessions</dt>
          <dd className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            {plannedSessions}
          </dd>
        </div>
      </dl>
    </section>
  );
}
