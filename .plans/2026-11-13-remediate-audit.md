# Plan

## Goal

Investigate and remediate the 16 remaining npm audit findings.

## Scope

Trace vulnerable dependencies, adopt compatible patched releases, document any
necessary overrides and residual exposure, verify, and merge the repair.

## Non-goals

Do not suppress audit results, dismiss alerts, or force unrelated downgrades.

## Assumptions

The user authorized investigation and repair of the remaining findings.
GitHub Dependabot alert reads return 403 for the connected integration; npm audit
provides advisory IDs, affected ranges, and the installed dependency paths.

## Steps

1. Capture the baseline audit and dependency paths.
2. Update compatible packages and assess pinned transitive dependencies.
3. Add narrowly scoped overrides only where upstream pins vulnerable versions,
   with compatibility evidence and a removal condition.
4. Run clean installation, audit, repository verification, and targeted tests.
5. Create and merge a reviewed repair after GitHub checks pass; verify main.

## Verification

Use npm audit, npm ci, and python3 scripts/verify.py with the documented local
fixture snapshot. CI validates against the active production-content snapshot.

## Open Issues

Local remediation is complete: npm audit reports zero vulnerabilities after a
clean install, and npm ls --all reports no invalid dependencies. All standard
verification phases passed (611 tests), including Worker runtime suites, site
and editor builds, OGP generation, integration tests and lint/type checks.
The separate performance phase passed with Lighthouse. Explicit ESLint config
and ignore-path assertions passed with minimatch 11.0.1.

GitHub CI, merge, and final main deployment confirmation remain pending. GitHub
Dependabot alert API verification is unavailable (integration returns 403);
zero findings refers to npm audit on the resolved lockfile.
