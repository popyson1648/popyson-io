# Decision

## Title

Retreat the decorative riso circles for body-text legibility

## Date

2026-06-12

## Status

Accepted

## Decision

Keep the two decorative riso circles (`.grain-circle-1/2`) but make them recede so they never
bury reading text:

- `RISOGRAPH_DEFAULTS.circleOpacity` lowered from `100` to `60` (`src/app.jsx`). Opacity is pushed
  to `--grain-circle-opacity` from JS, so the effective default lives in `RISOGRAPH_DEFAULTS`, not
  in the CSS fallback.
- `.grain-circle` size reduced from `min(42vw, 420px)` to `min(34vw, 360px)`, and
  `.grain-circle-1/2` offsets pushed further into the margins (`src/app.css`).

## Context

The circles use `mix-blend-mode: multiply` at full opacity over transparent content surfaces. Blue
body text (`#4960ff`) over the blue circle multiplied to near-invisibility (blue × blue), erasing
the About "活動" rows, article body, and reading-list rows. The owner asked to raise legibility and
design quality while keeping the riso identity and changing the design by no more than ~30%.

## Alternatives

- Remove the circles, or give all content opaque backings. Rejected: removes the airy floating
  riso aesthetic.
- Lower opacity only. Rejected alone: large circles still crossed into content columns.
- Per-page repositioning. Rejected: whack-a-mole and fragile.

## Reason

Lower opacity plus smaller, margin-hugging circles keeps the motif clearly visible while restoring
text contrast everywhere. It is the least-invasive change that fixes the catastrophic
blue-on-blue case.

## Consequences

- On desktop the lime circle still underlaps the article TOC and the first reading-list items;
  text stays legible (blue on lime) and on-brand.
- Circle opacity/size remain tunable live via the existing riso tweaks panel.

## Revisit Conditions

- Margin-side panels (TOC, reading list) need cleaner separation from the lime circle.
- The palette changes such that the multiply blend no longer erases text.
