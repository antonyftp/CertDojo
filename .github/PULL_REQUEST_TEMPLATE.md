<!-- Thanks for contributing to CertDojo. Delete the section that doesn't apply. -->

## What this changes

<!-- One or two sentences. -->

---

### If this adds or edits a question bank

- [ ] One certification (or one coherent batch of questions) in this PR
- [ ] `pnpm validate-content` passes locally
- [ ] Questions are **original** — not copied from an exam dump
- [ ] Sources listed below so reviewers can spot-check accuracy
- [ ] `meta.json` domain weights reflect the official exam guide

**Sources**:

### If this changes code

- [ ] `pnpm lint`
- [ ] `pnpm format:check`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm test:e2e`
- [ ] Schema changes mirrored in **both** `schema-sqlite.ts` and
      `schema-postgres.ts`, with `pnpm db:generate` re-run
- [ ] No new module reads `POSTGRES_URL` / `DATABASE_URL` / `SQLITE_PATH` —
      mode detection stays in `src/db/client.ts` only

---

By contributing you agree your contribution is licensed under the project's
[MIT license](../LICENSE).
