# scripts/_archive — legacy one-off code generators

These scripts were used during the early i18n / locale-key migration to
inject new keys into the 10-locale JSON catalogs and bulk-update
`server/bootstrap.ts`. They are **one-shot**, **not idempotent**, and
**superseded by the canonical generator** (currently a planned
`scripts/codegen-i18n.cjs`).

Kept here so:

- The git history stays auditable.
- The next contributor can grep for older patterns when triaging
  duplicated key names.
- A future CI migration can rerun them against a snapshot if needed.

**Do not invoke any of these scripts against the current tree unless you
intend to overwrite the locale JSON files.** Use `npm run codegen:i18n`
(the consolidated generator that supersedes them) instead.

## Archived files

| File | Original purpose | Superseded by |
| ---- | ---------------- | ------------- |
| `apply-translations.cjs` | One-off Vietnamese / English / Japanese strings for 5 secondary locales | Direct edit + `check-i18n.cjs` guard |
| `inject-audit-namespace.cjs` | Injected the `audit.*` namespace into `vi.json` / `en.json` | `npm run codegen:i18n` |
| `inject-email-templates.cjs` | Wrote email subject + body keys into `server/locales/*.json` | Same |
| `inject-i18n-keys.cjs` | Bulk key injection across locale tree (version 1) | Same |
| `inject-i18n-keys-2.cjs` | Bulk key injection (version 2 with duplicate detection) | Same |
| `inject-server-keys.cjs` | Pushed server-side error keys into `server/locales/*.json` | Same |
| `refactor-bootstrap-errors.cjs` | Replaced hard-coded Vietnamese strings in `server/bootstrap.ts` with `getErrorMessage(…)` calls | Manual refactor + lint warning |
