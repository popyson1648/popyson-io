# Plan

## Goal

Refine article presentation so related thumbnails match the Blog index, long
URLs never widen the mobile viewport, and unordered lists have clearer,
depth-sensitive markers with tighter vertical rhythm.

## Scope

- Render related article thumbnails as square images with the same corner
  treatment and border language as Blog index thumbnails.
- Allow long authored links and bare URLs inside article prose to wrap at any
  character when necessary without widening the article or viewport.
- Increase unordered-list marker visibility.
- Use depth-sensitive unordered-list marker shapes inspired by Notion:
  `disc` at the root, `circle` at the second level, and `square` at the third
  level, repeating for deeper levels.
- Reduce unordered-list item vertical margins from 8px to the Notion-like 4px.
- Add automated regression coverage and verify the affected article at an
  iPhone-sized viewport.

## Non-goals

- Change ordered-list numbering, task-list checkboxes, article prose, or
  thumbnail image files.
- Change the approved background experiment.
- Commit, merge, or deploy the changes.

## Assumptions

- “Square like the article index” means retaining a small project-standard
  corner radius rather than using a circular crop.
- Long prose links should remain readable and selectable; horizontal scrolling
  is not acceptable for ordinary URLs.
- Marker source characters (`-`, `+`, and `*`) remain semantically equivalent
  after Markdown rendering.

## Steps

1. Replace the related-thumbnail circular radius with the Blog index thumbnail
   radius and matching stronger border.
2. Add prose-level wrapping protection for links and bare long strings without
   changing code-block overflow behavior.
3. Set unordered-list marker size and depth-specific shapes, excluding task
   lists from marker styling.
4. Tighten unordered-list item vertical margins to 4px.
5. Add static/component or rendering tests for thumbnail shape, URL wrapping,
   marker size, nesting shapes, and spacing.
6. Inspect the affected article at desktop and iPhone-sized viewports and run
   the repository verifier.

## Verification

- Confirm related thumbnails are square with the same radius as Blog index
  thumbnails.
- Confirm the Kodansha URL in post `20260729-94519dc2` wraps and
  `document.documentElement.scrollWidth` does not exceed `clientWidth`.
- Confirm root, second-level, and third-level unordered lists compute to
  `disc`, `circle`, and `square`.
- Confirm visible markers are larger and item margins compute to 4px.
- Confirm task lists and horizontally scrollable code blocks still work.
- Run `python3 scripts/verify.py`.

## Open Issues

- Physical iPhone verification remains useful after browser emulation because
  its font rasterization may make marker size feel slightly different.
