# Plan

## Goal

Make Blog search show each article thumbnail, support whitespace-separated
multi-word queries, and ensure Enter in the search input never opens an article,
including while confirming Japanese IME conversion.

## Scope

- Replace the search-result placeholder with the resolved article thumbnail,
  retaining the placeholder only when an article has no thumbnail.
- Treat whitespace-separated words as an any-word search and merge unique
  Pagefind results, so `設計 アルゴリズム` can show articles matching either
  word.
- Rank articles matching more query words first, then use Pagefind relevance.
- Prevent search-input Enter from navigating under all circumstances.
- Ignore result-selection keyboard handling while an IME composition is active.
- Keep result buttons directly activatable by click and by keyboard focus.
- Add unit, component, and built-index integration coverage.

## Non-goals

- No redesign of the search popup, result spacing, typography, or navigation.
- No change to title/body/tag indexing or Pagefind generation.
- No change to the separate Blog filter and sort controls.
- No fuzzy synonym expansion or remote search service.

## Assumptions

- The example `設計 アルゴリズム` is intended as an any-word query because the
  current content has separate matching articles rather than one article that
  contains both words.
- Activating a focused result button remains supported for keyboard and
  assistive-technology users; only Enter pressed in the text input loses its
  implicit-navigation behavior.
- Existing 192- and 384-pixel lossless WebP variants remain the preferred
  thumbnail sources with the canonical image as fallback.

## Steps

1. Extract deterministic query-token and result-merge helpers.
   - Normalize query text with NFKC.
   - Split on all whitespace, remove duplicates, and ignore empty words.
   - Search Pagefind once per word.
   - Deduplicate results by Pagefind id and rank by matched-word count,
     aggregate relevance, and stable source order.

2. Correct search input keyboard behavior.
   - Return early from arrow/Home/End handling during IME composition, including
     the legacy key-code fallback.
   - Remove Enter-to-open behavior from the combobox input.
   - Keep mouse click and explicit focused-result button activation unchanged.

3. Render real thumbnails in result rows.
   - Use each post's existing `thumbnail`, responsive `srcset`, and CSS-matched
     `sizes`.
   - Keep the decorative empty alt text, fixed dimensions, async decoding, and
     the existing placeholder fallback.
   - Add image-only styling so the current result-row geometry and border remain
     unchanged.

4. Add regression coverage.
   - Unit-test query normalization, duplicate words, OR merging, deduplication,
     ranking, and limits.
   - Component-test that search-input Enter and IME conversion confirmation do
     not call navigation, while clicking a result does.
   - Component-test thumbnail source, responsive candidates, dimensions, and
     fallback.
   - Integration-test a multi-word search against the built Pagefind index.

5. Verify in the running production preview.
   - Reproduce Japanese composition events and ordinary Enter.
   - Search `設計 アルゴリズム` and confirm both result groups appear.
   - Confirm only explicit result activation navigates.
   - Inspect mobile and desktop result thumbnails and accessibility snapshots.

## Verification

- Run focused unit and component tests during implementation.
- Run `npm run build`.
- Run `python3 scripts/verify.py`.
- Use Chrome DevTools against the production preview for the requested Japanese
  query and navigation behavior.
- Confirm no console errors, layout overflow, missing image requests, or static
  accessibility failures.

## Open Issues

- Browser automation can dispatch composition events but cannot fully reproduce
  every operating-system IME candidate window. The implementation therefore
  guards both the standard `isComposing` signal and the established key-code 229
  fallback, then verifies the visible browser behavior separately.

## Results

- `設計 アルゴリズム` returns the separate design and algorithm articles from
  the built Japanese Pagefind index.
- Search-input Enter leaves the current `/blog` URL unchanged. Explicit result
  activation still navigates to the selected article.
- Composition-state and key-code 229 events do not move the active result.
- Search results use the existing lossless responsive thumbnail variants and
  retain the placeholder for posts without a thumbnail.
- Results are also derived immediately from the already-loaded article data, so
  a Pagefind load or search failure cannot collapse every query to zero results.
- Focused unit, component, and built-index integration tests pass.
