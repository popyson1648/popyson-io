# Plan

## Goal

Use the blog search modal backdrop blur values as shared CSS variables, then apply those same variables to the blog filter/sort UI.

## Scope

- Add shared backdrop variables based on the current `.modal-overlay` values.
- Update `.modal-overlay` to use the variables as the source of truth.
- Update `.fbar-controls` and `.fpanel` so they use the same variables directly instead of duplicated literal blur/background values.
- Keep the existing floating panel behavior.

## Non-goals

- Do not redesign the toolbar, filter menu, sort menu, or search modal.
- Do not change filtering, sorting, or search behavior.
- Do not touch unrelated topbar/menu blur rules unless required to prevent override conflicts.

## Assumptions

- The desired canonical value is the current search modal value:
  `blur(64px) saturate(190%) brightness(1.08) contrast(0.92)`.
- The filter/sort surfaces should receive that value from the same CSS variable, not from copied literals.

## Steps

1. Define shared CSS variables for the search backdrop background, gradient, and backdrop-filter values.
2. Replace `.modal-overlay` literal background/filter values with those variables.
3. Replace filter/sort toolbar and floating panel backdrop values with the same variables, applying them to the actual surfaces where possible.
4. Verify with `python3 scripts/verify.py --mode edit` and browser computed styles.

## Verification

- Run `python3 scripts/verify.py --mode edit`.
- Use browser computed styles to confirm `.modal-overlay`, `.fbar-controls`, and `.fpanel` resolve to the same backdrop-filter value.
- Confirm opening filter/sort does not move the first blog card.

## Open Issues

- None known before implementation.
