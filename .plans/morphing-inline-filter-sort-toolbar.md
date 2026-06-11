# Plan

## Goal

Replace the blog list's floating filter/sort dropdown (`.fpanel`, portaled to
`document.body`) with a morphing toolbar: clicking an icon makes `.fbar-controls`
grow smoothly to the right and reveal that tool inline, with a left-pointing back
arrow that steps the bar back toward its collapsed (search / filter / sort) state.

## Scope

- `src/blog.jsx` — `BlogList`: drive the bar from `openPanel` + `filterProp`
  state, render tools inline, animate the pill width, remove `createPortal`.
- `src/app.css` — append morphing-toolbar styles (animated width, inline layout,
  divider, tag dropdown, mobile cap).
- `scripts/check_accessibility_static.py` — point the "back control" check at the
  new `fbar-back` button (was `menu-back`).

## Non-goals

- Search icon behavior (still opens the full search modal).
- Active filter pills (`fbar-state`) location/markup (unchanged).
- The old `.fpanel` CSS rules (left in place but no longer rendered).

## Assumptions

- Hash routing; blog list at `/#/blog`.
- `Icon.back` (left arrow) and i18n keys (`tools`, `filter_add`, `f_tag`,
  `s_date`, …) already exist.
- Pre-existing uncommitted WIP on this branch (fpanel portalization, i18n key
  removals, devtweak overlay, Esc close button) is intended and built upon.

## Steps

1. `blog.jsx`: add `useLayoutEffect`; drop `createPortal`.
2. Delete `FilterEditor` / `AddFilterMenu`; inline their logic (tag toggle,
   filtered tags, prop list) into `BlogList`.
3. State: keep `openPanel` (`null|filter|sort`); add `filterProp`
   (`null|tags|title|body`) and `tagQuery`. Add `goBack` (one level up).
4. Width animation: pin an explicit px width on `.fbar-controls` each render via
   `useLayoutEffect`, measuring the inner row's `scrollWidth` + the pill's
   padding/border, capped to `innerWidth - 20`; transition `width`. Re-pin on
   `resize`.
5. Render inline: collapsed = 3 icons; expanded = back arrow + sort segments /
   filter prop chips / filter field. Tags show a search field in the pill and a
   checklist `.fbar-dropdown` anchored under the pill (`.fbar-ctrl-wrap` relative).
6. Keep `aria-expanded` / `aria-controls="filter-panel|sort-panel"` on triggers and
   ids on the inline regions; back control is `fbtn ficon fbar-back`.
7. `app.css`: append `.fbar-ctrl-wrap`, `.fbar-controls{overflow:hidden;transition}`,
   `.fbar-inline`, `.fbar-fields`, `.fbar-sep`, inline `.seg-mini`/`.prop-item`/
   `.fbar-field` overrides, `.fbar-dropdown`, and a `max-width:720px` block.
8. Update the a11y checker's back-control assertion.

## Verification

- `python3 scripts/verify.py --only lint build accessibility` → all passed.
- Browser (chrome-devtools MCP) at `/#/blog`:
  - Sort: bar grows to `← 日付 五十音順 | 昇順 降順`; toggling reorders the list;
    back arrow restores the 3 icons and refreshes the sort label.
  - Filter: prop chips → タグ opens an 8px-below, left-aligned checklist dropdown;
    selecting a tag adds the active pill and filters to 1 post; タイトル「観測」 →
    「静かな観測性」; back steps タグ→props→icons; clear-all restores 6; Esc closes.
  - Width pinned to true content width (294px desktop) with no clipping.
  - Mobile 360px (emulated): sort pill 320px and tags dropdown 220px both stay
    within the viewport; 降順 fully visible.
- Screenshots saved under `.tmp/` (01–07).

## Iteration 2 — UI/UX best-practice polish

Grounded in WAI-ARIA disclosure guidance (return focus to trigger on close; move
focus into revealed content) and Material 3 motion (emphasized easing; exit
shorter than enter; reveal/crossfade content).

- Focus management (`blog.jsx`): refs on triggers + back button; focus moves to
  the back arrow on expand, returns to the originating trigger on Escape/back
  (keyboard), not on outside-click. `preventScroll`.
- Motion: content reveal via WAAPI (fade + 7px slide) re-triggered per state
  change without remounting the measured node; asymmetric width duration
  (enter 260ms / exit 180ms) set in JS; CSS easing = emphasized
  `cubic-bezier(0.2,0,0,1)`; reduced-motion gated (WAAPI guard + dropdown rule).
