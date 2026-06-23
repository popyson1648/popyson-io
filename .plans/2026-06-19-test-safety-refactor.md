# Plan

## Goal

Add broad characterization coverage, then perform a serious but behavior-preserving refactor of the content, metadata, routing, and build-time rendering boundaries.

The purpose is to make future changes safer without changing public behavior.

## Scope

- JavaScript Vite/React source and existing Node-based verification scripts.
- Build-time content loading, Markdown rendering, metadata validation/generation, route metadata, prerender support, and small routing helpers.
- Existing `node:assert/strict` script-based tests, extended with focused characterization suites.
- Production-code refactors after the tests pass, with changes kept behind existing module exports and CLI commands.

## Non-goals

- No new feature work.
- No changes to public URLs, UI text, CLI output, config schemas, generated content meaning, or public component props.
- No new test framework unless the current script style blocks meaningful coverage.
- No broad formatting or directory reorganization.
- No dependency additions unless a concrete testing or parsing gap is found and documented first.
- No TypeScript rewrite. Add static checking for the current JavaScript codebase without changing runtime output.

## Assumptions

- `package-lock.json` makes npm the package manager.
- The current test style is Node ESM scripts using `node:assert/strict`, run through `scripts/verify.py`.
- Typecheck is currently disabled because this is a JavaScript project without TypeScript config.
- A TypeScript-based JavaScript checker is an acceptable minimal dev dependency if it is used only for `allowJs` / `checkJs` validation.
- The untracked `.claude/` directory is unrelated and will not be touched.
- Work is on `dev-test-safety-refactor`, branched from local `dev`, which tracks `origin/main`.

## Steps

1. Expand characterization tests before production refactors.
   - Add pure-function tests for `src/headingSlug.js`, `src/dateLabel.js`, and `src/meta.js`.
   - Add routing parser tests by extracting the path/search parsing from `src/app.jsx` into a pure module.
   - Add Markdown rendering tests for duplicate headings, URL safety, callout title behavior, code-block toolbar output, and plain-text extraction.
   - Add metadata tests for schema errors, quality rules, pending-reason reporting, generated metadata merging, and error cases around unusable provider output.
   - Add content-loader tests for related-post ordering, heading extraction as observed through loaded article bodies, date/thumbnail/summary resolution where feasible.
2. Run the expanded tests and existing `test_unit` before changing behavior-adjacent production code.
3. Refactor content and rendering boundaries.
   - Move duplicate frontmatter parsing helpers into a shared script module, preserving exact error text where it is externally observed by checks.
   - Split metadata generation into smaller pure helpers: config resolution, pending-state detection, provider request construction, metadata merge/evaluation, and file iteration.
   - Split Markdown rendering helpers into clearly named URL-safety, callout, heading-id, and code-toolbar sections without changing emitted HTML.
   - Move app route parsing into `src/routing.js`, keeping `App` as the History/DOM integration layer.
   - Simplify route metadata generation in `src/meta.js` by separating route catalog construction from locale expansion.
4. Refactor verification wiring only as needed.
   - Keep the existing `node scripts/check_*.mjs` style.
   - Add new check scripts to `.project/verification.toml` under `test_unit`.
   - Add a real `typecheck` phase using TypeScript `allowJs` / `checkJs`, excluding generated output and temporary files.
   - Keep `.pre-commit-config.yaml` and CI behavior aligned through `scripts/verify.py`.
5. Address typecheck warnings without hacks.
   - Prefer JSDoc types, narrow helpers, and clearer data shapes over suppressions.
   - Use suppressions only for a documented external-library mismatch that cannot be modeled cleanly.
   - Do not change public APIs, CLI output, URLs, UI text, or generated content semantics to satisfy the checker.
6. Run performance measurement.
   - Execute the existing `performance` verification phase, which builds the site and runs Lighthouse against the static output.
   - Inspect `.tmp/lhci/lhr.json` and the threshold warnings.
   - If the result points to a real regression or low-score issue in this branch, make a behavior-preserving fix and rerun the measurement.
   - If the result is environment-bound, record the evidence and avoid masking it with configuration hacks.
7. Re-run focused tests after each meaningful refactor group.
8. Re-run full local verification at the end.
9. Review final diff for unrelated churn, generated-file noise, and accidental public-output changes.

## Verification

- `npm ci`
- `npm run lint`
- `python3 scripts/verify.py --only test_unit`
- `python3 scripts/verify.py --only typecheck`
- `npm run build`
- `python3 scripts/verify.py --only frontmatter metadata_generate_check metadata_quality accessibility`
- `python3 scripts/verify.py --only performance`
- Targeted `node scripts/check_*.mjs` commands for each newly added or edited test script.
- `git diff --stat` and manual review of changed source/config/test files.

## Open Issues

- Baseline `npm run build` exits successfully but prints a Vite SSR WebSocket `EPERM 0.0.0.0:24678` warning in this sandbox.
- Full `actionlint` and `performance` phases are listed by verification config but were not run during the initial baseline.
- Larger refactoring will be staged behind tests. If any area lacks a stable public observation point, prefer adding a narrow exported helper over testing private implementation details.
