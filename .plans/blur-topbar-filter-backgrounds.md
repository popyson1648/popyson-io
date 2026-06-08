# Plan

## Goal

Apply a blurred translucent background only to the top bar and filter UI while keeping every other component background transparent.

## Scope

- Update `src/app.css` only.
- Add an override after the transparent component-surface rule.
- Target the top bar and Blog/Reading List filter controls only.

## Non-goals

- Do not restore backgrounds to cards, article lists, reading items, modals, menus, article TOC, code blocks, or tweak panel components.
- Do not change layout, copy, routing, or data.
- Do not change the site background layers.

## Assumptions

- “フィルターUI” means `.fbar` and `.seg-filter` as the visible filter control groups.
- Filter buttons/pills may stay transparent inside the blurred group so the group reads as one blurred surface.

## Steps

1. Add a CSS override after the global transparent component rule.
2. Give `.topbar`, `.fbar`, and `.seg-filter` the same translucent background, backdrop blur, and saturation values.
3. Keep nested filter/topbar buttons transparent except for existing text/border states.
4. Scan for unintended blur/background targets.
5. Run `python3 scripts/verify.py --mode edit`.

## Verification

- `rg` scan for `backdrop-filter` and the new selectors.
- `python3 scripts/verify.py --mode edit`.
- Browser preview only if the environment permits binding a port.

## Open Issues

- Preview has previously failed in this sandbox with `listen EPERM`.
