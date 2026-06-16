# Plan

## Goal

Review whether the repository's direct JavaScript dependencies are necessary, maintained, safe enough for current use, and appropriate for the project. Apply only small, low-risk dependency changes that preserve existing behavior.

## Scope

- Inspect `package.json`, `package-lock.json`, scripts, config files, and source imports.
- Classify direct `dependencies` and `devDependencies` as keep, remove, replace, update, or defer.
- Check known vulnerability and freshness signals from npm registry when network access is available.
- Make minimal package/code changes only when the evidence is strong and compatibility risk is low.
- Keep package metadata and lockfile consistent after any change.

## Non-goals

- No new features.
- No UI redesign or behavior changes.
- No broad framework migration.
- No major version updates unless the need is clear and verification risk is acceptable.
- No removal of dependencies that may be required by scripts, config, framework conventions, or dynamic imports.

## Assumptions

- npm is the package manager because `package-lock.json` is present and the lockfile version is 3.
- The project is a Vite/React JavaScript app with no configured TypeScript typecheck phase.
- Current verification should use existing repository scripts and `python3 scripts/verify.py`.
- If npm registry access is unavailable, decisions must be limited to local lockfile/package metadata and code usage.

## Steps

1. Inventory package manager, lockfile, direct dependencies, scripts, verification phases, and runtime/build/test usage.
2. Apply evaluation criteria: necessity, alternatives, reliability, maintenance, security, size, API stability, type safety, license, and project fit.
3. Confirm each direct dependency's actual usage through imports, dynamic imports, config files, scripts, and framework conventions.
4. Identify candidates for keep/remove/replace/update/defer.
5. Implement only low-risk removals, replacements, minor/patch updates, or package metadata cleanup when clearly justified.
6. Run existing verification commands after any change.
7. Re-check `package.json` and `package-lock.json` consistency and report any deferred concerns.

## Verification

- `npm ls --depth=0`
- `npm audit --json` when registry access is available
- `npm outdated --json` when registry access is available
- `python3 scripts/verify.py --mode edit`
- `python3 scripts/verify.py --mode pre-push` if dependencies are changed and runtime/build/performance behavior may be affected

## Open Issues

- `npm audit` currently reports advisories through Vite/esbuild and LHCI transitive dependencies, but npm's suggested fixes require major updates or a suspicious LHCI downgrade. These need careful classification before any change.
- Major updates for React, Vite, ESLint, Shiki, and related plugins are outside the default safe-change scope unless a specific issue requires them.
