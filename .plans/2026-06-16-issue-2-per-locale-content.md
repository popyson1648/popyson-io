# Plan

## Goal

Implement issue #2: move blog posts and about content into per-locale content files, while keeping stable post-id URLs and the existing Vite/React site behavior.

## Scope

- Move blog content into `src/content/posts/<post-id>/index.ja.md`, `index.en.md`, and `assets/`.
- Move about content into `src/content/about/about.ja.toml` and `src/content/about/about.en.toml`.
- Read post IDs from post directory names, not Markdown metadata.
- Add `scripts/new_post.mjs` and `npm run new:post`.
- Keep `/blog/<post-id>` and `/en/blog/<post-id>` working for article pages.
- Update list/search/article/prerender/RSS data sources to use the new structure.
- Keep current build and static accessibility verification passing.

## Non-goals

- Do not redesign UI or article styling.
- Do not change existing public route structure beyond making post IDs stable directory names.
- Do not add a CMS or remote content source.
- Do not migrate app/works or reading-list data.

## Assumptions

- Existing demo posts can be migrated with new stable IDs if old slug-based IDs are no longer required by the issue.
- Article Markdown only needs the structures currently rendered by the site: paragraphs, level-2 headings, unordered/ordered lists, fenced code blocks, and simple message/admonition blocks.
- Use existing `smol-toml` for TOML parsing. Avoid adding a Markdown/frontmatter dependency unless implementation proves the limited parser is insufficient.

## Steps

1. Add a Vite content plugin/module that scans `src/content/posts/*/index.{ja,en}.md`, parses TOML frontmatter, derives `id` from the directory name, and emits `POSTS`, `TAGS`, and article body blocks.
2. Replace `src/posts.js` and `src/articleBody.js` usage with the generated content module while preserving the current runtime shapes used by `BlogList`, `Article`, search, RSS, and prerender.
3. Split `src/content/about.toml` into `src/content/about/about.ja.toml` and `src/content/about/about.en.toml`; merge them in build-time TOML import or a small about data module so `AboutPage` can keep using localized fields.
4. Migrate the existing post metadata/body into per-locale Markdown files under generated stable post IDs, including an `assets/` directory per post.
5. Add `scripts/new_post.mjs` to create collision-free `YYYYMMDD-xxxxxxxx` post directories with both Markdown files and `assets/`; add `new:post` to `package.json`.
6. Update docs/config only where workflows or source structure references have changed.
7. Verify with `npm run new:post` behavior checks and `python3 scripts/verify.py`.

## Verification

- Run `npm run new:post` in a temporary way that verifies the generated ID pattern, created files, and collision handling without committing generated draft posts.
- Run `python3 scripts/verify.py`.
- Inspect prerender output paths for `/blog/<post-id>` and `/en/blog/<post-id>` via build output.

## Open Issues

- Need final confirmation before implementation, because repository rules require user approval of the plan before code changes.
