# Plan

## Goal

Introduce a code formatter to the repository and wire it into the existing verification
pipeline (`scripts/verify.py`, pre-commit, CI). Deliverable: a PR.

## Scope

- Add Biome as a formatter-only tool (`@biomejs/biome`, version-pinned) with `biome.json`.
- `npm run format` (apply) and `npm run format:check` (non-mutating, `biome ci
  --no-linter-check .`).
- Enable `[phases.format]` in `.project/verification.toml` (`run_standard`, `run_in_ci`).
- One-time repo-wide reformat of `*.js`, `*.jsx`, `*.mjs`, `*.css`, `*.json`.
- Documentation: `.decisions/formatter-biome.md`, `.project/README.md`,
  `.project/conventions.md`.

## Non-goals

- Replacing ESLint or enabling Biome's linter (ESLint keeps React Compiler / hooks lint).
- Formatting TOML / Markdown content.

## Assumptions

- ESLint config has no stylistic rules, so the formatter is conflict-free.
- `verify.py` `DEFAULT_ORDER` already includes `format`; pre-commit and CI call `verify.py`,
  so `.pre-commit-config.yaml` and `ci.yml` need no edits.

## Steps

1. `npm install -D --save-exact @biomejs/biome`.
2. Add `biome.json` (formatter on, linter off, assist off, JS double quotes, 2-space indent,
   lineWidth 100; respect `.gitignore`, exclude `.tmp`, `package-lock.json`, `*.md`).
3. Add `format` / `format:check` npm scripts.
4. Enable `[phases.format]` in `verification.toml`.
5. `npm run format` (one-time reformat).
6. Add decision + project docs.

## Verification

- `npm run format:check` → exit 0.
- `python3 scripts/verify.py --mode standard` and `--mode ci` → pass.
- `npm run lint`, `npm run typecheck`, `npm run test` → no regression.
- `git diff` review: formatting-only changes (no logic).

## Open Issues

- Future: revisit consolidating lint into Biome once React Compiler rules are covered.
