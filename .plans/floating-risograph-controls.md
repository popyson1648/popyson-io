# Plan

## Goal

Show the page underneath the risograph slider UI by making the tuning panel a floating overlay layer.

## Scope

- Move the risograph control panel out of normal page flow visually using fixed positioning.
- Keep it above the page content and below/alongside existing top navigation without blocking the entire page.
- Make the panel scroll internally if its content is taller than the viewport.
- Keep desktop and mobile layouts usable.

## Non-goals

- Do not remove the tuning panel.
- Do not persist panel open/closed state.
- Do not commit or merge automatically.

## Assumptions

- The user wants the site content to start behind/under the panel instead of being pushed down by it.
- A fixed top overlay is acceptable for the current experimental tuning phase.

## Steps

1. Update `.riso-controls` positioning to a fixed overlay with viewport-aware width and max height.
2. Ensure `.app-main` no longer depends on the control panel's layout position.
3. Adjust mobile sizing so the overlay does not overflow horizontally.
4. Verify with `python3 scripts/verify.py`.
5. Verify in browser that content appears underneath the overlay and the panel remains usable.

## Verification

- `python3 scripts/verify.py`
- Browser check on desktop and mobile for overlay placement, scrollability, and page visibility underneath.

## Open Issues

- None before implementation.
