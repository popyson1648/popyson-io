# Plan

## Goal

Disable the decorative background circles in both light and dark themes without deleting the existing circle implementation.

## Scope

- Keep the existing `.grain-circle` markup, CSS rules, generated noise URLs, and filter setup in place.
- Add a reversible CSS-level disablement so the circles do not render in light or dark mode.
- Avoid changing the page grain/noise background unless it is directly tied to circle visibility.

## Non-goals

- Redesign the background.
- Remove the riso circle elements or related JavaScript/CSS infrastructure.
- Change theme colors, topbar styling, routing, or content behavior.

## Assumptions

- "Background circles" refers to `.grain-circle-1` and `.grain-circle-2` rendered inside `.grain-bg`.
- "Disable, not delete" means preserving the implementation so it can be re-enabled by changing a small CSS switch later.

## Steps

1. Add a CSS switch for circle visibility, defaulting to disabled for all themes.
2. Apply that switch to `.grain-circle` so both light and dark themes hide the circles while keeping markup and generation intact.
3. Leave existing dark-mode blend rules and circle color/noise rules in place for future re-enablement.
4. Run `python3 scripts/verify.py`.
5. If feasible, run a browser check for light and dark themes to confirm the circles are absent and background grain remains.

## Verification

- `python3 scripts/verify.py`
- Visual or computed-style check confirming `.grain-circle` is disabled in both light and dark themes.

## Open Issues

- None.
