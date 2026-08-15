# Plan

## Goal

Define one compact list-indentation system for every Markdown body rendered as
`.prose`, so all current and future posts use the same spacing at every nesting
level.

## Scope

- Unordered and ordered lists rendered in posts, works, About content, and the
  editor preview through the shared `.prose` styles.
- First-level and nested marker gutters for `ul`, `ol`, and mixed nesting.
- Logical inline-direction properties, native list semantics, marker styling,
  and focused regression coverage.
- Desktop, mobile, light-theme, and dark-theme browser verification.

## Non-goals

- Per-post CSS or selectors tied to a post ID, title, or current HTML fixture.
- Markdown parsing or content migration.
- List vertical rhythm, marker shapes by depth, or task-list checkbox layout.

## Research

- MDN explains that browsers normally indent lists with
  `padding-inline-start`, while `outside` markers sit outside each list item's
  principal box. Author CSS should therefore control the list container's
  logical padding rather than accumulate physical left padding across the
  container and item. See
  <https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Lists/Indenting>.
- CSS Lists and Counters Level 3 defines markers as `::marker` boxes and permits
  font and color styling on them. It also notes that exact outside-marker layout
  is partly browser-defined, so the implementation must be checked in the
  supported browser engines instead of assuming one engine's marker geometry.
  See <https://www.w3.org/TR/css-lists-3/>.
- web.dev warns that `list-style: none` can remove list semantics from Safari's
  accessibility tree. Ordered lists should use native decimal markers rather
  than the current `list-style: none` plus `li::before` counter replacement.
  See <https://web.dev/articles/creative-list-styling>.

## Current Behavior

- The published “結合度・凝集度” article confirms that the previous rule is
  deployed, but a nested bullet still moves its text 20px from its parent.
- The 20px comes from `1em` on the nested `ul` plus `0.25em` on its child `li`.
- Ordered lists use a separate absolute `::before` counter and 22px nested item
  padding, so unordered, ordered, and mixed nesting do not share one step.
- These selectors apply to every `.prose` body. The issue is the global rule,
  not the content of one article.

## Target Rules

- Keep list markers outside the item content.
- Use `padding-inline-start: 1.5em` for every first-level `ul` and `ol`.
- Use `padding-inline-start: 0.5em` for every nested `ul` and `ol`.
- Keep `0.25em` inline-start padding on list items. At a 16px article font, the
  visible parent-to-child text step is therefore 12px: 8px from the nested list
  and 4px from its child item.
- Use native `decimal` ordered-list markers and style them through `::marker`,
  eliminating the separate absolute-counter geometry.
- Express indentation with `padding-inline-start`, not `padding-left`, so the
  rule follows the document's inline direction.
- Preserve the task-list override that removes the marker gutter and positions
  its checkbox independently.

## Steps

1. Replace the separate unordered- and ordered-list indentation rules with a
   shared `.prose` list geometry using logical properties.
2. Restore native decimal markers for ordered lists and move their typography,
   color, and tabular-number styling to `ol li::marker`.
3. Keep depth-specific unordered marker shapes, but remove nested selectors
   whose only purpose was to compensate for the previous padding model.
4. Confirm task lists still remove ordinary markers and align their checkboxes.
5. Add a focused CSS regression test covering the shared first-level gutter,
   shared nested gutter, native ordered markers, and absence of the old absolute
   counter rule.
6. Add a browser fixture containing `ul > ul`, `ol > ol`, `ul > ol`, `ol > ul`,
   wrapped list-item paragraphs, long wrapping text, and an ordered item 10.
7. Measure the first two levels and inspect marker clearance at desktop and
   mobile widths in both themes.

## Verification

- Run the focused CSS/static accessibility checks.
- Run `CONTENT_SNAPSHOT_ROOT=$PWD/tests/fixtures/content python3 scripts/verify.py --mode standard`.
- Verify every non-task nesting combination produces a 12px parent-to-child
  text step at the standard 16px article font.
- Verify ordered item 10 does not overlap its text in Chromium and Firefox; add
  WebKit verification when the local browser test environment provides it.
- Verify long list items wrap under their text rather than under the marker.
- Verify the published “結合度・凝集度” structure (`li > p + ul`) as one
  regression example, without adding article-specific production selectors.

## Open Issues

- CSS does not fully specify exact outside-marker placement across engines. If
  native two-digit markers cannot fit the compact nested gutter in a supported
  engine, keep native list semantics and increase the shared nested gutter to
  the smallest measured safe value instead of reintroducing absolute counters.
