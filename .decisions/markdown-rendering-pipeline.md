# Decision

## Title

Render post Markdown with react-markdown + remark-gfm + remark-directive

## Date

2026-06-17

## Status

Accepted

## Decision

Render article bodies with `react-markdown`, using `remark-gfm` for GFM syntax
(tables, task lists, strikethrough, autolink literals) and `remark-directive`
for `:::type[Title]` callouts. A local `remarkCallouts` plugin turns the
allowed container directives (`note`, `tip`, `info`, `warning`, `danger`) into
a `callout` node, and `remarkHeadingIds` assigns slug ids to `<h2>` headings.
Rendering is locked down: `skipHtml`, a `urlTransform` that allows only
`http`/`https`/`mailto`/relative URLs, and component overrides that drop unsafe
links and images. The pipeline and security helpers live in
`src/markdownPipeline.js`; heading-slug logic is shared through
`src/headingSlug.js`.

## Context

Issue #12 asked to parse post Markdown with a maintainable pipeline and render
it as React UI components, covering a GFM subset plus custom callouts with
optional titles and nested Markdown. The previous content path used a
hand-rolled block parser in `scripts/content_loader.mjs`, which preserved no
inline/nested structure suitable for component rendering.

## Alternatives

- Option B: `unified`/`remark-parse` with a custom AST-to-React mapping —
  more control and a renderer-independent article AST, but a custom renderer,
  URL handling, and test surface for every node type.
- Option C: extend the existing hand-rolled parser — smallest dependency
  footprint, but high maintenance and high risk on CommonMark/GFM edge cases
  (nested callouts, tables, task lists, escapes, malformed input) and security.

## Reason

The accepted syntax subset is already covered by maintained remark plugins,
callouts are a normal `remark-directive` use case, React component mapping is
built into `react-markdown`, and its safe-by-default posture (`skipHtml`,
default safe-URL transform) makes the security controls simpler than owning a
parser. The checked packages are MIT-licensed and actively maintained
(`react-markdown@10.1.0`, `remark-gfm@4.0.1`, `remark-directive@4.0.0`).

## Consequences

- New runtime dependencies and added client bundle weight (the remark/unified
  stack ships to the browser with the renderer).
- `scripts/content_loader.mjs` now preserves per-locale Markdown source and
  only extracts `<h2>` headings for the TOC, instead of producing block JSON.
- TOC anchors depend on `src/headingSlug.js` being the single source for the
  slug and `sec-` prefix shared by the loader and the renderer.
- Coverage lives in `scripts/check_markdown_rendering.mjs` (wired as the
  `test_unit` phase); it cannot import blog.jsx's browser-coupled JSX, so it
  exercises the pipeline plus the shared `calloutVariant`/`sectionId`/
  `safeMarkdownUrl` helpers that blog.jsx also uses.

## Revisit Conditions

- Reassess if raw HTML or MDX rendering becomes a requirement (currently out of
  scope and intentionally inert).
- Revisit the bundle-size tradeoff if the renderer needs to move to a
  build-time/prerendered HTML path.
- Re-check the allowed callout types and URL schemes if content needs widen.
