# Plan

## Goal

Implement issue #12: parse post Markdown using a maintainable Markdown pipeline and render it as React UI components, including GFM features and custom callouts.

## Scope

- Replace the current hand-rolled block parser in `scripts/content_loader.mjs` with a Markdown pipeline that preserves localized article body Markdown for rendering.
- Render Markdown in `src/blog.jsx` with component mappings for headings, paragraphs, blockquotes, lists, code blocks, links, images, tables, task lists, strikethrough, autolink literals, hard line breaks, and callouts.
- Support callout forms:
  - `:::note`
  - `:::tip`
  - `:::info`
  - `:::warning`
  - `:::danger`
  - `:::warning[Title]`
- Allow nested Markdown inside callouts.
- Keep raw HTML inert and prevent unsafe URL schemes from becoming clickable links or image sources.
- Add fixture content for valid Markdown, callouts, malformed Markdown, raw HTML, and unsafe URLs.
- Record parser strategy and rationale for issue/PR use.

## Non-goals

- Full CommonMark or full GFM compatibility beyond the issue subset.
- MDX, JSX, or raw HTML rendering.
- Server-side syntax highlighting changes beyond preserving fenced code info strings for the existing renderer.
- Broad redesign of article typography or layout.

## Assumptions

- The current app is React/Vite and can accept ESM Markdown dependencies.
- Existing article content can continue to be paired by localized block order where necessary, but the rendering path should prefer locale-specific Markdown source to avoid losing nested inline/block structure.
- `MessageBox component` maps to the existing `.msg` article message-box styling unless a dedicated component already exists during implementation.

## Parser Strategy Comparison

### Option A: `react-markdown` + `remark-gfm` + `remark-directive`

- Handles CommonMark parsing through the remark/unified stack.
- `remark-gfm` covers tables, task lists, strikethrough, and autolink literals.
- `remark-directive` exposes `containerDirective` nodes suitable for `:::type[title]` callouts.
- `react-markdown` maps Markdown output to React components directly, which fits the UI component rendering requirement.
- Security posture is favorable: `react-markdown` is safe by default, supports `skipHtml`, and has a default URL transform that allows only safe protocols.
- License: MIT for the checked packages.
- Maintenance: latest npm metadata checked on 2026-06-17:
  - `react-markdown@10.1.0`, modified 2025-03-07
  - `remark-gfm@4.0.1`, modified 2025-02-10
  - `remark-directive@4.0.0`, modified 2025-02-27
  - `unified@11.0.5`, modified 2024-06-19
- Cost/risk: adds dependencies and client bundle weight, but reduces custom parser risk and improves spec alignment.

### Option B: `unified` / `remark-parse` / `remark-gfm` / `remark-directive` with custom AST-to-React mapping

- Gives lower-level control over AST conversion and could keep article data as structured JSON.
- Covers the same syntax through remark plugins.
- More implementation work: custom renderer for every required node type, custom URL handling, and more test surface.
- Better if the app needed a renderer-independent internal article AST, but issue acceptance focuses on UI rendering.

### Option C: Extend the existing hand-rolled parser

- Smallest dependency footprint.
- High maintenance cost and high risk for CommonMark/GFM edge cases, especially nested callouts, tables, task lists, inline emphasis/link/image/autolink parsing, escaped characters, hard breaks, and malformed input recovery.
- Security handling would be entirely local and easier to miss.

## Decision

Adopt Option A: `react-markdown` with `remark-gfm` and `remark-directive`.

The accepted subset is already covered by maintained parser plugins, custom callouts are a normal directive use case, React component mapping is built in, and the security controls are simpler than maintaining a custom parser.

## Steps

1. Install Markdown rendering dependencies.
2. Update content loading so article bodies preserve locale-specific Markdown source and search text still works.
3. Add a Markdown renderer module/component with:
   - `remark-gfm`
   - `remark-directive`
   - a callout transform plugin for allowed callout types
   - `skipHtml`
   - explicit safe URL filtering for `href` and `src`
   - component mappings for required Markdown elements and existing `CodeBlock`
4. Update `Article` and `bodyText` integration to use the new body shape.
5. Add fixture post Markdown covering valid Markdown, callouts, malformed input, raw HTML, and unsafe URLs.
6. Add or update focused tests/check scripts if the project has an existing suitable test path; otherwise verify through build, lint, static accessibility, and fixture rendering.
7. Run `python3 scripts/verify.py`.

## Verification

- `python3 scripts/verify.py`
- Inspect generated/prerendered article output for:
  - required Markdown subset rendering
  - fenced code info string reaching `CodeBlock`
  - title and nested callouts
  - raw HTML not rendered as HTML
  - unsafe URL schemes not emitted as clickable links or image `src`
  - malformed Markdown not breaking the article

## Open Issues

- Dependency install requires network access if the packages are not already cached.
- There is no enabled unit test phase in `.project/verification.toml`; acceptance may require adding a small focused test script if build-time fixture checks are not enough.
