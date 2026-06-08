# Plan

## Goal

Create a `.tmp/` prototype that rewrites this site's current noise/background idea in the style of the referenced Gist.

## Scope

- Add prototype files under `.tmp/` only.
- Keep production files unchanged.
- Express the current site background using a `.grain`-style element with gradient/color surface plus `::before` and `::after` SVG turbulence noise layers.
- Include notes mapping the current implementation concepts to the Gist-style structure.

## Non-goals

- Do not replace the production implementation in `src/`.
- Do not change routes, components, theme behavior, or build config.
- Do not create root-level files outside `.plans/` and `.tmp/`.

## Assumptions

- The prototype should be readable and easy to copy into production later if approved.
- `.tmp/` should be excluded through `.git/info/exclude` if it is not already excluded.
- A small standalone HTML/CSS prototype is more useful than a source patch because the user asked to write it under `.tmp/`.

## Steps

1. Check whether `.tmp/` is excluded in `.git/info/exclude`; add it if needed.
2. Create `.tmp/gist-style-noise.html` as a standalone preview.
3. Create `.tmp/gist-style-noise.css` with a Gist-like `.grain` implementation.
4. Add comments that map `bg-noise`, `grain-circle`, and generated SVG turbulence to the new structure.
5. Run a lightweight syntax/file inspection.

## Verification

- Confirm `.tmp/` files exist and are not tracked.
- Inspect the generated CSS and HTML with `rg`.
- No project build is required because production files are unchanged.

## Open Issues

- Browser preview may not be possible in this sandbox if local port binding is blocked.
