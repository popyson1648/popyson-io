# Plan

## Goal

Make the blog search results window, tag selection window, title search window, body search window, and article table-of-contents windows use the same background as the top bar.

## Scope

- Identify the final winning CSS rules for the top bar background.
- Update only the affected window surfaces:
  - `.fbar-results`
  - `.fbar-pop`
  - `.article-toc`
  - `.article-mobile-toc`
- Keep existing layout, sizing, focus behavior, and filtering/search behavior unchanged.

## Non-goals

- Redesign the blog toolbar.
- Change search, filter, sort, or TOC behavior.
- Refactor older accumulated CSS overrides beyond what is needed for this request.

## Assumptions

- The "top bar background" means the final computed `.topbar` frosted surface, currently defined by the late CSS rule that uses `--search-backdrop-bg`, `--search-backdrop-image`, and `--search-backdrop-filter`.
- The tag/title/body windows are all rendered by `.fbar-pop`; the active filter tab changes the content inside that same popup.
- The article TOC windows are `.article-toc` on desktop and `.article-mobile-toc` on mobile.

## Steps

1. Add a shared CSS selector/rule for these popup and TOC surfaces so they use the same background, background image, backdrop filter, and inset highlight as `.topbar`.
2. Remove or override conflicting later CSS that makes those surfaces diverge from the top bar background.
3. Run the repository verification command.
4. Start the local app and inspect the affected windows on desktop and mobile with browser automation.
5. If visual or functional issues appear, adjust the CSS and repeat verification.

## Verification

- `python3 scripts/verify.py`
- Browser checks for:
  - blog search results popup
  - tag filter popup
  - title filter popup
  - body filter popup
  - desktop article TOC
  - mobile article TOC popup

## Open Issues

- Existing worktree has unrelated uncommitted changes; this task will avoid reverting them.
