# Plan

## Goal

`npm run editor` fails to build while the author has an unfinished entry saved, which is the
state the editor exists to resolve.

## Scope

- `scripts/pull_content_snapshot.mjs`: a `published` option (CLI `--published`) that reads each
  item at `publishedRevisionId` and leaves out items that were never published.
- `scripts/editorServer.mjs`: the editor's own pull asks for published revisions.
- `.project/build.md`: describe both pulls accurately.
- Tests for the two pull modes and for the options the editor passes.

## Non-goals

- No change to `npm run content:pull`'s default, which reads current revisions on purpose so a
  saved edit can be previewed before it is published.
- No change to the site loader. It is right to reject an entry without a date; the release the
  site builds from cannot contain one, because publication validates first.

## Assumptions

- A published revision loads: nothing reaches `publishedRevisionId` without passing the
  publication checks.
- The editor's shell only needs the site around the item being edited — theme, strings, the
  works list. The item itself comes from the editor's own state.

## Steps

1. Add the `published` option to the pull and route it through `--published`.
2. Have `ensureEditorSnapshot` pass it.
3. Update `.project/build.md`.
4. Add tests and run verification.

## Verification

- `CONTENT_SNAPSHOT_ROOT=<snapshot> python3 scripts/verify.py --mode standard`
- Reproduced first: `npm run editor:build` against the editor's pulled snapshot failed with
  `news entry "" needs a YYYY-MM-DD date`.

## Open Issues

- The end-to-end run of `npm run editor` needs the author's 1Password session, so the pull
  itself was covered by tests with a stub client rather than executed here.
