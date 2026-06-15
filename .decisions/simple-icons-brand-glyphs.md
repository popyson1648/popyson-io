# Decision

## Title

Use Simple Icons (CC0) brand glyphs for profile links

## Date

2026-06-15

## Status

Accepted

## Decision

Use the official single-path brand glyphs from Simple Icons
(https://simpleicons.org, licensed CC0 1.0) for the About page social links
(GitHub, X, LinkedIn, Wantedly). The paths are inlined into the `Icon` map in
`src/components.jsx` as `fill="currentColor"` SVGs on a `0 0 24 24` viewBox.

## Context

The previous profile icons were hand-drawn stroke approximations that did not
match recognizable brand marks. The request was to use proper SVGs from a
reputable, commonly used, free icon source.

## Alternatives

- Keep the hand-drawn line icons.
- Pull icons from another set (e.g. Font Awesome Brands, Devicon).
- Depend on an icon npm package at runtime.

## Reason

Simple Icons is the de-facto standard, widely used source of monochrome brand
glyphs, released under CC0 (public domain), so inlining the paths needs no
runtime dependency and no attribution obligation. Inlining keeps the existing
zero-dependency `Icon` pattern.

## Consequences

- `Icon.github`, `Icon.xcom`, `Icon.linkedin`, `Icon.wantedly` are now filled
  brand glyphs rather than stroked line icons.
- Profile links in `src/data.js` now point at real URLs and open in a new tab
  with `rel="noopener noreferrer"`.

## Revisit Conditions

- Update the path data if a brand refreshes its logo or Simple Icons changes
  the glyph.
- Re-check licensing if a specific brand restricts logo usage.
