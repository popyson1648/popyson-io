# Plan

## Goal

Use each article locale's authored tags throughout the Blog UI so English pages
display, search, and filter with English tags while Japanese pages keep the
current Japanese tags.

## Scope

- Preserve `tags` from both `index.ja.md` and `index.en.md` in runtime content.
- Expose locale-specific global tag lists in first-seen order.
- Use localized tags in the Blog list, search suggestions, filter chips, active
  filter pills, article headers, related cards, and tag links.
- Index and filter localized tags in each locale's Pagefind record.
- Translate an active tag by its same-position locale counterpart when the
  language toggle is used.
- Validate that Japanese and English tag arrays have the same number and
  semantic order so cross-locale mapping remains deterministic.

## Non-goals

- No automatic translation or rewriting of the checked-in tags; the English
  front matter already contains authored English tags.
- No visual redesign of chips, cards, search results, or article metadata.
- No change to tag matching semantics within one locale.
- No change to article URLs other than using the selected locale's tag value in
  the existing `?tag=` parameter.

## Assumptions

- Tags at the same array index in `index.ja.md` and `index.en.md` represent the
  same concept. The current checked-in posts already follow this rule.
- Technical proper names such as `TypeScript`, `WSL`, and `Wezterm` may remain
  identical across locales.
- Legacy test fixtures with a plain tag array remain supported by the localized
  tag helper, while production content uses `{ ja, en }`.

## Steps

1. Add locale-aware tag helpers.
   - Resolve either localized tag objects or legacy arrays.
   - Translate a selected tag between locales by article and array position.
   - Keep related-article ranking based on the Japanese tag set so this change
     does not alter related-article ordering.

2. Preserve localized tags in the content loader.
   - Build each post with `tags: { ja, en }`.
   - Build `TAGS: { ja, en }` independently in first-seen order.
   - Update loader tests for localized shapes and unchanged related ranking.

3. Localize every Blog tag consumer.
   - Resolve the current locale once per post/list.
   - Use it for list filtering, search documents and fallback search, suggestion
     metadata, list cards, article tags, and related cards.
   - Use the current locale's global tag list for filter chips and route tags.

4. Localize Pagefind data.
   - Add only Japanese tags to Japanese records and English tags to English
     records.
   - Verify English tag queries find the English route and Japanese-only tag
     strings do not leak into English filter metadata.

5. Preserve active tag intent across the language toggle.
   - Map the current route tag to its counterpart before navigating.
   - Fall back safely when a legacy or incomplete fixture has no counterpart.

6. Tighten authoring and regression checks.
   - Require matching Japanese/English tag counts.
   - Document that translation keeps tag meaning and order aligned.
   - Add component and integration tests for English display, filtering, search,
     article tag links, and language switching.

## Verification

- Run focused content-loader, Blog component, TopBar, and Pagefind integration
  tests.
- Run `npm run build`.
- Run `python3 scripts/verify.py`.
- In the production preview, verify `/en/blog` shows only English tags, an
  English tag chip filters the expected article, English tag text finds the
  article in search, and switching languages maps the active tag.
- Confirm Japanese Blog behavior, layout, and existing search behavior remain
  unchanged.

## Open Issues

- Tag pairing is positional because the metadata has no locale-independent tag
  identifier. Validation and translation documentation make that contract
  explicit; a future taxonomy with stable IDs would supersede it.
