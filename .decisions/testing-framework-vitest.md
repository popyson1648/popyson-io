# Decision

## Title

Adopt Vitest as the test framework

## Date

2026-06-24

## Status

Accepted

## Decision

Use [Vitest](https://vitest.dev/) 4 as the test runner. Tests live under `tests/`
as Vitest specs and are split into three projects defined in `vitest.config.js`:

- `unit` — `tests/**/*.test.mjs` (excluding integration), node env, no build.
- `integration` — `tests/**/*.integration.test.mjs`, node env, runs after the build.
- `component` — `tests/**/*.test.jsx`, happy-dom env, React Testing Library.

`vitest.config.js` reuses `vite.config.js` via `mergeConfig` + per-project
`extends: true`, so test transforms match the build. v8 coverage is configured
for visibility only (no CI threshold gate). `scripts/verify.py` runs each project
as the `test_unit`, `test_integration`, and `test_component` phases.

## Context

Tests were hand-rolled `node:assert` scripts run as one serial
`node A && node B && ...` chain in the `test_unit` phase. That had no test
runner: no isolation, parallelism, filtering, watch mode, coverage, or per-test
reporting, and the first failing assert aborted the whole chain. React
components had no tests because the bespoke approach could not render them.

The project is Vite 8 + React 19, ESM-first, with `tsc` for type-checking and
ESLint for linting.

## Alternatives

- **Jest** — needs an ESM/Vite compatibility layer and a second config to mirror
  Vite's aliases/plugins; weaker fit for an ESM + Vite codebase.
- **Stay on `node:assert` scripts** — no runner ecosystem; component testing,
  coverage, and per-test reporting stay out of reach.
- **Vite+ (`vite-plus`)** — its `vp test` is bundled Vitest, so it adds no
  testing capability, and it is pre-1.0 (v0.2.x) and would impose a global-CLI
  toolchain shift (Oxlint replacing ESLint, monorepo runner). Deferred; choosing
  Vitest now is forward-compatible because `vp test` runs the same config/specs.
- **Vitest Browser Mode (real browser via Playwright)** — unneeded at this
  site's scale; happy-dom is enough. Revisit if a test needs real browser
  behavior.

## Reason

Vitest is the current best-practice runner for Vite + React projects: it shares
`vite.config.js` (no duplicate config), handles ESM/JSX/TS natively, and unlocks
React component tests, coverage, watch mode, and per-test reporting. The specs
were rewritten in idiomatic Vitest style (`describe`/`test`, the `expect` API,
`test.each` for table-driven cases, `beforeAll`/`afterAll` for fixtures) so each
case reports independently rather than aborting a serial chain on the first
failure.

## Consequences

- New dev dependencies: `vitest`, `@vitest/coverage-v8`, `@testing-library/react`,
  `@testing-library/jest-dom`, `@testing-library/user-event`, `happy-dom`.
- Test files renamed to `*.test.mjs` / `*.integration.test.mjs` / `*.test.jsx`
  and converted from `node:assert` scripts to the `expect` API.
- The separate `frontmatter` and `metadata_quality` verification phases are
  folded into the `unit` project (`test_unit`).
- `package.json` gains `test`, `test:watch`, `test:unit`, `test:component`,
  `test:integration`, and `coverage` scripts.
- `.pre-commit-config.yaml` and `.github/workflows/ci.yml` are unchanged: both
  drive `scripts/verify.py`, which is config-driven from `.project/verification.toml`.

## Revisit Conditions

- A test needs real browser fidelity → enable Vitest Browser Mode.
- Vite+ reaches a stable 1.0 and the toolchain consolidation (Oxlint, monorepo
  runner) becomes worthwhile → re-evaluate running tests through `vp test`.
- Coverage stabilizes enough to enforce a minimum threshold in CI.
