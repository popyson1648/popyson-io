# Plan

## Goal

Fix the About editor's News section: the English date is left empty when only the Japanese
side is edited, the list keeps insertion order instead of date order, and a growing list is
hard to scan.

## Scope

- `src/editor/AboutEditor.jsx`
  - `date` becomes a shared field: editing it writes to both locales, and any stored pair
    where one locale has a date and the other does not is repaired when the editor opens.
  - News items are kept sorted newest first. Items without a usable date sort to the top so a
    newly added row is visible immediately; new rows are inserted at the top.
  - The manual up/down buttons are dropped for News because the order is derived from the date.
  - The News list is paged (5 per page) with a `‹ 1–5 / 12 ›` control.
- `src/editor/previewMain.jsx`: sort before slicing so the preview shows the same entries as
  the built site.
- `src/editor/editor.css`: styles for the pager.
- Tests for the shared date, the ordering, and the pager.

## Non-goals

- The date input keeps `type="date"`. Its display format comes from the browser/OS locale
  (a Japanese-era calendar setting renders "Reiwa 8 Jun 27"); the stored value is already
  `YYYY-MM-DD`, so there is nothing to fix in the repository.
- Paging is limited to the News section; Activity, Career, Education and Links are unchanged.
- No change to `normalizeNewsEntries`, which already sorts the built site newest first.

## Assumptions

- A News date describes the same event in both locales, so it is language independent.
- `<input type="date">` only reports a complete value, so re-sorting on change cannot fire
  mid-typing.

## Steps

1. Add shared-date normalization and date ordering helpers to `AboutEditor`.
2. Run them from `mutate` so every edit keeps both locales aligned.
3. Add the News pager and remove the News move buttons.
4. Sort the About preview before slicing.
5. Add tests and run verification.

## Verification

- `npx vitest run tests/editor.test.jsx tests/check_content_editor.test.mjs`
- `python3 scripts/verify.py`

## Open Issues

- While the two locales hold different numbers of entries, nothing is shared or reordered:
  position no longer identifies an entry, so a date written across would land on the wrong
  event. The parity check already reports the count difference as the thing to fix.
