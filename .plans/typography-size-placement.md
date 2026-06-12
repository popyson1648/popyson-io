# Plan

## Goal

Review and refine font sizes and placement so the site reads with clear hierarchy and high
legibility, removing the "AI default" feel, while keeping the riso wireframe identity and changing
no more than ~30% of the typographic design. Builds on the Alexandria + LINE Seed JP font system
(kept as the baseline).

## Scope

- Regularize the scattered small-text band onto a disciplined scale.
- Reduce the legibility damage caused by the decorative riso circles overlapping body text.
- Minor hierarchy polish on the blog list number gutter.

## Non-goals

- Changing the font family (kept), the palette, or the 1px-line aesthetic.
- Removing or heavily reworking the riso circles.
- Reworking JSX markup or the large display headings.

## Assumptions

- The decorative circles are intentional brand identity; they should retreat behind/around text,
  not disappear.
- Snapping sizes by 1-2px is visually subtle but removes the inconsistency.

## Steps

1. Add a role-based small-band scale to `:root` in `src/styles.css`
   (`--fs-caption 12 / --fs-meta 13 / --fs-small 14 / --fs-base 16 / --fs-lead 18`).
2. In `src/app.css`, snap ad-hoc sizes to the scale across all stacked-override copies:
   `12.5 -> 13`, `13.5 -> 13`, `14.5 -> 14`, `17 -> 18`; `15` by role (sub -> 14, titles -> 16);
   unify `prose h2 23 -> 22` and `acard-title 21 -> 22`. Large display headings left as-is.
3. Fix circle legibility: lower `RISOGRAPH_DEFAULTS.circleOpacity` `100 -> 60` in `src/app.jsx`;
   shrink `.grain-circle` to `min(34vw, 360px)` and push `.grain-circle-1/2` further into the
   margins in `src/app.css`. (Opacity is applied via JS-set CSS var, so the default lives in JS.)
4. Raise the blog-list number gutter `.post-index-no` color from `--text-faint` to `--text-muted`.

## Verification

- `python3 scripts/verify.py` (lint / build / a11y / Lighthouse) — all phases passed.
- Chrome DevTools MCP screenshots on desktop (1280) and mobile (390) for top / blog list /
  article / about / reading: confirmed body, TOC, and list text are readable over the circles
  (the catastrophic blue-text-on-blue-circle case is gone), the small band is consistent, and the
  blog-list numbers are legible. No layout regression.

## Open Issues

- On desktop, the lime circle still sits under the article TOC and the first reading-list items.
  Text is legible (blue on lime) and on-brand, but a future pass could give those margin-side
  panels an opaque backing if a cleaner separation is wanted. See
  [[../.decisions/riso-circle-legibility.md]].

## Follow-up — contrast and beauty pass (2026-06-12)

Owner feedback: the site read too faint after the font switch; about career years nearly
invisible; blog numbers small and awkwardly placed; some frames weak. The circles are being
redesigned separately, so they no longer constrain text contrast. Changes:

- `--text-faint` 44% -> 62%, `--line` 42% -> 52% (`src/styles.css`, both theme blocks).
- Reading numerals faint -> meta: `.tl-period`, `.acard-year`, `.kv .k` (`src/app.css`).
- `.post-index-no` redesigned to a 26px semibold `--text-meta` editorial numeral.

Verified: `python3 scripts/verify.py` all phases passed; Chrome DevTools MCP screenshots on
desktop (1280) and mobile (390) for blog list / about / article confirmed the years are legible,
the numbers anchor each entry, and frames are firmer with no layout regression. See
[[../.decisions/text-contrast-over-decoration.md]].
