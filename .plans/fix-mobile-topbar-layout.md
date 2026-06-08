# Plan

## Goal

Fix the mobile top bar so it stays within the viewport and remains usable without visual breakage.

## Scope

- Update `src/app.css` only.
- Adjust the existing top bar responsive rules for narrow screens.
- Keep the current desktop-centered top bar and current blur policy for `.topbar`, `.fbar`, and `.seg-filter`.

## Non-goals

- Do not change routes, labels, theme behavior, language behavior, search behavior, or RSS behavior.
- Do not redesign non-topbar components.
- Do not reintroduce component backgrounds outside the currently approved blurred top/filter controls.

## Assumptions

- On mobile, primary navigation should stay directly accessible.
- Search, RSS, language, and theme are secondary controls and may be compacted more aggressively than navigation.
- Horizontal scrolling inside the navigation group is acceptable if it prevents overflow and keeps touch targets usable.

## Steps

1. Make the top bar fill the available mobile width instead of using content width.
2. Allow the navigation group to take remaining space and scroll horizontally without expanding the bar.
3. Keep the tools group fixed-width and compact at small widths.
4. Reduce gaps, padding, and control sizes only at mobile breakpoints.
5. Scan CSS to ensure the blur/background policy remains limited to the top bar and filter UI.
6. Run `python3 scripts/verify.py --mode edit`.

## Verification

- Static CSS inspection with `rg`.
- `python3 scripts/verify.py --mode edit`.
- Browser preview if this environment permits binding a local port.

## Open Issues

- Local preview has previously failed in this sandbox with `listen EPERM`.
