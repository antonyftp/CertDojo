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
