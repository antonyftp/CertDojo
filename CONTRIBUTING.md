# Contributing to CertDojo

Thanks for helping! The most valuable contribution is **content**: new
certifications and new practice questions. You don't need to touch any
application code for that — everything lives in JSON files under `/content`.

Code contributions (features, fixes) are welcome too; see
[Working on the code](#working-on-the-code) at the end.

## Ground rules for questions

- **Write original questions.** Never copy questions from real exams or from
  commercial question banks ("dumps") — that violates copyright and the
  providers' NDAs, and such PRs will be rejected. Questions should test the
  same *topics* as the official exam guide, in your own words.
- Every question needs a clear **explanation**: someone who answered wrong
  should understand why the right answer is right.
- Keep the tone factual and vendor-neutral; no marketing language.

## Adding a certification

### 1. Directory layout

Each certification is one directory with exactly two files:

```
content/
  <provider>/            e.g. aws, cncf, hashicorp, microsoft
    <slug>/              e.g. clf-c02, kcna, terraform-associate
      meta.json          the certification metadata
      questions.json     the question bank
```

- `<provider>` and `<slug>` are **kebab-case** (lowercase letters, digits,
  hyphens).
- The slug must be **unique across all providers** — it's the key user
  progress is stored against.
- The `slug` and `provider` fields inside `meta.json` must match the
  directory names exactly.

### 2. `meta.json`

```json
{
  "slug": "clf-c02",
  "provider": "aws",
  "name": "AWS Certified Cloud Practitioner",
  "examCode": "CLF-C02",
  "description": "Foundational understanding of AWS Cloud concepts, services, and terminology.",
  "officialUrl": "https://aws.amazon.com/certification/certified-cloud-practitioner/",
  "domains": [
    { "id": "cloud-concepts", "name": "Cloud Concepts", "weight": 24 },
    { "id": "security-and-compliance", "name": "Security and Compliance", "weight": 30 },
    { "id": "cloud-technology-and-services", "name": "Cloud Technology and Services", "weight": 34 },
    { "id": "billing-pricing-and-support", "name": "Billing, Pricing, and Support", "weight": 12 }
  ]
}
```

| Field         | Rules                                                                  |
| ------------- | ---------------------------------------------------------------------- |
| `slug`        | kebab-case, matches the directory name, unique across all providers    |
| `provider`    | kebab-case, matches the parent directory name                          |
| `name`        | full official certification name                                       |
| `examCode`    | official exam code (e.g. `CLF-C02`)                                    |
| `description` | one or two sentences on what the certification covers                  |
| `officialUrl` | link to the provider's official certification page (valid URL)         |
| `domains`     | the official exam blueprint: at least one domain, unique kebab-case `id`s, integer `weight` 1–100 (the blueprint's percentage) |

### 3. `questions.json`

A JSON array of questions:

```json
[
  {
    "id": "clf-0001",
    "domainId": "cloud-concepts",
    "question": "Which AWS service provides resizable compute capacity in the cloud?",
    "multipleAnswers": false,
    "options": [
      { "id": "a", "text": "Amazon EC2" },
      { "id": "b", "text": "Amazon S3" },
      { "id": "c", "text": "Amazon Route 53" },
      { "id": "d", "text": "AWS IAM" }
    ],
    "correctOptionIds": ["a"],
    "explanation": "Amazon EC2 (Elastic Compute Cloud) provides resizable virtual servers. S3 is object storage, Route 53 is DNS, and IAM manages identities and permissions."
  }
]
```

| Field              | Rules                                                              |
| ------------------ | ------------------------------------------------------------------ |
| `id`               | non-empty, unique within the file (convention: `<slug prefix>-0001`, zero-padded) |
| `domainId`         | must be one of the `domains[].id` values declared in `meta.json`   |
| `question`         | the question text; for multiple answers, say how many to pick (e.g. "(Choose TWO)") |
| `multipleAnswers`  | `false` → exactly **one** entry in `correctOptionIds`; `true` → **two or more** |
| `options`          | at least 2, each with a unique `id` and non-empty `text`           |
| `correctOptionIds` | every entry must match an option `id`, no duplicates               |
| `explanation`      | non-empty; explains the correct answer (and ideally why the others are wrong) |

Unknown or misspelled fields are rejected — the schemas are strict on purpose
so typos fail loudly instead of being silently dropped.

For a new certification, aim for **at least 15–20 questions** covering every
domain, mixing single- and multiple-answer questions.

### 4. Validate before opening a PR

Validation is mandatory — CI runs it on every pull request and blocks
merging if any file is invalid:

```bash
corepack enable pnpm
pnpm install
pnpm validate-content
```

The script checks every `/content` directory against the Zod schemas in
`src/lib/content/schema.ts` (the same ones the app uses at runtime) and
prints exactly which file and field is wrong.

To see your content in the app: `pnpm dev`, then track the new certification
from the dashboard ("Track certification").

### 5. Open the pull request

- One certification (or one coherent batch of questions for an existing
  certification) per PR — easier to review.
- In the PR description, mention your sources (official exam guide,
  documentation pages) so reviewers can spot-check accuracy.
- By contributing you agree your contribution is licensed under the
  project's [MIT license](LICENSE).

## Working on the code

```bash
corepack enable pnpm
pnpm install
pnpm dev                # app on http://localhost:3000 (SQLite, data/certdojo.db)
```

Before pushing:

```bash
pnpm lint
pnpm format:check       # or pnpm format to fix
pnpm typecheck
pnpm test               # Vitest unit/integration tests
pnpm test:watch         # same, in watch mode while you iterate
pnpm test:e2e           # Playwright (once: pnpm exec playwright install --with-deps chromium)
pnpm validate-content
```

CI (`.github/workflows/ci.yml`) runs all of the above on every PR.

Architecture notes for contributors live in [`CLAUDE.md`](CLAUDE.md) and the
full product spec in [`SPECIFICATIONS.md`](SPECIFICATIONS.md) — see §4.4 there
for the directory layout as actually built (application code lives under
`src/`). Two rules that trip people up:

- Database mode detection (SQLite vs Postgres) lives **only** in
  `src/db/client.ts` — no other module may read those env vars or reference a
  dialect.
- Any schema change must be mirrored in both `src/db/schema-sqlite.ts` and
  `src/db/schema-postgres.ts`, then `pnpm db:generate` regenerates the
  migrations for both dialects.
