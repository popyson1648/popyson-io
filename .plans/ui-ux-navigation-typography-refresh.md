# Plan

## Goal

Improve the site UI/UX so the top bar no longer clips items, the typography feels intentional and readable, and the layout avoids the small, vertically awkward, generic AI-app feel described by the user as "Claude-like".

## Scope

- Top bar layout and responsive behavior.
- Global UI typography scale for body text, page headers, controls, metadata, cards, lists, filters, and article surfaces.
- Vertical rhythm for page headers, list rows, cards, top page, article pages, Reading List, About, App, Blog, RSS, search modal, and filter UI.
- Accessibility-relevant sizing: readable text, 200% zoom resilience, focus/tap target sizing, and text wrapping.

## Non-goals

- No brand/content rewrite beyond labels needed for layout.
- No change to the settled background policy unless required by readability.
- No redesign of the risograph/noise implementation.
- No new framework or component library.

## Assumptions

- "Claude-like" is treated as a design smell, not a literal clone: small dense text, pill/card-heavy surfaces, low hierarchy, vertically off-center controls, and squeezed top navigation.
- On mobile, showing every top-level destination as text in a single fixed row is lower quality than preserving touch targets and hierarchy. A compact primary nav with a menu/secondary row is acceptable if it keeps every page reachable.
- WCAG does not mandate a fixed minimum font size, but WCAG 2.2 requires text to resize to 200% without loss of content/functionality. The practical target for this site should be 16px+ for body/content and 14px+ only for secondary metadata.

## Research Notes

- W3C WCAG 2.2: verify text resizing to 200%, contrast, and target sizing instead of relying only on fixed pixel rules.
- Apple HIG typography: use readable default/minimum sizes, test legibility in context, and avoid excessive truncation as text grows.
- Material top app bar guidance: top bars should provide consistent navigation/actions for the current screen; when space is constrained, prioritize structure over stuffing all actions into one row.
- Linear redesign notes: strong app UI comes from stress-testing hierarchy and structured layouts across views, not from decorative density.

## Steps

1. Audit current UI density in code.
   - Locate sub-14px text and cramped controls.
   - Identify pages where content appears vertically biased or visually underweighted.
   - Confirm which topbar items are essential primary navigation and which are tools.

2. Redesign top bar behavior.
   - Desktop/tablet: keep centered top bar, but make nav/tools widths explicit and prevent accidental clipping.
   - Mobile: change to a robust responsive pattern, likely a two-row compact bar or a nav menu for lower-priority destinations, so all pages remain reachable without horizontal clipping.
   - Keep search, RSS, language, and theme controls reachable with stable 40px+ touch targets where possible.

3. Establish a readable typography scale.
   - Add or normalize CSS variables for UI text, metadata, body, heading, and compact controls.
   - Raise normal UI text toward 15-16px.
   - Keep metadata at 14px where it is clearly secondary; avoid 12px except decorative counters or code labels.
   - Remove viewport-width font scaling where it makes text feel arbitrary.

4. Improve vertical rhythm and alignment.
   - Normalize line-height and min-height for buttons, nav links, chips, filters, list rows, and cards.
   - Rebalance page header margins and content spacing so pages do not feel pinned too high or too low.
   - Check Blog, Reading List, About toggles, App cards/rows, article header/toc, search modal, and top page.

5. Apply changes in existing files only.
   - Prefer `src/app.css` and minimal JSX changes in `src/components.jsx` only if the topbar structure needs a menu/toggle.
   - Preserve existing visual language, route behavior, accessibility attributes, and background/noise behavior.

6. Verify.
   - Run `python3 scripts/verify.py --mode edit`.
   - If the sandbox allows, run a local preview and inspect mobile/desktop views.
   - If preview cannot bind a port, use static/code inspection and report the limitation.
   - Review at representative widths: 375px, 430px, 768px, 1024px, desktop.

## Verification

- `python3 scripts/verify.py --mode edit`
- UI inspection for:
  - no clipped topbar items
  - no unreadably small main/control text
  - stable touch targets
  - page spacing and vertical alignment
  - no unwanted component background regressions

## Open Issues

- Need user approval before implementation.
- Exact mobile nav pattern will be chosen after testing available width against the current item set.
