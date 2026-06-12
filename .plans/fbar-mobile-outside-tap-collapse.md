# Plan

## Goal

Fix the mobile `fbar-control` behavior so tapping outside an expanded search, filter, or sort control collapses it back to the initial three-icon state.

## Scope

- Inspect the existing `BlogList` floating bar open/close logic.
- Update outside-interaction handling to cover mobile taps reliably.
- Keep keyboard Escape and existing focus restoration behavior intact.
- Verify the behavior with the repository verification command and, if feasible, a browser interaction check.

## Non-goals

- Redesign the floating bar UI.
- Change filter, sort, or search result behavior beyond closing on outside tap.
- Merge or commit changes automatically.

## Assumptions

- The current `mousedown` document listener is insufficient for mobile tap behavior.
- A pointer-based outside interaction listener can cover mouse, touch, and pen without adding duplicate close events.

## Steps

1. Confirm the current event boundary for `.fbar-wrap` and the expanded panel DOM.
2. Create a dedicated work branch if the current branch is not already dedicated to this fix.
3. Replace or supplement the outside-click listener with mobile-safe pointer handling.
4. Run `python3 scripts/verify.py`.
5. Perform a focused UI check for opening search and tapping outside the control.

## Verification

- `python3 scripts/verify.py`
- Focused browser check on a mobile-sized viewport if the local app can be run.

## Open Issues

- Existing uncommitted changes are present in this worktree; this fix should avoid reverting or rewriting unrelated changes.
