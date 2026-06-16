# Release

## When Release Is Needed

## Release Steps

### Push Workflow Note

Before pushing a branch, run `git fetch` and check whether `origin/main` has advanced.
This repository's `.github/workflows/reading-refresh.yml` workflow runs on `main` pushes, on a daily schedule, and by manual dispatch.
It runs `scripts/fetch_instapaper.mjs`, which fetches Instapaper unread and archive items and writes the committed snapshot at `src/reading.json`.
When that file changes, GitHub Actions commits it as `chore(reading): refresh Instapaper snapshot` and pushes back to `main`.

Do not assume every advanced `main` commit is reading-refresh related.
Other automation or human commits may also be present.
Inspect the ahead commits after fetching, then rebase or merge `origin/main` into the working branch when needed before pushing.

## Required Checks

## Rollback Or Recovery Notes
