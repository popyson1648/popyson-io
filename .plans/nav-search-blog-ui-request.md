# Plan

## Goal

Implement the requested navigation, search modal, Blog filter, metadata color, and page heading refinements while preserving the current visual atmosphere and accessibility.

## Scope

- `src/components.jsx`
  - Remove `top` from the top bar navigation.
  - Show search only on Blog routes.
  - Replace the settings/theme menu with direct sun, moon, and system/computer theme buttons.
  - Improve search modal controls: explicit close button outside the input, clear-input button inside the search field, and larger tappable overlay margins.
- `src/app.jsx`
  - Keep the root route behavior coherent after removing `top` from navigation.
- `src/blog.jsx`
  - Make Blog filter and sort buttons icon-only with accessible names.
  - Use the requested filter icon style.
  - Remove RSS from the filter UI.
- `src/i18n.js`
  - Rename Reading to Reading list.
  - Add labels for clear search and icon-only filter/sort controls.
  - Remove page subtitle strings where requested.
- `src/pages.jsx`
  - Stop rendering page descriptions/subtitles such as "書いたもの" and "作ったもの".
- `src/app.css`
  - Update top bar layout for fewer nav items and direct theme controls.
  - Update search modal spacing and close/clear controls.
  - Update Blog filter styling and Blog metadata color.

## Non-goals

- Do not redesign the site identity or background/noise implementation.
- Do not change article content, reading list data, or app data.
- Do not remove the actual Top page route unless required; the request is interpreted as removing `top` from the top bar.

## Assumptions

- "top をなくす" means remove the `top` item from the top bar navigation, not delete the root page entirely.
- Search should appear on Blog list and article routes only.
- RSS should remain accessible through the footer and RSS route, just not inside the Blog filter UI.
- Icon-only controls must retain accessible names through `aria-label`/`title`.

## Research Notes

- WCAG 2.2 Success Criterion 1.4.3 requires at least 4.5:1 contrast for normal text, so Blog dates/tags should not be made too faint.
- For metadata, using a distinct but sufficiently contrasted color is preferable to lowering opacity because opacity also reduces contrast unpredictably over textured/noisy backgrounds.
- Icon-only controls save space but can be ambiguous; they need stable, familiar icons plus accessible labels. Search, theme sun/moon/system, filter, sort, clear, and close fit this if labeled.

## Steps

1. Update navigation labels and top bar structure.
2. Replace theme settings menu with direct icon buttons and show search only in Blog context.
3. Update search modal with explicit close and clear controls plus larger overlay padding.
4. Convert Blog filter/sort buttons to icon-only controls and remove RSS from that UI.
5. Remove page subtitles from top-level pages.
6. Adjust Blog date/tag colors to a stronger semantic metadata tone.
7. Run `python3 scripts/verify.py`.
8. Attempt browser/UI verification if available; otherwise report the limitation.

## Verification

- `python3 scripts/verify.py`
- Source review for labels, focusable controls, route behavior, and responsive layout.
- Browser visual check if the environment supports it.

## Open Issues

- Visual tuning may need one pass after seeing desktop/mobile screenshots in a real browser.
