# Plan

## Goal

Replace the previous UI/UX patch with a production-quality correction: elegant top navigation, readable but refined typography, consistent spacing, and a calmer visual hierarchy.

## Scope

- Undo the low-quality parts of the latest UI/UX refresh.
- Keep only changes that are still defensible, such as avoiding clipped navigation and not using extremely small visible text.
- Redesign the top bar with production-grade responsive behavior.
- Tune typography and spacing using a restrained scale rather than blanket enlargement.
- Verify visually on mobile and desktop.

## Non-goals

- Do not change the site background/noise policy.
- Do not redesign content, routing, data, or the risograph implementation.
- Do not introduce a component library.
- Do not pursue a generic SaaS clone aesthetic.

## Research Notes

- Linear emphasizes reduced visual noise, alignment, hierarchy, and navigation density. This means the top bar should stay compact and precise, not become a large two-row block.
- Atlassian spacing guidance uses a limited spacing scale, commonly based on 8px, to create rhythm and semantic grouping. The current patch violates this by adding broad one-off overrides.
- Atlassian typography guidance distinguishes long-form body text, default UI body text, and small secondary text. The correction should use role-based sizes rather than raising everything.
- Vercel Geist and modern developer-tool UI rely on restrained typography, strong alignment, high contrast, and quiet components. This site should keep its own risograph identity while adopting that level of discipline.
- Beautiful UI here should mean editorial/product hybrid: compact navigation, confident page titles, airy article content, and list rows that scan cleanly.

## Steps

1. Back out the latest low-quality override layer.
   - Remove the `UI/UX refresh: navigation and readable type` block from `src/app.css`.
   - Revert the placeholder label size only if it looks visually worse at 13px; otherwise keep it modest.
   - Preserve unrelated prior work and the existing background policy.

2. Rebuild the top bar cleanly.
   - Desktop: one centered pill, compact height around 40-44px, nav and tools aligned on one baseline.
   - Tablet/mobile: keep one row when possible, but do not make the bar visually heavy.
   - For very narrow widths, reduce labels intentionally rather than making a two-row toolbar. Candidate: `Reading List` becomes `Reading` through CSS/JS label logic or responsive string selection.
   - Keep touch targets reasonable without inflating the entire header.

3. Create a restrained type scale.
   - Article/body: 16-17px with generous line-height.
   - Main UI/list titles: 15-18px depending on hierarchy.
   - Metadata: 12.5-13.5px allowed when secondary and high contrast enough.
   - Avoid blanket selectors that make every label the same size.

4. Rework vertical rhythm.
   - Use a small spacing scale: 4, 8, 12, 16, 24, 32, 48, 64.
   - Fix pages that feel vertically pinned by tuning `app-main`, `.page-head`, top page, Blog list, Reading List, About, App, and article headers.
   - Keep the visual rhythm compact enough to feel intentional.

5. Visual verification.
   - Build and serve `dist/`.
   - Check 320, 375, 430, 768, 1280 widths.
   - Confirm top bar is not clipped and not visually dominant.
   - Confirm typography feels refined, not oversized or generic.

6. Required checks.
   - Run `python3 scripts/verify.py --mode edit`.
   - Report build warnings separately from errors.

## Verification

- `python3 scripts/verify.py --mode edit`
- Playwright snapshots/screenshots for:
  - 320px top page
  - 375px Blog
  - 375px Reading List
  - 1280px top page

## Open Issues

- Need user approval before applying the correction.
