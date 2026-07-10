# Plan

## Goal

Remove the moiré-like blotching visible in the dark theme background grain.

## Scope

- `src/app.jsx`: background noise parameters (`RISOGRAPH_DEFAULTS`, `createNoiseUrl`).
- `src/styles.css`: pre-hydration fallback `--noise-url`.

## Non-goals

- Riso circle noise/edges (`circleNoiseFrequency`, distortion) — circles are slated for a separate redesign.
- Text noise (currently unused: `--text-noise-url` is set to `none` at runtime).
- Theme colors or blend modes.

## Assumptions

- The blotching is aliasing: `feTurbulence baseFrequency=15.5, numOctaves=3` on a 200-unit viewBox rendered at 200px is ~15 cycles per pixel, far past what a pixel can represent. `feTurbulence` does not anti-alias, so the undersampled lattice folds into low-frequency blotches that tile every 200px. Light hides it (multiply on cream); dark exposes it (screen on near-black).

## Steps

1. Set `bgNoiseFrequency` to 0.9 and add `bgNoiseOctaves: 2`; thread the octave count through `createNoiseUrl`.
2. Update the `--noise-url` fallback in `styles.css` (was `baseFrequency=41`) to the same parameters.

## Verification

- Side-by-side render of current vs. proposed noise in both themes (headless Chrome).
- `python3 scripts/verify.py` (format, lint, typecheck, build, unit/integration/component tests, static a11y, Lighthouse).
- Built `dist/` served via `vite preview`, screenshots of dark and light themes.

## Open Issues

- `circleNoiseFrequency: 33` and `textNoiseFrequency: 25` alias the same way; left for the circle redesign.
