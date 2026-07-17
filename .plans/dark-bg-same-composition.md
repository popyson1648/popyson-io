# Plan

## Goal

Make the dark-theme background the same composition (pattern) as the light
theme, with only the two color codes swapped: light paper #fdfff7 → dark
paper #12141d, light lime #d4ff0a → dim lime #2f3b07.

## Scope

- `src/app.jsx`: the `gg-dark-map` feColorMatrix values and comment.
- `tests/check_theme_contrast.test.mjs`: flip the endpoint-mapping
  expectations to match.

## Non-goals

- Change the gradient composition, the light theme, or any theme.toml color.
- Change the dark endpoint color codes themselves.

## Assumptions

- The matrix shipped in PR #73 inverted the pattern (light paper → dim lime,
  light lime → dark paper) to "preserve dark proportions"; the owner's
  standing instruction is that dark must keep the identical pattern and only
  swap the two codes. The app.css comment already described the non-inverted
  mapping, so this also reconciles code with its documentation.

## Steps

1. Recompute the blue-channel linear map for the non-inverted endpoints and
   replace the matrix values; update the comment.
2. Update the endpoint-mapping test expectations.
3. Verify dark desktop/mobile in the browser; confirm the light theme is
   untouched.
4. Run `python3 scripts/verify.py`.

## Verification

- `npx vitest run tests/check_theme_contrast.test.mjs` — 15/15 pass
  (contrast roles were already checked over both endpoints, unchanged).
- Browser check: dark now renders paper band on top, dim lime field below —
  the same pattern as light. Sampled endpoints match #12141d / #2f3b07 plus
  the screen-blended grain.
- `python3 scripts/verify.py` — all phases pass.

## Open Issues

- None.
