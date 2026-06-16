# Plan

## Goal

Address the dependency review items that were deferred because their available fixes were not clearly low-risk: Vite, the Vite React plugin, and LHCI.

## Scope

- Re-check current npm audit and registry metadata for `vite`, `@vitejs/plugin-react`, and `@lhci/cli`.
- Confirm local and CI Node versions are compatible with any proposed update.
- Update only the packages whose security fix path is clear and verifiable with the existing repository checks.
- Keep runtime behavior, routing, prerendering, static accessibility checks, and Lighthouse verification unchanged.
- Preserve package manager and lockfile consistency.

## Non-goals

- No React 19 migration.
- No ESLint 10 or Shiki 4 migration.
- No replacement of Lighthouse CI with another performance tool in this task.
- No Vite config redesign beyond compatibility fixes required by the dependency update.
- No UI or content changes.

## Assumptions

- `npm audit` currently flags `vite` through `esbuild`, and the available fix path is a major update to Vite 8.
- `@vitejs/plugin-react` must move with Vite because plugin 6 peers on Vite 8.
- Local Node is v24.4.0 and CI uses Node 22, both compatible with the Vite 8 engine requirement (`^20.19.0 || >=22.12.0`) if CI's setup-node resolves a recent Node 22 release.
- `@lhci/cli@0.15.1` is the latest package version; npm's audit fix suggestion points to `0.1.0`, so that is not a safe remediation.

## Steps

1. Update `vite` to `^8.0.16` and `@vitejs/plugin-react` to `^6.0.2` with npm so `package.json` and `package-lock.json` stay in sync.
2. Inspect the resulting dependency tree, especially `vite`, `@vitejs/plugin-react`, `esbuild`, `rolldown`, and LHCI-related packages.
3. Run existing verification through `python3 scripts/verify.py --mode all`.
4. Run `npm audit --json` again and classify remaining findings.
5. If Vite 8 breaks config/build/prerender/LHCI, make only narrow compatibility fixes; if the breakage is broad, revert only this task's dependency update and report the blocker.
6. Do not change `@lhci/cli` unless a compatible current release or safe patch/minor remediation is available.

## Verification

- `npm ls vite @vitejs/plugin-react @lhci/cli esbuild --depth=2`
- `npm audit --json`
- `python3 scripts/verify.py --mode all`
- `npm install --package-lock-only --ignore-scripts --dry-run`
- `git status -sb`

## Open Issues

- Vite 8 is a major update and changes the build toolchain around Rolldown. Existing verification must pass before treating the update as complete.
- LHCI still has transitive audit findings in the latest `@lhci/cli`. Replacing LHCI would change the performance verification workflow and is out of scope unless explicitly approved as a separate task.
