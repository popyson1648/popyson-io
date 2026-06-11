# Plan - Align Filter/Sort UI Backdrop Blur with Search Modal

## Goal

Align the backdrop-filter and background blur settings of the filter/sort menu and dropdowns (`.fbar .menu` and `.topbar .menu`) to match the search modal backdrop blur.

## Scope

- Apply the shared backdrop filter CSS variables (`var(--search-backdrop-filter)`) to `.fpanel`, `.fbar-controls`, `.fbar .menu`, and `.topbar .menu`.
- Increase the transparency of these smaller components (reducing background opacity to `20%` and removing the extra white gradient overlay) so that the background content actually bleeds through and the 64px blur effect becomes visually distinct.
- Remove overriding `backdrop-filter: none !important` rules that prevent the blur effect from rendering on these menus.
- Ensure styling consistency across PC and mobile views.

## Non-goals

- Do not change the layout or sizing of the menus.
- Do not modify Javascript logic or components.
- Do not affect unrelated styling.

## Assumptions

- The canonical backdrop values are defined in `src/styles.css` under the `--search-backdrop-...` variables.
- Applying `blur(64px)` to small elements requires higher transparency (lower background opacity) to be visually recognizable, otherwise they look completely opaque against the default light background.

## Steps

1. Review `src/app.css` to locate all rules overriding `backdrop-filter` or `background` on `.fbar .menu` and `.topbar .menu`.
2. Update the style rules (around line 3388 or via new overrides) to apply the shared backdrop CSS variables to `.fbar .menu` and `.topbar .menu`.
3. Ensure `backdrop-filter: none !important` is not overriding them anymore.
4. Verify using `python3 scripts/verify.py` to make sure linting and building pass.

## Verification

- Run `python3 scripts/verify.py`.
- Confirm in a browser that the dropdown menus have the same frosted-glass blurring style as the search modal overlay.

## Open Issues

- None.
