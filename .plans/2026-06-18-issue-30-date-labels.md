# Plan

## Goal

Close GitHub issue #30 by precomputing localized date labels in content data and removing normal runtime display dependence on `new Date(iso)` / `toLocaleDateString`.

## Scope

- Add `dateLabel: { ja, en }` to generated `POSTS` entries.
- Add `dateLabel: { ja, en }` to reading-list entries loaded from `src/reading.json`.
- Replace article list, article detail, related article, search suggestion, and reading-list date rendering with generated labels.
- Preserve the current Japanese and English date display strings.
- Keep RSS/build metadata date handling unchanged unless it affects normal UI display.

## Non-goals

- Change article or reading-list date formats.
- Change content sorting, RSS date generation, or Instapaper fetching behavior beyond stored reading-list labels.
- Refactor unrelated content loading or UI code.

## Assumptions

- Existing display format is:
  - Japanese: `YYYY年M月D日`
  - English: `Mon D, YYYY` using `en-US` short month names.
- Source dates are ISO calendar dates in `YYYY-MM-DD` form.
- The reading-list JSON can be updated in place because it is repository content data.

## Steps

1. Add a small date-label helper that parses `YYYY-MM-DD` without constructing a runtime `Date` from the ISO string for UI display.
2. Use that helper in `scripts/content_loader.mjs` when building `POSTS`.
3. Add labels to `src/reading.json` entries and make `src/data.js` normalize any missing labels defensively.
4. Replace `fmtDate(...)` calls in UI date display paths with localized `dateLabel` reads.
5. Remove the now-unused UI `fmtDate` export/import if no runtime display path still needs it.
6. Run `python3 scripts/verify.py`.

## Verification

- `python3 scripts/verify.py`
- Targeted search for remaining normal UI `fmtDate` / `new Date(iso)` date-display usage.

## Open Issues

- None at plan time.
