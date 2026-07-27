# Plan

## Goal

Restructure the About content so it carries an avatar image, a news section backed by its own
file, a separate education section, and optional career organizations and profile link targets.

## Scope

- Rewrite `src/content/about/about.{ja,en}.toml` around `icon`, `activities`, `career`,
  `education`, `links`, and a `[news]` pointer.
- Add `src/content/about/news.{ja,en}.toml` as the news source.
- Extend `scripts/content_loader.mjs` to load news, education, and the avatar image path.
- Rebuild the About page layout in `src/pages.jsx`, `src/app.css`, and `src/i18n.js`.
- Update `src/vite-env.d.ts` and `tests/check_content_loader.test.mjs`.

## Non-goals

- Seeding real news entries; the files ship empty with a format comment.
- Supplying an avatar image; `icon = ""` keeps the initials fallback.
- Changes to the Blog, Works, or Reading pages, or to routing and prerendering.

## Assumptions

- Each locale points at its own news file, so `[news] file` stays a per-locale setting.
- An empty news list hides the whole News section rather than rendering an empty block.
- Desktop places Activities in the left column and Career + Education stacked in the right one,
  so DOM order equals visual order equals the requested mobile order.

## Steps

1. Normalize the About TOML: single `[person]` table, `activities` as an array inside it,
   a top-level `[news]` table with `file` and `count`, `[[person.education]]` with
   `period` / `school` / `description`, and a final link with no `href`.
2. Add `news.{ja,en}.toml` holding only the entry-format comment.
3. Extend the loader with `normalizeNewsEntries` (exported and unit-tested), `readNews`,
   news watch files, and `education` / `icon` / localized `period` in `localizeAbout`.
4. Expose `NEWS` through `virtual:site-content`, `src/data.js`, and `window.BlogData`.
5. Rebuild the About render order as News, Activities, Career, Education, Built.
6. Add `about_news` and `about_education` labels; add news, avatar image, and column CSS.
7. Update the type declarations and the content-loader tests.

## Verification

- `python3 scripts/verify.py` (format, lint, actionlint, typecheck, build, unit, integration,
  component, accessibility, Lighthouse).
- Visual check at 1280px and 375px in both themes, on `/` and `/en`, with news entries
  temporarily added to confirm sorting, `count`, link targets, and the empty-state hide.

## Open Issues

- News entries and the avatar image are still to be supplied by the author.
- English school names and job descriptions are working translations and can be reworded.
