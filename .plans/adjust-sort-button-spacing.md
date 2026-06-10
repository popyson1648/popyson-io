# Plan

## Goal

Adjust the spacing between the "Date / Kana" and "Asc / Desc" sort buttons in the sort panel to match the spacing around the top bar's vertical divider.

## Scope

- Modify `src/app.css` to update the layout spacing of `#sort-panel.fpanel`.

## Non-goals

- Do not change any layout other than the sort panel spacing.
- Do not modify JSX/JS logic.

## Assumptions

- The top bar's vertical divider is styled via `.tool-group-actions::before` and has a spacing of 10px on both sides:
  - Left side: 10px from `.topbar-inner`'s `gap` between the nav and the tools group.
  - Right side: 10px total from `.tool-group-actions`'s `gap: 6px` plus `margin-right: 4px` on the divider element.
- The sort panel's divider (`.menu-sep`) currently has a spacing of 12px on both sides due to `gap: 12px` on `#sort-panel.fpanel`.
- Reducing this `gap` from `12px` to `10px` on `#sort-panel.fpanel` will make the spacing match the top bar's vertical divider spacing (10px).

## Steps

1. Edit `src/app.css` to change `gap: 12px` to `gap: 10px` under the `#sort-panel.fpanel` selector (around line 3340).
2. Run project verification `python3 scripts/verify.py` to ensure all checks (linting, build, a11y, performance) pass.

## Verification

- Run `python3 scripts/verify.py`.

## Open Issues

- None.
