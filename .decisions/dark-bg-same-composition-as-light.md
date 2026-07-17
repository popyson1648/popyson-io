# Decision

## Title

Dark background keeps the light composition; only the two color codes change

## Date

2026-07-17

## Status

Accepted

## Decision

The dark-theme background must render the identical composition (pattern) as
the light theme. The `gg-dark-map` remap swaps only the two color codes:
light paper #fdfff7 → dark paper #12141d, light lime #d4ff0a → dim lime
#2f3b07. Adjusting the dark background means changing those two codes (and
recomputing the matrix), never re-arranging the pattern.

## Context

PR #73 introduced the grainy lime gradient and remapped it for dark mode with
a feColorMatrix. The shipped matrix inverted the pattern (light paper → dim
lime, light lime → dark paper) to keep large dark surfaces low-luminance,
while the CSS comment already described the non-inverted mapping. The owner's
instruction is explicit: dark is the same picture with the two colors
recoded.

## Alternatives

- Keep the inverted mapping (mostly-dark page): rejected — contradicts the
  owner's stated design intent and makes the two themes read as different
  designs.
- Author a separate dark gradient: rejected — duplicates a hand-tuned
  composition and drifts over time.

## Reason

One composition with per-theme color endpoints keeps both themes visually
consistent and makes future color tuning a two-value change.

## Consequences

- Dark mode shows a dim-lime field where light shows lime, and a dark paper
  band where light shows paper.
- Text contrast is guarded over both endpoints by
  `tests/check_theme_contrast.test.mjs`, including the endpoint mapping of
  the matrix itself.

## Revisit Conditions

- The dim lime field harms readability or perceived quality on real devices.
- The light background composition is redesigned.
