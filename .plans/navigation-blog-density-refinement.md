# Plan

## Goal

Refine the Blog toolbar, top bar grouping, and page headings based on UI/UX and accessibility principles so the interface has clearer meaning, better visual balance, and less unnecessary chrome.

## Scope

- Blog list controls:
  - Remove always-visible text such as the default tag label, sort state, and count when it does not add decision value.
  - Keep icon-only search, filter, and sort controls accessible with labels.
  - Show filter state only when filters are active.
- Top bar:
  - Reconsider the visual separation between page navigation and language/theme preferences.
  - Keep navigation and preferences conceptually separated, but reduce the strength of the rounded grouped container if it creates visual imbalance.
  - Rebalance alignment and spacing so page links do not feel pushed too far left.
- Page headings:
  - Review whether large page labels such as "Blog" and "App" are useful.
  - Preserve accessible page structure, but reduce or visually hide redundant headings if the page content already provides enough orientation.

## Non-goals

- Do not redesign the site atmosphere, typography system, or background treatment.
- Do not change routing, data model, article content, or search behavior beyond the Blog toolbar presentation.
- Do not merge or revert unrelated existing worktree changes.

## Assumptions

- W3C WAI guidance supports headings for page structure and assistive navigation, so page headings should not simply disappear from the accessibility tree.
- Nielsen Norman Group usability heuristics support reducing nonessential visible information and relying on recognition over recall.
- Apple HIG guidance supports clear visual hierarchy and distinguishing controls from content without over-emphasizing low-priority controls.
- Navigation links and preferences are different task groups, but the visual treatment should be quieter than the primary page navigation.

## Steps

1. Inspect current Blog toolbar, top bar, and page heading CSS/markup.
2. Update Blog toolbar so default state text is removed; active filters remain visible and clearable.
3. Tune top bar spacing and preference controls to make page navigation feel centered and balanced while keeping language/theme discoverable.
4. Reduce large page-heading prominence or visually hide redundant headings while preserving semantic structure.
5. Run repository verification and perform a final code review.

## Verification

- Run `python3 scripts/verify.py`.
- If browser automation is unavailable, report that limitation and rely on build/static accessibility checks plus code inspection.

## Open Issues

- Exact visual balance may still need a browser screenshot pass if Playwright or a local preview server is unavailable in the sandbox.
