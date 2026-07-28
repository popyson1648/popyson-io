# Plan

## Goal

Make the front matter produced by `npm run new:post` self-documenting, and drop the hand-written
`reading` field in favour of a reading time estimated from the article body.

## Scope

- Add a docstring-style comment block to the templates in `scripts/new_post.mjs`.
- Remove `reading` from the metadata schema, the front matter typedef, and the scaffold.
- Add `src/readingTime.js` and use it in `scripts/content_loader.mjs` to derive `post.reading`
  per locale.
- Localize the reading time in `src/blog.jsx` through the existing `L()` helper.
- Update `tests/check_metadata_schema.test.mjs`, `tests/check_metadata_edges.test.mjs`,
  `tests/check_core_helpers.test.mjs`, and `.project/metadata.md`.

## Non-goals

- Preserving the template comments across `scripts/generate_metadata.mjs`. That script
  re-serializes the whole front matter with `stringifyToml`, so the comments are dropped the
  first time metadata is generated. The comments are a drafting aid, not committed content.
- Changing the `min_read` labels, the date/tag/summary/thumbnail pipelines, or the UI layout.

## Assumptions

- The comment block lists one line per field, aligned like a docstring parameter list, and is
  written in Japanese for `index.ja.md` and English for `index.en.md`.
- Reading time is counted from the Markdown body with code fences and inline markup removed,
  at 600 CJK characters or 250 non-CJK words per minute, rounded up, minimum 1.
- `post.reading` becomes `{ ja, en }` because the two locales differ in length.

## Steps

1. Rewrite `markdownTemplate()` in `scripts/new_post.mjs` with the comment block and without
   `reading`.
2. Drop `reading` from `TOP_LEVEL_FIELDS` and its validation in `scripts/metadataSchema.mjs`,
   and from the typedef in `scripts/frontmatter.mjs`.
3. Add `src/readingTime.js` exporting `estimateReadingMinutes(markdown)`.
4. Use it in `readPost()` in `scripts/content_loader.mjs` for both locales.
5. Render `L(p.reading, lang)` in the post index card and the article header in `src/blog.jsx`.
6. Update the schema, edge-case, and helper tests; document the change in `.project/metadata.md`.

## Verification

- `python3 scripts/verify.py` (format, lint, actionlint, typecheck, build, unit, integration,
  component, accessibility, Lighthouse).
- `npm run new:post` in a scratch directory to inspect the generated front matter, and a visual
  check of the reading time on the blog index and an article page.

## Open Issues

- The existing post `src/content/posts/20260728-e2c1267f/` still carries `reading = 1`. It is
  open in an editor, so the author removes that line (or closes the file first).
