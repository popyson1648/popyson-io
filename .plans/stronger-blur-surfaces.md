# Plan

## Goal

Make every existing blurred/translucent surface easier to read by strengthening the blur and reducing see-through text from content underneath.

## Scope

- Update `src/app.css` only.
- Target existing blur surfaces:
  - search modal overlay
  - top bar
  - theme menu
  - Blog filter/sort control bar
  - Blog filter/sort floating panel
  - Reading list segmented filter if still covered by the existing blur selector

## Non-goals

- Do not add blur to surfaces that are currently intentionally transparent.
- Do not change layout, copy, routing, data, or component logic.
- Do not change the DevTweak overlay.

## Assumptions

- The readability issue comes from both insufficient blur strength and backgrounds being too transparent.
- A stronger frosted effect should keep the current visual direction, but use more opaque `color-mix` backgrounds and larger `blur(...)` values.

## Steps

1. Find the final, effective `backdrop-filter` declarations in `src/app.css`.
2. Increase blur values on existing blurred surfaces, especially the final override block.
3. Increase `var(--bg)` mix percentages enough that text behind the surface no longer reads through strongly.
4. Keep saturation moderate so the UI does not become visually noisy.
5. Run `python3 scripts/verify.py`.
6. Use Playwright at desktop and mobile widths to check that blurred surfaces remain readable and do not introduce overflow or layout shifts.

## Verification

- `python3 scripts/verify.py`
- Playwright visual/DOM checks on:
  - top bar
  - theme menu
  - search modal overlay
  - Blog filter panel
  - Blog sort panel
  - mobile Blog filter input

## Open Issues

- None yet.
