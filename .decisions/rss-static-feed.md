# Decision

## Title

Generate a static RSS feed at build time

## Date

2026-06-15

## Status

Accepted

## Decision

Generate a real `feed.xml` (RSS 2.0) during the Vite build via a plugin in
`vite.config.js`, served at `/feed.xml`. Post metadata is read from
`src/posts.js`, which is the single source of truth shared with the browser
app through `src/data.js`.

## Context

The previous RSS page only displayed a placeholder URL
(`https://sen-no-note.example/feed.xml`) and the autodiscovery `<link>`
pointed at the in-app `#/rss` React page, so no real feed existed and RSS did
not function. The site is a static SPA deployed to Cloudflare Pages.

## Alternatives

- Keep the placeholder (do nothing).
- Add a standalone `scripts/generate_feed.mjs` run before `vite build`
  (requires a `public/` file and gitignore handling).
- Emit `feed.xml` from a Vite `generateBundle` hook directly into `dist`.

## Reason

The Vite plugin approach keeps a single source of truth (`src/posts.js`),
emits the feed straight into `dist` (no `public/` file to manage or ignore),
and runs automatically in both local `npm run build` and the CI
`reading-refresh.yml` deploy. Absolute URLs use the confirmed canonical
domain `https://popyson.com`.

## Consequences

- POSTS moved out of `src/data.js` into `src/posts.js`; `data.js` imports it.
- `feed.xml` is produced only on production build, not in `npm run dev`.
- Item links are written in path form (`https://popyson.com/blog/<id>`) on the
  premise of the path-routing migration in `.plans/ogp-full-prerender.md`,
  which is implemented immediately after on its own branch. This avoids a
  hash-then-path double edit. Until that routing lands, these links resolve
  only once the path routing is in place.

## Revisit Conditions

- Keep the item link format in sync if the path-routing scheme changes.
- Add full-content `<content:encoded>` if subscribers need article bodies.
