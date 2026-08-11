import { StudyPlanner } from "@/components/study-planner";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-12 px-6 py-16 sm:px-10">
      <section className="grid gap-4">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-zinc-500">
          CertPrep
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
          Open-source Next.js starter for certification prep workflows.
        </h1>
        <p className="max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
          This starter pairs App Router, Tailwind CSS 4, shadcn/ui patterns,
          Zustand, Drizzle, SQLite/Postgres support, Zod, Vitest, Playwright,
          and Docker in one minimal baseline.
        </p>
      </section>

      <StudyPlanner />
    </main>
  );
}
