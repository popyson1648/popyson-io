# Plan

## Goal

Review the current top bar page-link placement and Blog filter UI, then define a focused improvement plan based on UI/UX best practices and accessibility.

## Scope

- `src/components.jsx`
  - Top bar structure if layout grouping needs semantic or DOM support.
- `src/blog.jsx`
  - Blog filter bar structure if the filter controls need clearer grouping.
- `src/app.css`
  - Top bar alignment, grouping, responsive behavior, and filter bar visual treatment.

## Non-goals

- Do not change site routes or content.
- Do not redesign the full visual identity; keep the current quiet, risograph/noise atmosphere.
- Do not revisit unrelated component background decisions unless they directly affect the top bar or filter bar.

## Assumptions

- The concern about the top bar is visual balance inside the floating bar, not the bar's page-level position.
- The filter UI should remain compact, but it needs clearer hierarchy and better visual grouping.
- RSS remains available from the Blog filter area, but should not compete with filtering controls.

## Findings

- The top bar is horizontally centered as a container, but its internal layout places page links first and utility controls after them. Because tools occupy the right side, the page-link group appears left-biased inside the floating bar.
- The Blog filter bar uses a single wrapped row for label, add filter, active filter pills, sort, result count, and RSS. That makes controls with different jobs feel like one uneven cluster.
- Active filter pills use underlines and subtle backgrounds, but they do not form a clearly readable "active filters" region.
- The `View` label feels generic and does not explain the task as well as a filter/sort label would.

## Research Notes

- Nielsen Norman Group's menu checklist recommends visible primary navigation in headers on websites, clear labels, and a visible current-location cue.
- Nielsen Norman Group also separates utility navigation from primary navigation in examples so utility links do not distract from primary tasks.
- Material Design filter-chip guidance treats filter chips as controls that narrow content and show selected state directly in context.

## Recommended Direction

1. Top bar: make the nav group visually centered by reserving balanced side slots.
   - Use a three-part layout: left spacer/brand-sized affordance, centered page nav, right utility cluster.
   - Keep search, language, and settings on the right as utilities.
   - Preserve the current floating blurred top-bar atmosphere.
2. Top bar: keep mobile usable by allowing page nav to scroll or compress independently.
   - On narrow screens, avoid forcing utilities to squeeze the nav.
   - Keep touch targets at practical size and avoid hidden overflow clipping of active links.
3. Filter UI: separate filter tasks from secondary actions.
   - Create a filter shell with a small header row: label, result count, and RSS/secondary action.
   - Put "add filter" and active pills in a coherent filter row.
   - Put sort in a visually distinct compact control, aligned to the right when space allows.
4. Filter UI: make active state more legible without adding heavy card styling.
   - Use subtle border/underline/accent treatment for active filter pills.
   - Keep the bar background consistent with the existing blurred filter UI decision.
5. Accessibility and interaction:
   - Ensure all controls remain buttons/links with labels and `aria-expanded` where relevant.
   - Keep wrapping predictable and avoid controls changing size when filters are added.

## Steps

1. Adjust top bar CSS to use balanced internal layout and centered nav.
2. Restructure or restyle the Blog filter bar into grouped filter, sort, count, and RSS areas.
3. Review mobile breakpoints for top bar and filter bar wrapping.
4. Run `python3 scripts/verify.py`.
5. If browser automation is available, inspect desktop and mobile layouts; otherwise report the limitation.

## Verification

- `python3 scripts/verify.py`
- Source review for semantic grouping and keyboard/a11y preservation.
- Visual browser check if the environment can run it.

## Open Issues

- The exact amount of visual separation in the filter bar may need one iteration after seeing it in the browser.
