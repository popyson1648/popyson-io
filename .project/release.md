# Release

## When Release Is Needed

## Release Steps

### Push Workflow Note

Before pushing a branch, run `git fetch` and check whether `origin/main` has advanced.

Deploys run from two workflows: `.github/workflows/deploy.yml` on `main` pushes
and manual dispatch, and `.github/workflows/reading-refresh.yml` hourly and on
manual dispatch. Neither commits back to `main`: the reading snapshot
(`src/reading.json`) is fetched and deployed but not committed, so these
workflows do not advance `origin/main`.

`origin/main` can still advance from other automation (Dependabot, security
remediation) or human commits. Inspect the ahead commits after fetching, then
rebase or merge `origin/main` into the working branch when needed before pushing.

## Required Checks

## Rollback Or Recovery Notes
