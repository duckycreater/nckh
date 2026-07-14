# Contributing to BMO Robot

Thanks for your interest in making BMO Robot better. This document
covers the workflow, the gates we enforce, and the labels that map to
the four-layer "ISEF-grade overhaul" plan in
`/docs/research/RESEARCH_PROPOSAL.md`.

## Branching

We use a **trunk-based** workflow on `master`:

| Branch    | Purpose                                                   |
| --------- | --------------------------------------------------------- |
| `master`  | always-deployable, CI must pass                           |
| `feat/*`  | new feature branches — squash-merged into master          |
| `fix/*`   | bug fixes — squash-merged into master                     |
| `docs/*`  | docs/ADRs/README changes                                  |
| `research/*` | experiments, dataset work, IRB pre-registration work  |

Cut a branch from `master`, name it `feat/<slug>`, push, and open a
PR against `master`. We do **not** maintain a long-running `develop`
branch. Hot-fixes go straight to `master` after review.

## Commit messages

```
<type>(<scope>): <subject>

<body — what and why, not what>

Co-Authored-By: Claude <noreply@anthropic.com>
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`.

The subject is imperative-mood ("add", not "added"); the body
explains the why, references issue IDs / ADR numbers, and lists any
follow-up work that intentionally lands as a separate PR.

## Quality gates (all must pass on `master`)

1. `npm run lint` — ESLint flat config + Prettier check.
2. `npm run typecheck` — `tsc --noEmit` under `strict: true`.
3. `npm run test:node` — `tsx --test tests/server` (Node native).
4. `npm run test` — Vitest unit + integration suite.
5. `npm run build` — Vite SPA + esbuild server bundle.
6. `node scripts/smoke.mjs` — boots `dist/server.cjs`, hits
   `/api/health`, `/api/admin/stats`, `/api/models/waste-classifier`,
   `/api/models/does-not-exist` (expects 404 JSON), and a brand-new
   `/api/<unknown>` (expects 404 JSON with `{error,code,path}`).
7. `node scripts/check-i18n.cjs` — eight-locale parity check.

All seven run in CI on every PR (see `.github/workflows/ci.yml`).

## Layer labels

The four-layer overhaul plan uses stable labels for PRs:

| Label            | Scope                                                          |
| ---------------- | -------------------------------------------------------------- |
| `layer:1-ui`     | UI/UX polish — i18n, a11y, PWA, bundle                         |
| `layer:2-backend`| Auth, secrets, rate-limit, CSPRNG, SQL, federated OOM         |
| `layer:3-research`| Honest canonical numbers, DP math, real stats, threats        |
| `layer:4-ops`    | Secrets, lint, CI, LICENSE, README, smoke, branching          |

A PR that touches more than one layer must list every label in its
description.

## Adding a translation

1. Add the key + Vietnamese translation to `src/locales/vi.json`.
2. Run `npm run codegen:i18n` — this regenerates
   `src/i18n-keys.ts` and the seven other locales with the new key
   stubbed as the English fallback.
3. Translate the other seven locales in the same PR. We do **not**
   accept PRs that ship only `vi.json` + `en.json`; the eight-locale
   parity guard will reject the build.

## Adding a server route

1. Write the route in `server/routes/<name>.ts` (or inline in
   `bootstrap.ts` if it's < 80 lines).
2. **State-mutating routes must mount `requireAuth` first.** The
   user identity flows from the validated token via
   `getRequestNick(req)`, never from `req.body.nickname`.
3. Add a test under `tests/server/<name>.spec.ts` using
   `node:test` + `assert/strict`. We do not mount Express; we test
   the functions directly.
4. If the route returns new error codes, add them to
   `server/services/errorMessages.ts` for **all eight locales**.
5. Update `docs/api/` (the auto-generated typedoc output) by running
   `npm run docs:typedoc`.

## Security model

Read `SECURITY.md`. If your PR changes an auth boundary, the
threat model document must be updated in the same PR.

## License

By contributing you agree that your work will be licensed under
the project's MIT license (see `LICENSE`). The dataset is licensed
separately under CC-BY-4.0 (see `DATASET_LICENSE.md`).

## Contact

Research questions → r&d team via the ISEF paperwork channel.
Operational questions → open a GitHub Discussion.
