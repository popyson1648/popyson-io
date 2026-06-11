# Plan

## Goal

Second round of UI refinements on the same branch:

1. Blog filter/sort controls should sit in a clearly bounded region (like the top bar)
   with a blurred background.
2. Top bar: replace the full-height divider between nav and language/theme with a short
   vertical bar that has space above and below.
3. Numerals/meta text across the site are too small — make them larger.
4. Too many separator lines — express grouping with spacing/layout instead of rules.
5. The theme dropdown's square corners look out of place — round it (and blend it in).

## Scope

- `src/app.css` only (CSS-level visual refinements). No JSX/logic changes.

## Non-goals

- No change to filter/sort/search behavior or to content.

## Assumptions

- `app.css` is heavily layered; an earlier "no-blur" block applies
  `backdrop-filter: none !important` to topbar/fbar surfaces, so re-enabling blur requires a
  later `!important` override. The frosted look needs a translucent background, not the
  opaque `var(--bg)`.

## Steps (all in a final appended block + a few in-place edits)

1. Frosted glass: override the no-blur rule for `.topbar`, `.fbar-controls`, `.fpanel`,
   `.topbar .menu` with a translucent `color-mix(... 70% ...)` background + `backdrop-filter`.
2. Blog controls region: make `.fbar-controls` a bordered, rounded (14px) bar; render the
   expanded `.fpanel` as its own bordered, rounded, blurred card (remove its bottom-border
   and the sort `menu-sep`; group sort rows by `gap`).
3. Top bar divider: drop the `border-left` on `.tool-group-actions`; add a `::before`
   pseudo-element — a `width:1px; height:18px` bar, vertically centered (space above/below).
4. Bigger numerals: bump mono/meta sizes (`.post-index-no` → 14px;
   `.post-index-meta`/`.article-meta`/`.pcard-meta`/`.ritem-sub`/`.tl-period`/`.rel-date` →
   13.5px; tags → 13px). Keep all ≥ 12px for the static a11y check.
5. Fewer rules: remove `.post-index-card` `border-top` and increase list `gap`
   (34px desktop / 28px mobile); remove `.fbar` bottom border.
6. Theme menu: change `.topbar .menu` from `border-radius: 0` to `14px`, softer border,
   translucent + blurred (via step 1).

## Verification

- `python3 scripts/verify.py` → lint / build / accessibility / performance all pass.
- Chrome DevTools MCP (desktop + ~485px mobile):
  - Top bar is frosted glass with a short, vertically-padded vertical divider before EN/theme.
  - Blog filter/sort controls sit in a bounded blurred pill; opening filter or sort shows a
    bounded blurred rounded card (no internal separator lines).
  - Blog list items are separated by whitespace (no rules); numerals read larger.
  - Theme dropdown is rounded and frosted, no longer a square floating box.

## Open Issues

- Browser hard-reload (ignore cache) is needed after CSS edits because the page caches the
  stylesheet; the live HMR socket was failing (port 5173/5174 mismatch from a stray prior
  dev server). Numerals bumped to 13.5–14px; can go larger if still too small.
