# Plan

## Goal

Make the white regions of the light-theme background render as the previous
paper (#fdfff7 cream + grain) so they match the topbar chrome, instead of the
greenish "plain white" they became with the grainy lime gradient (PR #73).

## Scope

- `src/app.css` only: the `.bg-gradient-noise` / `.bg-gradient-color` layers.
- Keep the lime field, its dithered rims, and the dark-theme `gg-dark-map`
  remap mechanism unchanged.

## Non-goals

- Redesign the gradient composition or bring back the riso circles.
- Change theme colors in `src/content/theme.toml`.
- Change the page grain (`.bg-noise`) or its opacity/frequency.

## Assumptions

- "White parts" means the paper regions of the gradient, especially the band
  across the top where the topbar sits. Measured on `main`, that band renders
  (236, 243, 201) — a lime-tinted white — while the topbar chrome and the old
  paper are ~(243, 245, 237), which is why the topbar no longer blends in.
- Root cause: the lime body's long alpha ramp in `.bg-gradient-noise` reaches
  the top edge (dithers the band yellow after the crush), and the color
  layer's base ramp starts from a paper/lime mix instead of plain paper.

## Steps

1. Add a white top strip to `.bg-gradient-noise` so the topbar zone crushes
   to plain white, with its lower edge dissolving into the grain dither.
2. Anchor the `.bg-gradient-color` base ramp at plain `--gg-paper` and hold
   it past the topbar zone (16%) before ramping to lime, matching the strip.
3. Verify light/dark, desktop/mobile in the browser against production and
   the pre-#73 paper background (pixel sampling + screenshots).
4. Run `python3 scripts/verify.py`.

## Verification

- Pixel sampling: top band now (243, 245, 235–237) — matches the previous
  paper and the topbar chrome; lime field unchanged (203, 245, 1).
- `python3 scripts/verify.py`.

## Open Issues

- None.
