# Plan

## Goal

Let an article break a line at line-height spacing — the gap a wrapped line
leaves — by starting the second line with `|`.

## Scope

- A remark plugin in `scripts/articleHtml.mjs` that turns the marker into a
  `<br>`.
- Tests in `tests/check_markdown_rendering.test.mjs`.
- `.project/article-markdown.md`, `.project/translation.md`, and the README
  section on paragraphs and line breaks.

## Non-goals

- A toolbar button in the editor.
- CSS changes: `<br>` already spaces the lines the way the goal describes.

## Assumptions

- The build renderer and the editor preview both call `renderArticleHtml`, so
  one plugin covers the published page and the preview.

## Steps

1. Add `remarkLineBlocks` between `remarkEmbeds` and `remarkDirectiveFallback`.
   For each text node holding a newline, look up the source line that follows
   it and insert a `break` when that line starts with `|`.
2. Read the marker from the source rather than the node value, so `\|` — which
   the parser has already resolved to a bare bar — stays literal.
3. Document the syntax and tell the translation prompt to keep the bar.
4. Describe the syntax in the README under paragraphs and line breaks.

## Verification

- `npx vitest run tests/check_markdown_rendering.test.mjs`
- `python3 scripts/verify.py`
- Render a post through the editor preview and measure the gap against a
  wrapped line.

## Open Issues

None.