- Shape/state: pill height locked to 42px (no collapse↔expand jitter); seg-mini
  fully rounded to match the pill; direction carets (`Icon.caretUp/Down`) on
  昇順/降順; clearer back label (`t.back_tools`).
- Width measurement rewritten to use the children's span (first-left →
  last-right) instead of `scrollWidth` — `scrollWidth` never drops below the
  still-wide container while collapsing, which had pinned the bar open. Re-pin
  on `document.fonts.ready` to survive web-font reflow.

Verified: `verify.py --only lint build accessibility` passes; chrome-devtools
confirmed collapsed 120px ↔ open 328px (shrinks back), enter 260 / exit 180ms,
height stays 42px, focus to back on open + back to trigger on Esc, carets render,
mobile 360px fits (sort 328px, dropdown 220px). Screenshots `.tmp/10–11`.

## Iteration 3 — resolve the remaining issues

- Back = top (per original spec): filter no longer has a nested step. Its property
  becomes a persistent **tab row** (tags / title / body, seg-mini) shown next to
  the editor, so switching property is one tap and the back arrow always collapses
  to the 3-icon top. `goBack` simplified to `closePanel`; focus restore on the
  open/close edge only (tab switches don't steal focus; text fields autoFocus).
- Tags inline (no detached dropdown): the checklist became **inline toggle chips**
  (`.fbar-chips` / `.fbar-chip`) inside the bar, horizontally scrollable with a
  capped width so the pill stays tasteful. The `.fbar-dropdown` + tag-search input
  were removed (8 tags don't need a search box).
- Touch targets: `@media (pointer: coarse)` grows every hit target to ~44px
  (icons 44×44, seg/chip/field min 44px, pill min-height 52, auto height for a
  consistent collapsed/expanded size). Horizontal padding tuned so sort still
  fits a 360px phone without scrolling. Desktop stays compact (42px).

Verified (chrome-devtools): filter opens to tabs+chips (685px desktop, within the
container), tag chips toggle + reflect in active pills + list, tab→title autofocus,
back collapses to the 3 icons and returns focus to the filter trigger; coarse
pointer yields 44px targets with sort fitting 360px (pill 322px, 降順 visible).
verify.py lint/build/accessibility pass. Screenshots `.tmp/12–14`.

## Iteration 4 — search becomes inline (retire the modal)

The magnifier no longer opens a full-screen modal; it expands the bar like the
other tools into an inline **search combobox** (WAI-ARIA combobox pattern: input
`role=combobox` + `aria-expanded/controls/activedescendant/autocomplete=list`,
DOM focus stays on the input, results in a `role=listbox` popup below the bar).

- `app.jsx`: removed `searchOpen` state, `SearchModal` render, and `openSearch`
  from context.
- `components.jsx`: removed `SearchModal`; exported `bestSnippet` (and existing
  `highlight`) for reuse; dropped the now-unused search-index import.
- `blog.jsx`: inline search — reuses `createSoftmatcha2SearchIndex`, `highlight`,
  `bestSnippet`, `Ph`. `useDeferredValue` debounces result computation; zero-state
  shows recent posts; keyboard Up/Down/Home/End/Enter with active-option scroll;
  Escape collapses + restores focus to the magnifier trigger; clear (×) button.
  Results reuse the `.sug` rows.
- `app.css`: `.fbar-search` (inline pill field) + `.fbar-results` (frosted listbox
  popup), mobile width + `pointer:coarse` 44px/16px (iOS no-zoom) + reduced-motion.
- a11y checker: replaced the modal checks (`aria-modal`, `esc` button) with inline
  combobox checks (`role=combobox` + `aria-autocomplete=list` + labelled; controls
  a `#search-results` `role=listbox`).

Verified (chrome-devtools): magnifier expands to `← 🔍 field ×` with focus in the
field; zero-state lists 5 recent; typing filters with highlighted matches and live
count; Arrow keys move the active option (aria-activedescendant); Enter opens the
post; Escape collapses and refocuses the trigger; mobile 360px fits (pill 54px,
field 44px, input 16px, results span the width). Based on the
[WAI-ARIA combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
and autocomplete UX guidance (debounce, highlight, recent/zero-state, no-results).
Screenshots `.tmp/15–16`.

## Iteration 5 — scalable tags, mobile sizing, flat search

Four issues raised on the live build, fixed together so the expanded states share
one model: **bar = control affordance, popup = scalable content.**

- **Tags scale (was: inline chips overflowed/scrolled as the set grew).** The
  filter editor moved out of the bar into a popup below it (`.fbar-pop`, same
  frosted surface + `rf` entrance as the search results popup). Tag chips
  (`.fbar-chips`) now `flex-wrap` onto as many rows as needed; the bar keeps only
  the property tabs (tags / title / body). Title/body filtering is a clean text
  field (`.fbar-pop-input`) in the same popup (autoFocus on tab switch). a11y kept
  `#filter-panel` + `aria-expanded`/`aria-controls` on the trigger.
- **Mobile width stayed expanded after collapse (bug).** Root cause: a legacy
  `@media (max-width:720px) .sort-btn { flex:1 1 auto }` (from the old `.fbar`
  layout) stretched the collapsed sort icon to fill the bar, so the children-span
  width measurement read the full container and never shrank. Fixed by pinning
  `.fbar-inline > .fbtn { flex: 0 0 auto }` (specificity beats the legacy rule).
  Verified: sort 312→120, filter 480→120 on collapse.
- **Mobile bar too tall.** `@media (pointer: coarse)` no longer uses
  `height:auto; min-height:52px`; the bar is a fixed compact `46px` (editor lives
  in the popup, so the bar never needs to grow). Touch targets stay ~44px (icons)
  / ~40px (segments). 360px touch: sort bar 322px, all buttons visible.
- **Search "pill-in-pill".** `.fbar-search` lost its `bg-subtle` + `border-radius`
  nested-pill styling; the magnifier + transparent input + clear now sit directly
  on the bar's own frosted surface (the bar "becomes" the field). Removed the dead
  `.fbar-field` rules.

Verified: `verify.py --only lint build accessibility` passes; chrome-devtools at
500px / 390px+touch / 360px+touch / 1280px — collapse returns to the intrinsic
width, coarse height 46px, tags wrap in the popup, title/body input autofocuses in
the popup, search reads flat, and toggling #Rust narrows 6→1 with the popup staying
open and the active pill appearing in `.fbar-state`. Screenshots `.tmp/iter5-*`.

## Iteration 6 — collapsed sort icon off-center on mobile

The collapsed bar's three icons looked slightly misaligned on touch/mobile: the
sort glyph sat ~13.5px left of its 44px circle's center while search/filter were
centered. Same root as the iter-5 width bug — the legacy
`@media (max-width:720px) .sort-btn { … justify-content: flex-start }` rule. Iter 5
neutralized its `flex`, but `justify-content:flex-start` still leaked to the new
bar's `.sort-btn`, left-aligning only that glyph. Fixed by extending the
specificity-winning pin: `.fbar-inline > .fbtn { flex: 0 0 auto; justify-content: center }`.

Verified: chrome-devtools at 390px+touch — all three glyphs' svg centers now match
their button centers (offsetX 0/0/0; was 0/0/-13.5); `verify.py --only lint build
accessibility` passes. Screenshot `.tmp/iter6-collapsed-390-fixed`.

## Iteration 7 — match the bar's length on mobile and desktop

The collapsed pill was ~30px wider on mobile than desktop (150px vs 120px), which
spaced the three icons further apart. Cause: the `@media (pointer: coarse)` block
enlarged every glyph to 44×44 (and segments to ~40px) for an AAA-size touch target,
so 3×(44−34) = 30px of extra width. Per the user's request to make the bar the same
length on both, that block now keeps only the (length-neutral) taller bar height for
a comfier vertical tap; all width-affecting enlargements were dropped, so mobile uses
the exact desktop geometry. Glyph/segment hit areas are now 32–34px — still meets
WCAG 2.5.8 (AA, 24px min), a deliberate trade of AAA target size for visual parity.
The 16px iOS no-zoom input size lives in a separate coarse block and is unchanged.

Verified (chrome-devtools): collapsed 150→**120** (icons 34px, = desktop), sort 322→
**328** (= desktop), collapse returns to 120; 360px+touch sort fits (328px, right edge
346 < 360, no horizontal scroll). `verify.py --only lint build accessibility` passes.
Screenshot `.tmp/iter6-collapsed-390-parity`.

## Open Issues

- (resolved in iter 3) back-to-top, tags inline, touch targets.
- (resolved in iter 5) tag scalability (popup + wrap), mobile height, mobile
  collapse-width bug, search nested-pill look.
- Pre-existing bundle-size warning (shiki/wasm) is unrelated and unchanged.
