# Plan

## Goal

Restore the page background/noise implementation to match `main`, especially in light mode.

## Scope

- Restore the background stack around `.grain-bg`, `.bg-noise`, `.grain-circle`, `.grain-noise`, and the dark background-noise override from `main`.
- Restore the root grain/noise CSS tokens that affect the background to the `main` shape.
- Keep unrelated dark-theme, topbar, blog, and content edits untouched unless they directly conflict with the restored background code.

## Non-goals

- Redesign the background.
- Change article/content behavior.
- Rework the theme menu or routing.
- Merge or reset unrelated worktree changes.

## Assumptions

- "Use `main`'s code for this background" means the page background/noise implementation should match `main` even if that also removes the previous circle-display switch.
- The previous "disable circles" commit should be corrected with a follow-up commit rather than rewriting history.

## Steps

1. Replace only the background/noise-related CSS differences with the corresponding `main` code.
2. Build and run the relevant verification.
3. Check light mode in the browser: `data-theme="light"`, body text color, `.grain-bg`, and `.bg-noise` computed styles.
4. Commit the fix separately.

## Verification

- `python3 scripts/verify.py`
- Browser/computed-style check for light mode background and text.

## Open Issues

- None.
