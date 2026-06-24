# Plan

Introduce Vitest 4 as the project's test framework.

## Goal

Replace the hand-rolled `node:assert` test scripts (run as a serial
`node A && node B && ...` chain) with a real test runner: Vitest 4.
Gain parallel/isolated runs, watch mode, filtering, coverage, and the
ability to test React components — which the current approach cannot do.

## Scope

- Add Vitest 4 and a `vitest.config` that inherits `vite.config.js`
  (aliases/plugins) so there is no config duplication.
- Default test environment `node`; opt into `happy-dom` only for
  component test files.
- Migrate the existing `tests/check_*.mjs` (8 files) so Vitest discovers
  and reports them per-test. `node:assert/strict` keeps working under
  Vitest, so changes are minimal (wrap bare top-level asserts in
  `test(...)`; reuse the local `test()` helpers where they exist).
- Split build-dependent tests from pure unit tests:
  - Pure unit (no build): `check_core_helpers`, `check_content_loader`,
    `check_frontmatter`, `check_generate_metadata`, `check_metadata_quality`,
    `check_metadata_schema`, `check_metadata_edges`, `check_markdown_rendering`.
  - Post-build integration (`dist/`): `check_pagefind_search`,
    `check_prerendered_routes`.
- Add `@testing-library/react` + `@testing-library/jest-dom` + `happy-dom`
  and 1-2 React component smoke tests to establish the component-testing
  base.
- Add `@vitest/coverage-v8` for coverage measurement (no CI threshold gate).
- Wire `verification.toml` phases to Vitest:
  - `test_unit` -> `vitest run` (pure unit, no build) — faster.
  - `test_integration` (currently disabled) -> enable; run the two
    `dist/`-dependent specs after `npm run build`.
  - `test_component` -> the React component specs (happy-dom).
- Keep `.pre-commit-config.yaml` and `.github/workflows/ci.yml` aligned
  with the updated verification phases.
- Update `.project/` docs to reflect the new test commands.

## Non-goals

- Adopting Vite+ (`vite-plus`). Its `vp test` is bundled Vitest, so it
  adds no testing capability; it is pre-1.0 (v0.2.x) and would pull in a
  global-CLI toolchain shift (Oxlint replacing ESLint, monorepo runner).
  Re-evaluate after Vite+ reaches a stable 1.0. Choosing Vitest now is
  forward-compatible: `vp test` runs the same config/specs later.
- Vitest Browser Mode (real-browser Playwright). happy-dom is enough at
  this site's scale; revisit only if a test needs real browser behavior.
- CI coverage thresholds / gates. Measure first.
- Rewriting assertions from `node:assert` to `expect()` wholesale. Only
  the minimal wrapping needed for discovery/reporting.
- The Python a11y test (`check_accessibility_static.py`) and Lighthouse —
  they stay as their own phases.

## Assumptions

- Vitest 4.1.x peer range is `vite@^6 || ^7 || ^8`; the installed
  Vite 8.0.16 is supported (verified via `npm view`).
- The existing `node:assert/strict` specs run unchanged under Vitest.
- happy-dom covers the component tests we add (RTL user-facing queries).
- `node ci` runs build already, so integration specs can reuse `dist/`.

## Steps

1. Branch/worktree: `introduce-vitest` off `main` (done).
2. Add devDependencies: `vitest`, `@vitest/coverage-v8`,
   `@testing-library/react`, `@testing-library/jest-dom`, `happy-dom`.
3. Create `vitest.config.ts` (or `.js`) merging `vite.config.js`:
   - `test.environment = 'node'` default.
   - `test.include` for the migrated specs and new `*.test.{js,jsx,mjs}`.
   - projects/workspace or include-globs to separate unit vs integration
     vs component, OR per-file `// @vitest-environment happy-dom`.
   - coverage provider `v8`, report-only.
4. Migrate `tests/check_*.mjs` for discovery/reporting (minimal edits).
5. Add a `happy-dom` setup file (jest-dom matchers) and 1-2 React
   component smoke tests (e.g. a `pages.jsx`/`components.jsx` render).
6. Update `package.json` scripts (`test`, `test:watch`, `coverage`).
7. Update `.project/verification.toml`: `test_unit`, `test_integration`,
   `test_component` phases to the Vitest commands; drop the serial chain.
8. Update `.pre-commit-config.yaml` and `.github/workflows/ci.yml` to
   match the new phases.
9. Update `.project/` docs (commands/workflow/structure).
10. Add a decision record under `.decisions/` (Vitest over Jest/Vite+).

## Verification

- `npx vitest run` green locally (all migrated + new specs).
- `python3 scripts/verify.py` (full local mode) green: lint, typecheck,
  frontmatter, metadata, unit, integration, component, a11y, build.
- `python3 scripts/verify.py --mode ci` green (mirrors CI).
- `npx vitest run --coverage` produces a coverage report.
- Confirm a deliberately failing assert is reported per-test (not a
  whole-file abort) to prove the runner replaced the serial chain.
- actionlint passes on the edited `ci.yml`.

## Open Issues

- Config language: `vitest.config.ts` vs `.js` (repo source is JS/JSX;
  pick `.ts` only if it integrates cleanly with `tsc --noEmit`).
- Whether to model unit/integration/component as Vitest `projects`
  (one config, named projects) vs separate include-globs — decide during
  step 3 based on which keeps `verify.py` phases clean.
- Exact component(s) to smoke-test first (pick the most stable,
  low-dependency render to avoid brittle first tests).
