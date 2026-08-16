import { AppHeader, AppHeaderBackLink } from "@/components/app-header";
import { Kicker } from "@/components/kicker";
import { SheetOptionRow } from "@/components/sheet-option-row";
import { Button } from "@/components/ui/button";

// The exam form: pick a batch, then start (DESIGN.md Step 5 amendment).
//
// Audit FE-01: this used to be the first phase of the client session
// component, which meant the whole question bank (517 KB of JSON for
// dva-c02) was serialised into the page just so the client could filter it
// after hydration. It is now a server component that ships counts only — the
// questions themselves are fetched by the next request, once the batch is
// known.
//
// A plain GET form: submitting sets ?batch= on the same URL. No JavaScript,
// no Server Action, and the resulting URL is shareable and re-runnable.
export function QuizSetup({
  certification,
  domain,
  backHref,
  backLabel,
  choices,
}: {
  certification: { name: string; provider: string; examCode: string };
  domain: { id: string; name: string } | null;
  backHref: string;
  backLabel: string;
  choices: {
    value: string;
    label: string;
    count: number;
    disabled?: boolean;
  }[];
}) {
  // Default to the batch the user most likely wants: what they have not
  // mastered yet, unless there is nothing left.
  const unmastered = choices.find((choice) => choice.value === "unmastered");
  const defaultValue =
    unmastered && !unmastered.disabled ? "unmastered" : "all";

  return (
    <div className="min-h-dvh">
      <AppHeader>
        <AppHeaderBackLink href={backHref} label={backLabel} />
      </AppHeader>

      <main
        id="main-content"
        className="mx-auto grid w-full max-w-2xl gap-8 px-6 py-10"
      >
        <section className="grid gap-1">
          <Kicker>{`${certification.provider} · ${certification.examCode}`}</Kicker>
          <h1 className="text-2xl font-semibold tracking-tight">
            Practice session
          </h1>
          <p className="text-muted-foreground">{certification.name}</p>
          {domain ? (
            <Kicker className="mt-1">{`Domain · ${domain.name}`}</Kicker>
          ) : null}
        </section>

        <form method="get" className="grid gap-8">
          {/* Keeps a domain-scoped session scoped after the round trip. */}
          {domain ? (
            <input type="hidden" name="domain" value={domain.id} />
          ) : null}

          <fieldset className="grid gap-2">
            <legend className="sr-only">Question batch</legend>
            {choices.map((choice) => (
              <SheetOptionRow
                key={choice.value}
                type="radio"
                name="batch"
                value={choice.value}
                defaultChecked={choice.value === defaultValue}
                disabled={choice.disabled}
                state={choice.value === defaultValue ? "selected" : "idle"}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-sm tracking-wider uppercase">
                    {choice.label}
                  </span>
                  <span className="text-muted-foreground shrink-0 font-mono text-sm">
                    {choice.count}
                  </span>
                </span>
                {choice.disabled ? (
                  <span className="text-muted-foreground text-xs">
                    Everything is mastered — run all questions to keep it sharp.
                  </span>
                ) : null}
              </SheetOptionRow>
            ))}
          </fieldset>

          <div className="flex justify-end">
            <Button type="submit">Start session</Button>
          </div>
        </form>
      </main>
    </div>
  );
}
