# Plan

## Goal

Resolve all 17 open maintenance PRs, including dependency and security updates.

## Scope

Review and merge passing updates, reconcile overlapping lockfile changes, migrate
TanStack Table v9 usage, and verify happy-dom v21 with the current application.

## Non-goals

Do not weaken checks, publish draft content, or dismiss security alerts.

## Assumptions

The user authorized resolving all open PRs, including merging verified changes.
Existing passing checks provide evidence for the individual updates; the combined
result also needs repository verification.

## Steps

1. Inspect all PR diffs, reviews, and CI results.
2. Merge passing independent updates and close the older duplicate Vite PR.
3. Consolidate remaining overlapping updates and repair the Table v9 API usage.
4. Run standard verification, audit dependencies, and require green CI.
5. Merge the consolidated repair and close superseded PRs with an explanation.
6. Confirm there are no open PRs remaining and inspect final main checks.

## Verification

Use python3 scripts/verify.py with the documented fixture snapshot locally;
GitHub CI validates against the active production-content snapshot.

## Open Issues

Local standard verification passed with the fixture snapshot. Three additional
BlogList interaction tests passed. GitHub CI remains to be checked.

Merged individually: #176, #177, #178, #180, #181, #185, #189, #190, #192,
#193, #194. Closed #186 because #176 includes the newer Vite 8.3.6 update.
The combined change incorporates #179, #182, #183, #187, and #191.

npm audit reports 16 remaining findings (8 moderate, 8 high) in the resulting
dependency graph, including transitive tooling dependencies. Some proposed
remediations require downgrading major packages; no force-audit fix or alert
suppression was applied. Closing the listed PRs does not assert a clean audit.
