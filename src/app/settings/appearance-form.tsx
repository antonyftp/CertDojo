import { setTheme } from "@/app/settings/actions";
import { SheetOptionRow } from "@/components/sheet-option-row";
import { Button } from "@/components/ui/button";
import type { ThemePreference } from "@/lib/theme";

const CHOICES: { value: ThemePreference; label: string; hint: string }[] = [
  { value: "system", label: "System", hint: "Follows your operating system." },
  { value: "light", label: "Light", hint: "Answer-sheet paper." },
  { value: "dark", label: "Dark", hint: "Graphite." },
];

// Theme control (SPECIFICATIONS.md §6.1): a plain server-rendered form
// posting to a Server Action, so it works with scripting disabled.
export function AppearanceForm({ current }: { current: ThemePreference }) {
  return (
    <form action={setTheme} className="grid gap-4">
      <fieldset className="grid gap-2">
        <legend className="sr-only">Theme</legend>
        {CHOICES.map((choice) => (
          <SheetOptionRow
            key={choice.value}
            type="radio"
            name="theme"
            value={choice.value}
            defaultChecked={choice.value === current}
            state={choice.value === current ? "selected" : "idle"}
          >
            <span className="font-mono text-sm tracking-wider uppercase">
              {choice.label}
            </span>
            <span className="text-muted-foreground text-xs">{choice.hint}</span>
          </SheetOptionRow>
        ))}
      </fieldset>
      <div>
        <Button type="submit">Apply theme</Button>
      </div>
    </form>
  );
}
