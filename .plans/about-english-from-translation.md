# Plan

## Goal

Publishing About is blocked by `EN: News 1: title is required`, but the English News headline
is written by the publication translation step. The check stops the run that would fill it in.

## Scope

- `scripts/contentEditorModel.mjs`: About validation asks for prose in Japanese only. Both
  locales are still asked for a News date, which is structure rather than prose.
- `src/editor/AboutEditor.jsx`: say so in the English form, so an empty field does not read as
  unfinished work.
- `.project/content-publication.md`, `.project/testing.md`: record the rule and what the new
  test covers.
- Tests: the validation rule, the publish check the editor's button reads, and an editor
  startup check that pulls a snapshot and loads it the way `npm run editor` does.

## Non-goals

- Posts and Works keep asking for an English title and body. The same argument may apply, but
  changing what may be published is worth deciding on its own rather than as a side effect.
- No change to the site loader or to `.project/translation.md`.

## Assumptions

- `.github/workflows/content-publish.yml` translates `about.en.toml` and `news.en.toml` on
  every publication, so English prose left empty is filled before the release is built.

## Steps

1. Validate prose for `ja` only in `serializeEditorAbout`.
2. Note it in the English News form.
3. Add tests for the rule, for the publish check, and for editor startup.
4. Update `.project/` and run verification.

## Verification

- `CONTENT_SNAPSHOT_ROOT=<snapshot> python3 scripts/verify.py --mode standard`

## Open Issues

- An English headline is only as good as the translation run; nothing downstream requires a
  News title to be non-empty. If a translation ever half-succeeds, a blank headline would
  reach the page.
