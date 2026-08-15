# Plan

## Goal

Give inline code a dark-theme color of its own, tighten the step between list
levels, and add a collapsible block to the article Markdown.

## Scope

- `src/content/theme.toml`: a `code-bg` token per theme.
- `src/app.css`: the inline code background, the nested list indent, and the
  styles for the new block.
- `scripts/articleHtml.mjs`: a `remarkDetails` plugin and a `detailsLabel`
  option.
- `scripts/content_loader.mjs` and `scripts/editorApiPlugin.mjs`: the per-locale
  label, alongside the existing `copyLabel`.
- `src/editor/MarkdownEditor.jsx`: a slash command that inserts the block.
- `tests/fixtures/markdown_rendering.mjs` and
  `tests/check_markdown_rendering.test.mjs`.
- `.project/article-markdown.md`, `README.md`, and a decision record.

## Non-goals

- The first list level, whose indent stays as it is.
- Code block colors, which already read from `--bg-subtle`.
- The editor toolbar buttons, and the `/補足` slash command, whose
  `:::message` belongs to its own branch.

## Assumptions

- The build renderer and the editor preview both call `renderArticleHtml`, so
  one plugin covers the published page and the preview.
- `<details>` carries its own keyboard handling and works with scripting off,
  which suits a site built as static HTML.
- `markdownToPlainText` already strips `:::name[label]` lines, so the search
  index keeps the title and body as plain text.

## Measurements

Taken in the browser on a post rendered in the dark theme.

- Inline code paints `#fbfdf4`, a hardcoded value from `src/app.css`, against
  the `#12141d` page and `#95a6ff` text.
- Each list level steps 28px: `padding-left: 24px` on `ul` plus `4px` on its
  `li`, and `28px` on an `ol` `li`. A nested marker lands to the right of the
  parent item's text.
- `:::details[…]` reaches `remark-rehype` unhandled and renders as a bare
  `<div>` holding the title and body as ordinary paragraphs.

## Steps

1. Add `code-bg` to `[light]` (`#fbfdf4`) and `[dark]` (`#1b2030`) in
   `theme.toml`, and read it from `.prose :not(pre) > code`. The dark value
   matches the code block ground, so both forms of code sit on the same color.
2. Set `padding-left: 1em` on `.prose ul ul, .prose ol ul` and `22px` on
   `.prose ul ol > li, .prose ol ol > li`. The step becomes 20px for bullets
   and 22px for numbers, which puts a nested marker under the parent item's
   text and leaves a two-digit number its width.
3. Add `remarkDetails` next to `remarkCallouts`, reading `:::details[Title]`,
   `{title="…"}`, and `{open}`. Emit
   `<details class="details"><summary class="details-summary">Title</summary>`
   with the body wrapped in `.details-body`.
4. Thread `detailsLabel` through `renderArticleHtml` the way `copyLabel` runs
   today, and pass 「詳細」 for Japanese and "Details" for English from the two
   callers. A block written without a title takes that label.
5. Style `.details` in `src/app.css`: the marker triangle, the spacing an open
   block opens, and colors from the theme tokens.
6. Add `/折りたたみ` to the slash command list in `src/editor/MarkdownEditor.jsx`,
   inserting `:::details[タイトル]` with the body selected, the way `/補足`
   places its cursor.
7. Cover the new block in the rendering tests — title from the label and from
   the attribute, the default title, `{open}`, and a body holding a list and a
   code span.
8. Describe the syntax in `.project/article-markdown.md` and in the README
   after the callout section, following `skills/readme-writing/SKILL.md` and
   the `japanese-tech-writing` norms.
9. Record the choice of directive and native element in `.decisions/`.

## Verification

- `npx vitest run tests/check_markdown_rendering.test.mjs`
- `CONTENT_SNAPSHOT_ROOT=<snapshot> python3 scripts/verify.py --mode standard`
- Render a post carrying all three cases and compare screenshots in both
  themes, measuring the list step and reading the computed inline code color.
- Open and close the block with the keyboard, and load the page with scripting
  off to confirm the body stays reachable.
- Type `/折りたたみ` in the editor and confirm the preview shows the block the
  published page renders.

## Open Issues

The editor's slash command list offers `/補足` as `:::message`, a type the
renderer has no rule for. Fixing it belongs to its own branch.
