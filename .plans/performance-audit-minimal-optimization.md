# Plan

## Goal

Audit this Vite + React site for performance issues and apply only small, evidence-backed optimizations that preserve existing behavior.

## Scope

- Inspect the current package manager, scripts, framework/runtime, entry points, and performance-sensitive code paths.
- Use official/current documentation for Vite, React, and TanStack Table where relevant.
- Establish project-specific evaluation axes before changing source code.
- Run existing verification commands and lightweight measurements available from existing dependencies/scripts.
- Classify findings as `fix`, `defer`, or `ignore`.
- Implement only `fix` items that are small, low-risk, and verifiable.

## Non-goals

- No new features.
- No large UI/UX changes.
- No framework, build tool, routing, or state management migration.
- No major dependency upgrades.
- No new heavy profiling or benchmark dependency.
- No broad memoization or readability-reducing micro-optimizations.

## Assumptions

- The app is a mostly static/personal site built with Vite and React.
- `npm` is the package manager because `package-lock.json` is present.
- Existing behavior is defined by the current source, build/prerender output, static accessibility check, and Lighthouse setup.
- Existing scripts are preferred for verification: `npm run lint`, `npm run build`, `python3 scripts/check_accessibility_static.py`, and `npm run lighthouse` if the environment supports it.

## Steps

1. Baseline review
   - Confirm package/runtime/tooling from `package.json`, `vite.config.js`, `scripts/verify.py`, and project docs.
   - Identify entry points and heavy paths: blog list/search, article rendering/code highlighting, Vite plugins, prerender scripts, static assets.

2. Current best-practice check
   - Use official docs for:
     - Vite performance guidance.
     - React memoization/rendering guidance.
     - TanStack Table stable data/columns guidance.
   - Only apply guidance that matches the current versions and code shape.

3. Evaluation axes
   - Startup/dev server work.
   - Build/prerender time.
   - Runtime/rendering work.
   - Search/filter/sort computation.
   - Bundle size and lazy-loaded dependencies.
   - Network/static asset loading.
   - File I/O in Vite plugins and scripts.
   - Memory/dependency impact.
   - Developer experience and maintainability.

4. Baseline measurement
   - Run existing relevant commands where practical:
     - `npm run lint`
     - `npm run build`
     - `python3 scripts/check_accessibility_static.py`
     - `python3 scripts/verify.py --mode edit`
   - Inspect build output sizes from `dist/assets`.
   - Use no new measurement dependency.

5. Candidate classification
   - `fix`: small, behavior-preserving, documented or measurable, verifiable.
   - `defer`: likely useful but broader, needs extra measurement, or may affect UX/spec.
   - `ignore`: low impact or already aligned with best practice.

6. Implementation
   - Apply only approved `fix` changes.
   - Keep changes localized to source/config files directly involved.
   - Avoid package/lockfile changes unless a clearly unused dependency removal is both safe and verified.

7. Verification and final review
   - Re-run the repository's relevant verification commands after changes.
   - Review the final diff for behavior changes, UI changes, over-memoization, unnecessary package/lockfile churn, and readability regressions.

## Verification

Planned commands:

- `npm run lint`
- `npm run build`
- `python3 scripts/check_accessibility_static.py`
- `python3 scripts/verify.py --mode edit`

Optional, if the local environment supports it without new dependencies or broad setup:

- `npm run lighthouse`
- lightweight file size inspection under `dist/assets`

## Open Issues

- Lighthouse may require a browser/server environment; if it fails for environment reasons, record that rather than adding tooling.
- Some candidates may require real browser profiling to prove impact; those should be reported as `defer` or `monitor`, not implemented speculatively.
