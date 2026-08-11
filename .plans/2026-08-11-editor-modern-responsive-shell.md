# Modernize the editor shell and responsive navigation

## Goal

Make the local content editor feel like a calm, modern writing product on iPad
landscape and desktop. Fix the overflowing create action, make the sidebar
collapsible, and refine status, search, and title controls without changing the
authoring workflow.

## Research Baseline

- Linear's 2024 redesign emphasizes hierarchy, alignment, and lower visual noise
  across sidebars, headers, filters, and panels:
  https://linear.app/now/how-we-redesigned-the-linear-ui
- Linear's 2026 refresh dims navigation and standardizes header controls so the
  main work surface remains dominant:
  https://linear.app/now/behind-the-latest-design-refresh
- Notion lets users resize or hide the sidebar, treating navigation as a flexible
  aid rather than permanent chrome:
  https://www.notion.com/en-gb/help/navigate-with-the-sidebar
- Ghost keeps preview and publishing actions at the top of the editor while the
  document remains the visual focus:
  https://ghost.org/help/publishing-content/

## Current Findings

- At a 1024 px iPad-landscape viewport, the 248 px sidebar keeps the three content
  tabs and `New` button on one line. Their combined width crosses the sidebar's
  right boundary.
- The 900 px compact breakpoint means iPad landscape uses the permanent desktop
  sidebar, but only compact layouts expose a close control.
- The header status uses a filled SmartHR `StatusLabel`; its color and capsule
  treatment compete with the primary publish action and do not match the quiet
  application chrome.
- The title input removes all inline padding, making text sit directly on the
  field edge.
- The list search is a generic full-outline input with no search affordance or
  differentiated surface, which contributes to the administrative-system feel.
- The same shell and control styling appears at 1440 px desktop, so this is a
  shared hierarchy problem rather than an iPad-only patch.

## Scope

- Add an always-available sidebar toggle. On desktop and iPad landscape, collapse
  the sidebar into the application edge and let the document use the released
  width. Preserve the existing modal drawer behavior at compact widths.
- Keep the sidebar open by default on wider screens and closed by default on
  compact screens. Preserve focus return, Escape, scrim, and dialog semantics.
- Recompose the sidebar header so the content-kind control and create action stay
  inside the sidebar at 901–1180 px and at browser text zoom.
- Replace the visually heavy header status chip with a compact, low-emphasis state
  indicator that retains status text and semantic color.
- Give the title field comfortable inline padding, restrained hover/focus states,
  and a modern document-title rhythm without turning it into a boxed form field.
- Use SmartHR's search-specific input affordance and editor-local styling for a
  quieter search surface. Keep its accessible name and filtering behavior.
- Harmonize sidebar spacing, button density, borders, surfaces, and active states
  around the existing cool-neutral editor theme. Keep Publish as the only strong
  action.

## Non-goals

- Changing content storage, creation, saving, publishing, history, preview,
  Markdown editing, or About field behavior.
- Replacing SmartHR UI, adding another component library, copying another
  product's branding, or adding decorative gradients, glass, illustration, or
  animation.
- Changing the public website or the content rendered inside the preview iframe.
- Reworking the mobile formatting toolbar or editor information architecture.

## Assumptions

- “Simple but polished” means fewer competing fills and outlines, clearer spacing
  and hierarchy, predictable controls, and a document-first canvas.
- The existing cool-neutral and restrained indigo theme remains appropriate; the
  problem is composition and component treatment, not the brand palette.
- Collapsing the sidebar is a reversible view preference and does not alter editor
  data.

## Steps

1. Add wide-layout sidebar visibility state and a header toggle while preserving
   the existing compact drawer interaction and accessibility behavior.
2. Refine the sidebar header layout and responsive CSS so tabs, create, search,
   and filter controls never cross the sidebar boundary.
3. Replace the header status presentation with a quiet semantic indicator and
   rebalance the save/publish action group.
4. Refine the title and search field structure, spacing, focus treatment, and
   typography using existing SmartHR primitives.
5. Normalize the surrounding shell spacing, borders, and active/hover states to
   make navigation recede and the document surface lead.
6. Add component and CSS regression tests for sidebar toggling, iPad-width
   containment, title padding, search semantics, and status presentation.

## Verification

- Run component tests covering wide sidebar open/close/reopen, compact drawer
  behavior, focus return, search filtering, creation, save state, and publish
  actions.
- Inspect real editor screenshots at 1024 × 768 (iPad landscape), 1180 × 820,
  1440 × 1000, and 1920 × 1080 with the sidebar both open and collapsed.
- At 1024 px and 200% text-only zoom, verify the create action, kind selector,
  search, and filter remain usable without lost content or functionality.
- Separately render a 512 px CSS viewport, equivalent to 200% full-page zoom on a
  1024 px display, and verify `scrollWidth <= clientWidth` with the sidebar open
  and collapsed.
- On desktop, open a published item and inspect title, published/dirty/saving
  states, save/publish hierarchy, split view, and collapsed-sidebar document
  width.
- Run keyboard-only and focus-visible checks, including Escape for the compact
  drawer and return focus to the toggle.
- Run `npm run editor:build`, focused component/style tests, and
  `python3 scripts/verify.py`.

## Open Issues

- Approved and implemented on 2026-08-11 on
  `feat/editor-modern-responsive-ui`.
- The existing large `MarkdownEditor` chunk warning remains unchanged. No runtime
  dependency or asset was added, and the initial editor JavaScript bundle became
  slightly smaller in the verified production build.
