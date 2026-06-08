# Plan

## Goal

Allow risograph tuning to be configured independently for the background, the two circles, and text.

## Scope

- Split the current shared risograph state into background, circle, and text groups.
- Provide separate sliders for noise strength, grain frequency, distortion, and roughness where applicable.
- Keep the existing base palette: background `#fdfff7`, base `#4960ff`, accent `#d4ff0a`.
- Apply background settings only to the page background noise.
- Apply circle settings only to the two decorative circles.
- Apply text settings only to text ink/noise treatment, with lighter defaults so text stays readable.
- Keep the temporary tuning panel at the top of the site.

## Non-goals

- Do not redesign the whole layout.
- Do not add persistence for these experimental controls.
- Do not merge or commit automatically.

## Assumptions

- Lines and decorative parts should continue to use the circle/decor rough-edge filter unless the UI explicitly needs a fourth group.
- Text should avoid heavy SVG displacement by default; the control should make ink/noise stronger without breaking legibility.

## Steps

1. Refactor `src/app.jsx` risograph defaults into grouped values.
2. Generate independent noise data URLs for background, circles, and text.
3. Generate separate SVG filters for circle/decor and text.
4. Update the tuning panel labels and slider rows so each target is clearly separated.
5. Update `src/app.css` to consume the separated CSS custom properties.
6. Verify with `python3 scripts/verify.py`.
7. Run UI verification in the browser to confirm sliders change the intended target independently.

## Verification

- `python3 scripts/verify.py`
- Browser check for:
  - background noise slider changes only `.bg-noise`
  - circle noise/distortion sliders change `.grain-circle`
  - text controls update text styling while title text remains readable
  - mobile layout of the expanded control panel does not overlap the top bar

## Open Issues

- None before implementation.
