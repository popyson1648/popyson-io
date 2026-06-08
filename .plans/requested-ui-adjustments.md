# Plan

## Goal

Implement the requested UI adjustments for the global layout, blog list, top page, reading list, and about page.

## Scope

- Top bar positioning, grouping, spacing, and visual affordance.
- Card and surface backgrounds.
- Blog list layout and page alignment.
- Top page secondary navigation content.
- Reading List item content structure.
- About page activity disclosure UI.

## Non-goals

- Change the current risograph visual direction.
- Replace routing, data loading, or the overall React structure.
- Merge changes automatically.

## Assumptions

- "Card background should match the page background" means card-like surfaces should use `var(--bg)` or transparent-over-`var(--bg)` rather than a distinct surface fill.
- "Top navigation under Notes in Lines should remove text" means the top-page link cloud should keep the numeric navigation links but hide/remove the text labels.
- "Email is not a link" refers to the About profile link list entry whose label is `xxx at gmail.com`.
- Reading List URL means the existing `source` field should be shown as plain URL/source text next to the date.
- Activity details can use existing activity text as the summary and a short localized detail derived from the existing content unless more detailed data is later provided.

## Steps

1. Global layout and top bar
   - Center the fixed top bar horizontally.
   - Split navigation and tool controls into visually distinct groups with spacing between them.
   - Style the theme selector as a clear grouped segmented control.
   - Normalize card/surface backgrounds to match the page background while preserving borders and focus states.
   - Fix the Blog page offset/alignment so it matches other pages.

2. Blog list
   - Force blog post listings to a horizontal row/card layout.
   - Keep the same horizontal layout on mobile.
   - Ignore or remove the grid-list tweak behavior for Blog if it conflicts with the requested design.

3. Top page
   - Remove the text labels from the top-page navigation under the brand title.
   - Keep the navigation accessible with `aria-label` values.

4. Reading List
   - Display title first.
   - Under the title, display date then source/URL from the left.
   - Remove tags and summary/note from the visible item layout.
   - Keep reading-state controls accessible.

5. About page
   - Render activity items as toggle/disclosure controls.
   - Add accessible expanded state and localized details.
   - Render the email profile entry as plain text, not a link.

6. Verification
   - Run `python3 scripts/verify.py --mode edit`.
   - Run `npm run build` if needed for bundle/output confirmation.
   - Attempt preview/UI verification if the environment allows a local server.

## Verification

- `python3 scripts/verify.py --mode edit`
- Source-level check for:
  - centered top bar and grouped controls,
  - horizontal blog list on desktop and mobile,
  - top-page links without visible text labels,
  - Reading List content order,
  - About activity disclosure semantics,
  - email profile entry as text.

## Open Issues

- Branch creation failed because `.git` is read-only in this environment.
- Live browser preview may remain blocked by `listen EPERM`.
- User approval was given and the requested source-level UI changes were implemented.

## Implementation Notes

- Centered the top bar and grouped navigation, actions, and theme controls.
- Matched card-like backgrounds to the page background while keeping borders and focus-visible behavior.
- Made the Blog listing a horizontal row-style list on desktop and mobile.
- Removed visible text labels from the top page navigation while preserving accessible labels.
- Simplified Reading List items to title, date, and source text.
- Rendered email as plain text instead of a link.
- Converted About activities into accessible toggle/disclosure controls.
