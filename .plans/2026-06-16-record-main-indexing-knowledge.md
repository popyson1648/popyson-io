# Plan

## Goal

Record project knowledge that `main` can advance during push workflows because GitHub Actions can commit Instapaper reading-list snapshot updates.

## Scope

- Add a concise note to project documentation for future contributors and coding agents.
- Base the note on the current implementation in `.github/workflows/reading-refresh.yml` and `scripts/fetch_instapaper.mjs`.
- Mention that advanced `main` commits are not guaranteed to be reading-refresh changes.

## Non-goals

- Do not change CI, indexing, or release automation.
- Do not change the reading-list refresh behavior.

## Assumptions

- `.github/workflows/reading-refresh.yml` runs on `main` pushes, a daily schedule, and manual dispatch.
- The workflow fetches Instapaper unread and archive items, writes `src/reading.json`, and commits it as `chore(reading): refresh Instapaper snapshot` when it changes.
- Other human or automation commits may also be present, so commit contents must still be inspected.

## Steps

- Create a dedicated branch.
- Inspect the current workflow and scripts before documenting the behavior.
- Update `.project/release.md` with the push workflow note.
- Run repository verification for documentation edits.

## Verification

- Run `python3 scripts/verify.py --mode edit`.

## Open Issues

- None.
