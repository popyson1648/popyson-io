# Plan

## Goal

Apply the blog search modal backdrop blur treatment to the blog filter/sort UI, and make the filter/sort popup float above the post list without moving content underneath.

## Scope

- Update the blog filter/sort CSS in `src/app.css`.
- Reuse the same blur/filter strength as the blog search modal backdrop.
- Keep the popup aligned with the existing toolbar and responsive on mobile.

## Non-goals

- Do not redesign the blog toolbar or post list.
- Do not change filtering or sorting logic.
- Do not modify unrelated navigation or search modal behavior.

## Assumptions

- The current branch `feature/topbar-blog-ui-refine` is the intended dedicated branch.
- The final CSS overrides at the end of `src/app.css` are the safest place to adjust the current behavior.

## Steps

1. Inspect the final effective filter/sort CSS and confirm why the panel still affects layout or lacks the intended blur.
2. Adjust `.fbar-wrap`, `.fpanel`, and related pseudo-element rules so the popup is absolutely positioned and visually frosted like `.modal-overlay`.
3. Verify responsive behavior with a local build and the repository verification command for edit-time checks.

## Verification

- Run `python3 scripts/verify.py --mode edit`.
- Run `npm run build` if not covered by the selected verification mode or if CSS changes need a production build check.

## Open Issues

- None known before implementation.
