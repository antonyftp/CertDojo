# CertPrep — Design plan (SPECIFICATIONS.md §6.2)

Written before Step 4 UI implementation; applies to every screen after it
(quiz, certification detail, settings). Any new screen must follow this plan
or amend it here first.

## Concept

CertPrep's identity is mined from the artifacts of certification life, not
from SaaS dashboard conventions: the **OMR answer sheet** (the scantron bubble
form filled in with a No. 2 pencil), the **score report** handed out at the
test center (PASS/FAIL bands, domain-by-domain breakdown), and the **exam
blueprint** every provider publishes (weighted domains, e.g. "Security and
Compliance — 30%").

## Palette

| Token | Hex (light) | Hex (dark) | Justification |
|---|---|---|---|
| `sheet` | `#F5F7FA` | `#14171D` | Answer-sheet paper stock: a cool, machine-readable white with a faint blue cast (deliberately not the warm-cream default). Dark mode is the same graphite-blue family, not neutral black. |
| `graphite` | `#232830` | `#E8EBF0` | No. 2 pencil graphite — the soft blue-black of a filled bubble. Body text. |
| `scantron` | `#2F5EA8` | `#8AAEE8` | The drop-out blue ink OMR forms are printed in, deepened for AA contrast. Reserved for **interactive** elements only (buttons, links, focus rings) so it never competes with progress colors. |
| `verified` | `#1E7A4E` | `#41A97A` | Score-report **PASS** green: correct answers and mastery fills. |
| `seal` | `#A87B1F` | `#D3A945` | Credential-seal gold (the embossed foil on a paper certificate): the *Exam ready* status and fully mastered domains. Used sparingly — it must feel earned. |
| `flag` | `#B3372B` | `#E0604F` | Score-report **FAIL** red: incorrect answers, destructive actions, validation errors. |

Mapping to shadcn tokens: `primary` = scantron, `destructive` = flag, plus two
extra semantic tokens `--mastery` (verified) and `--seal` exposed as Tailwind
colors. Progress is never blue: blue means "you can click this", green/gold
mean "you have earned this".

## Typography

Both faces ship as versioned npm packages (`@fontsource/*`) — self-hosted,
zero network dependency (spec §7 offline constraint).

- **IBM Plex Mono** — the *data voice*, used with restraint: exam codes
  (`CLF-C02`), counters (`27/65`), percentages, domain weights, status chips,
  and small uppercase kicker labels. Certifications are exam-code-driven and
  their audience lives in terminals; the mono face is the typographic
  equivalent of the exam code itself.
- **IBM Plex Sans** — the *reading voice*: question stems, option text,
  explanations, descriptions. Tall x-height and open apertures hold up in
  long-form MCQ text; headings use its semibold weights.

Chosen as a matched superfamily (shared skeleton, designed for enterprise IT
context) so the two voices contrast in role but never clash.

## Layout concept

Quiet, single-column, productivity-first. A slim top bar carries the CertPrep
wordmark (mono) and context actions; content sits in a centered `max-w-5xl`
column. Cards are the only elevated surface; everything else sits flat on the
sheet background. Density is moderate — closer to a revision tool than a
marketing site (spec §6.1).

### Dashboard

```
┌────────────────────────────────────────────────────────────────┐
│ CERTPREP///                          [+ Track certification]   │  top bar
├────────────────────────────────────────────────────────────────┤
│ Welcome back, Ada — Cloud Engineer                             │
│ 2 CERTIFICATIONS TRACKED                                       │  mono kicker
│                                                                │
│ ┌───────────────────────────┐  ┌───────────────────────────┐   │
│ │ AWS · CLF-C02   [IN PROG.]│  │ CNCF · KCNA  [NOT STARTED]│   │
│ │ AWS Certified Cloud       │  │ Kubernetes and Cloud      │   │
│ │ Practitioner              │  │ Native Associate          │   │
│ │                           │  │                           │   │
│ │ MASTERY 42%    27/65 corr.│  │ MASTERY 0%      0/12 corr.│   │
│ │ █████████░░░░░░░░░░░░░░░  │  │ ░░░░░░░░░░░░░░░░░░░░░░░░  │   │
│ │                           │  │                           │   │
│ │ EXAM BLUEPRINT            │  │ EXAM BLUEPRINT            │   │
│ │ ▓▓▓░░│▓▓░░░░│▓▓▓▓░░░│▓░   │  │ ░░░░░░│░░░│░░│░│░         │   │
│ │ 24%   30%    34%     12%  │  │ 46%    22% 16% 8% 8%      │   │
│ └───────────────────────────┘  └───────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

### Quiz (Step 5, sketched now for consistency)

```
┌────────────────────────────────────────────────────────────────┐
│ CERTPREP///          CLF-C02 · QUESTION 4/10 · SECURITY        │
│ ████████░░░░░░░░░░░░  (session progress, scantron blue)        │
├────────────────────────────────────────────────────────────────┤
│ Which AWS service is used to manage identities and access?     │
│                                                                │
│  (a) AWS IAM                    ← option rows echo bubble-     │
│  (b) AWS CloudTrail               sheet lettering (mono ids)   │
│  (c) AWS Config                                                │
│  (d) AWS Shield                                                │
│                                                                │
│                              [Submit answer]                   │
│  — after submit: row turns verified-green / flag-red,          │
│    explanation panel unfolds below —                           │
└────────────────────────────────────────────────────────────────┘
```

## Signature element — the Exam Blueprint strip

Every real certification is officially defined by weighted domains. The
blueprint strip is a **1:1 miniature of the official exam blueprint**: one
horizontal strip per certification, divided into segments whose *width equals
the official domain weight*, each segment *filling* with that domain's
mastery (verified green, turning seal gold at the exam-ready threshold).
At a glance it answers the only question that matters while revising: *which
heavy domains am I weak in?* It appears on the dashboard card, will anchor
the certification detail view (Step 6), and no other decorative element in
the UI is allowed to compete with it.

## Critique (required by §6.2)

**"Is this the default answer for any similar dashboard app?"** — first
draft, and what changed:

1. *Default risk*: blue primary + white cards reads as generic SaaS.
   **Change**: blue is contractually limited to interactive controls; all
   progress/status color comes from the green/gold score-report pair, and the
   identity load is carried by the mono data-voice and the blueprint strip.
2. *Default risk*: a plain shadcn `Progress` bar per card is what any
   scaffold produces. **Change**: the single bar is kept (spec §5.2 requires
   it) but demoted; the blueprint strip is the memorable element, and it is
   structurally impossible to confuse with a generic progress bar because its
   segment widths encode the real exam weights.
3. *Default risk*: Inter/Geist system-default typography. **Change**: IBM
   Plex pair with explicit role separation, shipped offline via @fontsource.
4. Checked against the three banned defaults: no warm cream/serif/terracotta;
   dark mode is blue-graphite with four functional accents (not near-black +
   one acid accent); cards keep radius and soft borders (no broadsheet
   hairline layout).

**Kept deliberately generic**: card grid + centered column. A revision tool
should be spatially boring; the signature lives inside the cards, not in an
exotic layout.

---

## Step 5 amendment — quiz session screens

The quiz route (`/certifications/[slug]/quiz`) is one page with three states.
Palette, type roles, and the blue-is-interactive contract are unchanged; the
visual language extends the same exam artifacts: the session setup is the
**exam form** you fill in before starting, answering is **marking the answer
sheet**, and the end screen is the **score report**.

### State 1 — Session setup (the exam form)

```
┌────────────────────────────────────────────────────────────────┐
│ CERTPREP///                                 ← Back to dashboard│
├────────────────────────────────────────────────────────────────┤
│ AWS · CLF-C02                                     (mono kicker)│
│ Practice session                                               │
│                                                                │
│ ┌ ( ) ALL QUESTIONS ······················· 20 ┐               │
│ ┌ (•) NOT YET MASTERED ···················· 13 ┐               │
│ ┌ ( ) 10 RANDOM ··························· 10 ┐               │
│                                                                │
│                                              [Start session]   │
└────────────────────────────────────────────────────────────────┘
```

Batch choices are radio rows in the data voice (mono, counts right-aligned),
matching the dev plan's "all / not-yet-mastered / N random". A random size is
only offered when it is smaller than the bank; "not yet mastered" is disabled
with a note when nothing remains.

### State 2 — Question (marking the sheet)

Per the existing sketch, plus these decisions:

- **Bubble letters**: each option row leads with a mono bubble `(a)`, `(b)`…
  (display letters by position, independent of content option ids). Selecting
  fills the bubble solid graphite — literally penciling in the bubble.
- **Multi-answer questions** print the instruction real exams print: a mono
  kicker `SELECT 2 ANSWERS` (count = number of correct options — the same
  information "(Choose TWO)" reveals on a real exam). Submit stays disabled
  until exactly that many are selected; single-answer questions submit with
  one.
- **Grading is inline on the rows**, like a marked answer sheet — never a
  toast or banner. Correct options tint verified green with `✓`; a selected
  wrong option tints flag red with `✕`; unselected wrong options stay quiet.
  A mono verdict (`✓ CORRECT` / `✕ INCORRECT`) and the explanation unfold
  below in a left-ruled panel with an `EXPLANATION` kicker.
- The header carries `EXAM-CODE · QUESTION 4/10 · DOMAIN` in mono and the
  session progress bar in scantron blue (position in the session — this is
  navigation, not earned mastery, so blue is correct here).
- Answers are graded server-side; the client never receives
  `correctOptionIds`/`explanation` until after submitting — the app behaves
  like a proctored exam, not a flashcard with the answer on the back.

### State 3 — Session report (the score report)

```
│ SESSION REPORT                                    (mono kicker)│
│ 7/10 · 70%                            [IN PROGRESS-style band] │
│ 7 correct · 3 incorrect                                        │
│                          [Practice again] [Back to dashboard]  │
```

Big mono score, one status band (seal gold `EXAM-READY PACE` at ≥ 80%,
quiet neutral `KEEP PRACTICING` otherwise — reusing the dashboard's
threshold, not inventing a new scale), then two actions. No confetti, no
streaks (spec §2.5).

**Deliberately omitted**: a per-question timer. CertPrep is a revision tool,
not an exam simulator; a countdown would add anxiety without adding signal.

---

## Step 6 amendment — certification detail view

The detail route (`/certifications/[slug]`) is the **full score report** for
one certification — the page the test center hands you, expanded into a
revision tool. The dashboard card was the summary line; this page is the
domain-by-domain breakdown table that real score reports print below the
PASS/FAIL band. Palette, type roles, and the blue-is-interactive contract are
unchanged.

### Layout

```
┌────────────────────────────────────────────────────────────────┐
│ CERTPREP///                                        ← Dashboard │
├────────────────────────────────────────────────────────────────┤
│ AWS · CLF-C02                                    [IN PROGRESS] │
│ AWS Certified Cloud Practitioner                               │
│ Entry-level AWS certification validating…   Official guide ↗   │
│                                                                │
│ MASTERY 42% · 27/65 correct · 52/65 answered      (mono line)  │
│ ▓▓▓▓▓░░░│▓▓▓░░░░░░│▓▓▓▓▓▓░░░░░│▓░░       ← blueprint strip,    │
│ 24%      30%       34%        12%          enlarged, anchor    │
│                                                                │
│ DOMAIN BREAKDOWN                                 (mono kicker) │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ 01  Cloud Concepts             WEIGHT 24% │ [Practice →]   │ │
│ │     ██████████░░░░░░  63% · 10/16 mastered                 │ │
│ ├────────────────────────────────────────────────────────────┤ │
│ │ 02  Security and Compliance    WEIGHT 30% │ [Practice →]   │ │
│ │     ███░░░░░░░░░░░░░  20% · 4/20 mastered                  │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                    [Practice all questions →]  │
└────────────────────────────────────────────────────────────────┘
```

Decisions:

- **The blueprint strip is the anchor**, as promised when it was designed:
  same component as the dashboard card, rendered larger. The domain rows
  below are its legend expanded into a table — strip segment *n* and row *n*
  describe the same domain, so the page reads as one artifact, not two.
- **Domain rows are score-report table rows**, not a grid of stat cards: one
  ruled list, mono index (`01`, `02`… — exam guides number their domains),
  domain name in the reading voice, `WEIGHT n%` as a mono kicker, a mastery
  bar (verified green, seal gold at ≥ 80%) with `x/y mastered` in mono.
- **Per-domain practice** is the row's only interactive element: a scantron
  blue link to `/certifications/[slug]/quiz?domain=<id>`. The quiz setup
  screen shows the domain as a mono kicker (`DOMAIN · CLOUD CONCEPTS`) and
  its back links return to the detail page instead of the dashboard; batch
  choices count within the filtered bank only.
- A domain with zero questions in the bank shows `NO QUESTIONS YET` (mono,
  muted) instead of a practice link — content contributions may lag the
  official blueprint.
- The dashboard card's title links here, and the card footer gains a quiet
  `Details` outline button beside `Practice` — the primary action on the
  dashboard stays "start practicing".

### Critique (per §6.2)

*Default answer for a "detail page"*: a stats-card grid (one card per
domain, each with a donut chart), breadcrumbs, maybe tabs. What differs and
why:

1. **No donuts, no grid**: domains are rows in a single ruled table, because
   the real-world artifact being quoted — the score report — is a table. The
   only chart on the page is the blueprint strip the product is already
   recognized by.
2. **Weights stay structural**: the strip encodes weight as width; rows print
   it as a mono kicker. Nothing re-encodes weight as a second chart, keeping
   the strip's monopoly on decoration.
3. **Color contract holds**: mastery bars are green/gold (earned), the status
   chip reuses the dashboard vocabulary, and blue appears only on links and
   the practice buttons.
4. **No tabs/breadcrumbs**: two levels of navigation (dashboard ⇄ detail)
   don't justify them; a single `← Dashboard` mono link matches the quiz
   header's existing pattern.

### Critique (per §6.2)

*Default answer for a quiz UI*: Duolingo/Kahoot-style — centered floating
card, big colorful answer buttons, toast/banner feedback ("Correct! 🎉"),
progress dots, celebratory end screen. What differs here and why:

1. Feedback lands **on the option rows themselves** (a marked answer sheet),
   with the explanation as a ruled panel — no toasts, no emoji, no motion
   beyond the panel unfolding.
2. The bubble-letter fill ties selection to the OMR identity established on
   the dashboard; option rows read as a form, not as buttons.
3. The end screen is a score report with the same status-band vocabulary as
   the dashboard cards — the quiz and dashboard speak one language.
4. Blue/green/gold contract holds: session progress is blue (navigation),
   correctness is green/red (earned), the ≥80% band is the only gold.

---

## Step 7 amendment — settings (data export / import)

The settings route (`/settings`) is the **candidate records office**: the desk
at the test center where you request your transcript or hand over records
transferred from another program. Export is *requesting your transcript* (one
official file containing your profile and complete attempt history); import is
*transferring your records in* (the office validates the file before anything
is written). Palette, type roles, and the blue-is-interactive contract are
unchanged.

Unlike every other screen, `/settings` is reachable **before onboarding**:
its primary real-world use case is restoring a backup onto a fresh instance
(new machine, Local → Vercel migration), where no profile exists yet. The
onboarding page links to it quietly ("Moving from another machine?"), and on a
fresh instance the page simply shows the import section without the profile
card.

### Layout

```
┌────────────────────────────────────────────────────────────────┐
│ CERTPREP///                                        ← Dashboard │
├────────────────────────────────────────────────────────────────┤
│ SETTINGS                                          (mono kicker)│
│ Your data                                                      │
│                                                                │
│ ┌ CANDIDATE ────────────────────────────────────────────────┐  │
│ │ Ada Lovelace · Cloud Engineer                             │  │
│ │ ON RECORD SINCE 2026-08-12          (mono, muted)         │  │
│ └───────────────────────────────────────────────────────────┘  │
│ ┌ EXPORT ───────────────────────────────────────────────────┐  │
│ │ Download everything CertPrep stores about you — profile,  │  │
│ │ tracked certifications, question attempts — as one JSON   │  │
│ │ file.                                                     │  │
│ │                                        [Export my data ↓] │  │
│ └───────────────────────────────────────────────────────────┘  │
│ ┌ IMPORT ───────────────────────────────────────────────────┐  │
│ │ Restore a previously exported file. The file is validated │  │
│ │ first; matching records are overwritten, nothing is       │  │
│ │ duplicated.                                               │  │
│ │ [ choose file… ]                          [Import file ↑] │  │
│ │ ✓ RECORDS RESTORED — 1 profile · 2 certs · 57 attempts    │  │
│ └───────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

Decisions:

- **Three ruled cards, one column** (`max-w-xl` like onboarding — this is a
  form screen, not a data screen): candidate summary (read-only — the spec has
  no profile editing in V1), export, import. Mono kickers name each card in
  records-office vocabulary (`CANDIDATE`, `EXPORT`, `IMPORT`).
- **Export is a plain download link** styled as the primary button (scantron
  blue — it is interactive, not earned): a real `<a href>` to a route that
  serves the file with a dated filename (`certprep-backup-YYYY-MM-DD.json`).
  Works with JavaScript disabled; no spinner theater for a sub-second file.
- **Import feedback is inline mono, never a toast**, matching the quiz's
  grading language: a `✓ RECORDS RESTORED` line with imported counts on
  success, a flag-red `✕` line with the precise validation error on failure.
  The color contract bends one deliberate notch: the ✓ line uses `verified`
  green because a restored record *is* earned history returning home — it is
  the same data the green mastery bars are built from.
- **No "danger zone"**: import overwrites matching rows, so the import card
  says exactly that in its body copy instead of dressing the section in red
  borders. Red remains reserved for actual errors.

### Critique (per §6.2)

*Default answer for a settings page*: a sidebar or tab bar of categories
(Account / Appearance / Data / About), toggle switches, a red danger zone,
toast notifications. What differs and why:

1. **No tabs, no sidebar**: V1 settings holds exactly one concern — your
   data. One column of three ruled cards; navigation chrome for a single
   section would be scaffolding pretending to be product.
2. **Records-office framing instead of "backup/restore" dev vocabulary**:
   kickers and copy speak the exam-artifact language the rest of the app
   established (candidate, records, transcript), so the page reads as part of
   CertPrep rather than a generic admin panel.
3. **Inline mono status lines instead of toasts** — consistent with the
   answer-sheet grading pattern; the result stays on the page, attached to
   the thing it describes.
4. **Pre-onboarding reachability is a product decision, not a leak**: the
   records office is precisely where a transferring candidate goes first.
   Checked against the three banned defaults: still no cream/serif/
   terracotta, no acid-on-black, no broadsheet hairlines.
