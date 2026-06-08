# Plan

## Goal

Restore normal component backgrounds where they were unintentionally forced transparent, while keeping the top bar and Blog filter UI on the same site-background/noise treatment.

## Scope

- Inspect `src/app.css` for broad transparent background overrides.
- Remove or narrow transparent overrides that affect cards, content blocks, modals, reading list items, article list items, and general controls.
- Keep a single explicit background/noise rule for:
  - `.topbar`
  - Blog filter bar/dropdown UI: `.fbar`, `.menu`
- Preserve intentionally transparent sub-controls where transparency is part of the control design, such as icon buttons, label buttons, and inline menu buttons.

## Non-goals

- Redesigning layout, spacing, typography, or content structure.
- Changing React component markup unless CSS inspection shows it is required.
- Reworking the risograph/noise variables.

## Assumptions

- The latest user request supersedes the previous broad transparency request.
- Components other than the top bar and Blog filter shell should use their existing component-specific backgrounds from earlier CSS rules.
- The Blog filter shell should match the site background/noise values exactly.

## Steps

1. Audit the current transparency-related selectors and identify broad overrides.
2. Remove the broad final policy that forces components transparent.
3. Narrow the earlier no-fill background override so it does not include general cards/content containers.
4. Add or keep explicit shared background/noise settings for `.topbar`, `.fbar`, and `.menu`.
5. Re-scan CSS to confirm only intended broad overrides remain.
6. Run repository verification.

## Verification

- `rg` inspection for transparent/background override selectors.
- `python3 scripts/verify.py --mode edit`

## Open Issues

- Browser preview verification may remain unavailable if the local server cannot bind a port in this sandbox.
