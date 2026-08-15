# Plan

## Goal

Make the vertical gap from a parent list item's paragraph to its first nested
item equal the gap between sibling items in that nested list.

## Scope

- Markdown bodies rendered through the shared `.prose` styles.
- Unordered, ordered, and mixed nested lists whose parent item is rendered as
  `li > p + ul` or `li > p + ol`.
- Focused CSS regression coverage and real-browser geometry checks.

## Non-goals

- Horizontal list indentation or marker placement.
- Spacing between ordinary prose paragraphs.
- Spacing after a nested list or between unrelated top-level list items.

## Assumptions

- The current 26px paragraph margin is the source of the extra parent-to-child
  space because it dominates the 4px nested-list and list-item margins.
- A 4px end margin on a parent paragraph immediately followed by a nested list
  lets the existing list margins determine both relationships consistently.

## Steps

1. Add a narrow `.prose` rule for a list-item paragraph immediately followed
   by a nested `ul` or `ol`, setting its logical block-end margin to 4px.
2. Add a CSS regression assertion for the relationship-specific rule while
   preserving the existing horizontal indentation assertions.
3. Verify unordered, ordered, and mixed nesting in a browser-shaped fixture.

## Verification

- Run the focused article-style test.
- Measure parent-to-first-child and child-to-child text gaps in Chromium at
  desktop and mobile widths; require them to be equal.
- Inspect desktop and mobile screenshots in light and dark themes.
- Run `python3 scripts/verify.py` with the repository content fixture.

## Open Issues

None.
