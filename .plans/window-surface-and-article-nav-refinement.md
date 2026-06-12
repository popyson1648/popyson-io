# Plan

## Goal

Refine the blog and reading UI so window surfaces, shadows, top bar blur, article navigation, and TOC placement match the requested behavior across desktop and mobile.

## Scope

- Fix mobile blog search popup horizontal alignment.
- Restyle Reading List `all / unread / read` filters as a pill control similar to `.fbar-controls`.
- Remove shadows from site window surfaces such as top bar, TOC, search/filter popups, menus, and related floating panels.
- Make desktop top bar use the same backdrop blur behavior as mobile.
- Make the article "back to blog list" navigation sticky at the top on desktop and mobile, with transparent background and no blur.
- Move the desktop article TOC window from the left side to the right side.
- Rework top bar/search/filter/TOC surface styling so the affected windows visually match the top bar, using a root-level surface definition instead of relying on nested transparent blur.

## Non-goals

- Redesign article content, search behavior, filtering behavior, or routing.
- Change Reading List data or persistence behavior.
- Clean up all historical CSS overrides beyond the rules needed for this task.

## Assumptions

- "Window shadows" means decorative `box-shadow` on app UI surfaces, not text focus outlines or functional borders.
- "Same as top bar background" should mean the same final visible surface, not merely equal computed `background-color` and `backdrop-filter`.
- Because transparent frosted surfaces can look different when nested or when different content sits behind them, define a root-level resolved surface color/image and apply that consistently to top bar, search/filter popups, and TOC windows.
- On mobile, article navigation should keep the back and TOC buttons sticky, but the sticky bar background should be transparent.

## Steps

1. Add/adjust root surface tokens for the topbar/window background so they produce a consistent visible surface outside and inside nested containers.
2. Update late-winning CSS rules for `.topbar`, `.fbar-controls`, `.fbar-results`, `.fbar-pop`, `.article-toc`, `.article-mobile-toc`, and menu-like windows to use the root surface tokens and no shadows.
3. Center mobile `.fbar-results` / `.fbar-pop` popups relative to the viewport-safe width so left/right margins match.
4. Restyle `.seg-filter` as a pill control matching the `.fbar-controls` pattern.
5. Change article navigation:
   - desktop `.article-back` becomes sticky near the top;
   - mobile `.article-mobile-nav` remains sticky but transparent and unblurred;
   - desktop `.article-toc` moves to the right.
6. Run `python3 scripts/verify.py`.
7. Use browser checks on desktop and mobile for visual layout, popup margins, no surface shadows, topbar blur, sticky article nav, right-side desktop TOC, and matching window surfaces.

## Verification

- `python3 scripts/verify.py`
- Browser checks:
  - mobile blog search popup left/right margins
  - Reading List filter pill appearance
  - desktop and mobile top bar backdrop behavior
  - no `box-shadow` on requested UI windows
  - desktop article back button sticky and TOC right placement
  - mobile article nav transparent
  - search/filter/TOC windows visually and structurally share the top bar surface rules

## Open Issues

- The worktree already contains unrelated uncommitted changes. This task will not revert them.
