# Plan

## Goal

Fix the current top bar and Blog toolbar issues: keep page links visually centered, add clear spacing between navigation and language/theme controls, reduce unnecessary space before the article list, make Blog icon controls feel like controls, and make filter/sort popovers readable without spilling off screen.

## Scope

- Top bar layout CSS.
- Blog toolbar CSS.
- Blog filter/sort dropdown placement and width.
- Verification with the repository verification script and UI inspection.

## Non-goals

- Redesigning the entire navigation model.
- Changing route structure, content data, or search behavior.
- Reworking the site background/noise implementation.

## Assumptions

- Page navigation should remain in the top bar.
- Language and theme controls should remain visible in the top bar, but read as a separated utility area.
- Blog search/filter/sort controls should stay icon-only with accessible labels.

## Steps

1. Adjust the top bar grid so links stay centered on desktop and mobile.
2. Add spacing and subtle utility separation between navigation and language/theme controls.
3. Tighten the Blog page vertical rhythm between the top bar, hidden page heading, toolbar, and article list.
4. Restyle Blog icon buttons as distinct touch/click targets without adding text.
5. Give filter/sort popovers a non-transparent surface, larger readable dimensions, and viewport-aware constraints.
6. Change sort dropdown alignment so it opens from the icon group without overflowing off screen.
7. Run verification and inspect desktop/mobile UI with Playwright if available.

## Verification

- `python3 scripts/verify.py`
- `git diff --check`
- Desktop and mobile UI inspection for top bar, Blog toolbar, and popovers.

## Open Issues

- None.
