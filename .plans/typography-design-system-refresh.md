# Plan

## Goal

Refresh the site typography to the new Typography Design System: switch the font family to
Alexandria (latin / numerals) + LINE Seed JP (japanese), and centralize size / weight /
line-height / letter-spacing as design tokens so that role and value stay coupled.

## Scope

- `index.html`: swap the Google Fonts load to Alexandria + LINE Seed JP + DM Mono (code).
- `src/styles.css`: rename `--font` to `--font-sans`, add the type-token set to `:root`.
- `src/app.css`:
  - Non-code meta / numeric text moves from `var(--mono)` to `var(--font-sans)` + `tabular-nums`.
  - Numeric `font-weight` literals are tokenized (`--font-regular/semibold/bold`); 500/600/650 collapse to semibold.
  - DM Mono is kept only for code (`.code code`, `.code-lang`, `.code-highlight .shiki`).

## Non-goals

- Applying the spec role utility classes (`.text-ja`, `.text-en`, `.text-label-en`, ...) across JSX.
  They are recorded as the canonical API in `.decisions/typography-design-system.md`; the active
  system is driven by tokens to avoid dead CSS.
- Reflowing bespoke fine-grained UI chrome sizes (12px-14.5px band) onto the 4-step scale.
- Changing the code-block font, colors, layout, or component structure.

## Assumptions

- Both families are on Google Fonts. Verified via the css2 endpoint: Alexandria exposes 400/600/700,
  LINE Seed JP exposes only 400/700, DM Mono 400/500.
- Alexandria has no japanese glyphs, so the stack `"Alexandria", "LINE Seed JP", sans-serif`
  splits latin/numerals to Alexandria and japanese to LINE Seed JP.

## Steps

1. Replace the font `<link>` and comment in `index.html`.
2. Add the token block to `:root` in `styles.css`; point `body` at `--font-sans` / `--font-regular`.
3. Convert non-code `var(--mono)` selectors to `var(--font-sans)` + `font-variant-numeric: tabular-nums`.
4. Tokenize `font-weight` literals in `app.css` (700 -> bold, 500/600/650 -> semibold).
5. Record the plan and the decision.

## Verification

- `python3 scripts/verify.py` (lint / build / a11y / Lighthouse) passes.
- Chrome DevTools MCP screenshots on desktop and mobile (360px / 390px) across top / blog list /
  article / about / reading / rss / search modal: japanese renders as LINE Seed JP, latin/numerals
  as Alexandria, meta/numbers are tabular and aligned, only code uses DM Mono, no layout regression.

## Open Issues

- LINE Seed JP has no 600, so japanese semibold resolves to 700 (nearest face). Accepted; revisit if
  japanese labels look too heavy.
