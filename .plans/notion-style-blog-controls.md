# Plan

## Goal

Redesign the Blog controls to follow a Notion-like database toolbar: icon-only search, filter, and sort controls, in that order.

## Scope

- Remove the Blog/article search button from the top bar.
- Add a Blog-local icon toolbar ordered as:
  - search icon
  - filter icon
  - sort icon
- Keep search behavior as the existing modal window.
- Keep filter and sort behavior, but move them behind compact popover controls.
- Keep active filter chips and result count visible outside the icon buttons so the current state remains understandable.
- Preserve RSS outside the filter/sort UI.
- Keep keyboard and screen-reader labels for all icon-only buttons.

## Non-goals

- Do not change the search algorithm or result rendering.
- Do not redesign blog post cards.
- Do not change top bar navigation or theme behavior beyond removing search there.

## Research Notes

- Notion documents database search as a magnifying-glass control at the top of the database view, and Filter/Sort as view-level controls in the same area.
- Notion supports icon-only display for compact database view tabs, but still keeps controls discoverable through labels/tooltips and menu context.
- Linear uses a similar pattern: list/board filtering opens from a Filter button above the view, and the menu then handles condition selection.

## Steps

1. Update `TopBar` so it no longer renders the search button.
2. Pass `openSearch` into Blog and add the local search icon as the first Blog toolbar control.
3. Convert Blog filter and sort buttons back to icon-only controls, ordered search/filter/sort.
4. Keep active filter chips/result count as compact state indicators next to or below the icon cluster.
5. Adjust CSS so the icon cluster feels like one toolbar, wraps cleanly on mobile, and does not become bulky.
6. Run `python3 scripts/verify.py`.

## Verification

- Run `python3 scripts/verify.py`.
- Review JSX/CSS for accessible names, active states, and mobile wrapping.

## Open Issues

- Local screenshot verification depends on available browser tooling and server permissions.
