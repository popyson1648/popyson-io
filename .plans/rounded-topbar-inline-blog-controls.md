# Plan

## Goal

Address three user UI requests:

1. Make the top bar a rounded-rectangle container whose contents read left to right:
   About, Blog, App, Reading list, then the EN/JP toggle, then the theme toggle.
2. Stop the blog search/filter/sort controls from looking like they float, and replace
   the floating filter/sort dropdown windows (which did not match the flat, line-based
   site design) with in-flow inline panels.
3. Disambiguate the search modal's two `×` buttons so the modal-close affordance is not
   mistaken for the "clear all text" control, while keeping both capabilities.

## Scope

- `src/app.css`: top bar shape/layout, blog toolbar alignment + inline panel styles,
  search-modal close affordance restyle, removal of stale `left: 50% !important` overrides.
- `src/blog.jsx`: replace the two `Dropdown` popovers with `openPanel` state + inline
  filter/sort panels; make `FilterPill` a static chip with a remove button.
- `src/components.jsx`: change the search modal close button to an "Esc" keycap label.
- `scripts/check_accessibility_static.py`: realign the dropdown-trigger a11y check with the
  new inline-panel trigger pattern.

## Non-goals

- No change to search ranking/logic, routing, theme/language behavior, or content data.
- No backend or build-tooling changes.

## Assumptions

- The site is statically rendered; the topbar is shared across all routes.
- `app.css` is a heavily layered, append-over-time stylesheet; the last matching (and any
  `!important`) declaration wins, so edits target the authoritative final blocks.

## Steps

1. Top bar: in the final topbar block, give `.topbar` `border: 1px solid line-strong`,
   `border-radius: 14px`, `background: var(--bg)`, keep it centered (`left: 50%` +
   `translateX(-50%)`); make `.topbar-inner` a left-aligned flex row with inner padding;
   set `.nav` to `justify-content: flex-start`; add a left divider on `.tool-group-actions`.
   For `<= 720px`, keep a full-width bar (`left/right: 10px`, `transform: none`).
2. Remove the stale `left: 50% !important; right: auto !important;` from the
   "Requested UI adjustments" block and its `<= 860px` variant so mobile `left/right: 10px`
   can win (otherwise the bar overflows right on mobile).
3. Blog toolbar: wrap fbar + panels in `.fbar-wrap` aligned to the post list width (860px,
   centered); anchor `.fbar` with a bottom border so the controls read as a header instead
   of floating.
4. Blog filter/sort: add `openPanel` state and an outside-click/Escape close effect; replace
   the two `Dropdown`s with toggle buttons (`aria-expanded`/`aria-controls`) that reveal
   in-flow `.fpanel` panels (filter reuses `AddFilterMenu`, sort reuses the `seg-mini` rows).
   Convert `FilterPill` to a static chip + remove button.
5. Search modal: render "Esc" text in the `.esc` close button and restyle it as a bordered
   mono keycap at top-right; keep the in-input `×` as the text-clear control; widen the
   input's right padding for the keycap.
6. Update the static a11y check to assert the new filter/sort triggers expose
   `aria-expanded` + `aria-controls`.

## Verification

- `python3 scripts/verify.py` → lint, build, accessibility, and performance (Lighthouse) all pass.
- Browser (Chrome DevTools MCP), desktop and mobile widths:
  - Top bar is a rounded rectangle; contents ordered About/Blog/App/Reading list, EN/JP, theme;
    no horizontal overflow on mobile.
  - Blog toolbar is anchored (not floating); filter and sort expand inline (no floating card);
    selecting a tag filters the list and shows a removable chip; chip `×` and "clear all" work;
    Escape/outside-click closes the panel.
  - Search modal: top-right "Esc" keycap closes; in-input `×` clears text only (modal stays open).

## Open Issues

- None. The MCP browser clamps its minimum width to ~485px, so the narrowest phone widths were
  validated by computed-style checks plus the 485px rendering rather than a true 360px viewport.
