# Plan

## Goal

Improve the search modal so active searches show nearby matched text, visibly mark the matched term, and keep overflowing tag text readable through truncation.

## Scope

- `src/components.jsx`
  - Build a localized search document map for title, tags, summary, and body text.
  - Generate a short context snippet around the best matching field while a query is active.
  - Render matched text with a visible underline-style mark.
- `src/app.css`
  - Add stable modal result layout styles for snippets and single-line tag overflow.
  - Keep the list compact on mobile without changing the modal interaction model.

## Non-goals

- Do not change the search ranking algorithm unless needed for display data.
- Do not redesign the modal, top bar, filters, or page navigation.
- Do not touch unrelated existing component background work.

## Assumptions

- "検索中" means when the search input has a non-empty query.
- The context snippet can come from title, tags, summary, or article body depending on the matched field.
- If the query only fuzzy-matches and has no exact substring hit, showing the closest field text without underline is acceptable.

## Steps

1. Add helper functions for normalized matching, snippet extraction, and matched-term rendering.
2. Derive display metadata for each search result from the same localized fields used by the search index.
3. Render a snippet only for non-empty queries, with the matched text underlined.
4. Change tag metadata in search results to a single-line truncating row so overflowing tags are shown with ellipsis.
5. Run project verification and review the changed UI/CSS surface.

## Verification

- Run `python3 scripts/verify.py`.
- Inspect the relevant source and CSS for keyboard/a11y regressions in the modal result structure.

## Open Issues

- Browser-based visual verification may be limited if the sandbox cannot launch Chromium.
