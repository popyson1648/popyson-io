# Plan

## Goal

Fix the top bar visual quality and replace blurred Blog controls / Reading List tabs with UI treatments that fit the site's line-based risograph/paper style.

## Scope

- Review the current top bar, Blog filter/sort controls, and Reading List segmented filter styles.
- Remove blur/glass styling from those controls.
- Apply a more fitting alternative based on solid paper background, 1px lines, underline/ink selection states, and compact spacing.
- Preserve existing React behavior unless a small markup adjustment is required for accessible state display.
- Verify with the repository verification command and UI screenshots.

## Non-goals

- Redesign article layouts, search modal behavior, content data, or global theme tokens.
- Merge branches or commit changes automatically.

## Assumptions

- The current branch `risograph-noise-toc` is the dedicated working branch for this UI task.
- Existing uncommitted changes are intentional and must be preserved.
- The intended visual direction is closer to the repository's "No shadows. No gradients. 1px lines." design tokens than to translucent glass UI.

## Steps

1. Inspect effective CSS cascade for `.topbar`, `.fbar`, dropdown menus, and `.seg-filter`.
2. Implement a scoped final override that removes blur from top controls and replaces it with paper/line/ink states.
3. Adjust responsive behavior so the top bar fits on desktop and mobile without cramped or overlapping controls.
4. Run `python3 scripts/verify.py`.
5. Run the dev server and capture desktop/mobile screenshots for Blog and Reading List.
6. Review the final diff for unrelated changes and regressions.

## Verification

- `python3 scripts/verify.py`
- Browser screenshot checks at desktop and mobile widths for:
  - top bar
  - Blog filter/sort controls
  - Reading List tabs

## Open Issues

- Waiting for user approval before implementation.
