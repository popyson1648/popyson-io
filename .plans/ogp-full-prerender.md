# Plan

OGP / Twitter Card full support via path routing + build-time prerendering.

## Goal

Deliver correct, per-page Open Graph and Twitter Card metadata that social
crawlers (X, Facebook, LINE, Slack, Discord) honor, including per-article
`og:title`, per-page `og:description`, and language-aware `og:locale`.

This is the "full support" option chosen by the user. It is intentionally
scoped to its own branch because it is a large, higher-risk change that
rewrites routing, build, and deploy. It is separate from the smaller site
feedback batch (`.plans/site-feedback-improvements.md`).

## Context / Why

The site is a hash-routed (`#/blog/<id>`) client-rendered React SPA, statically
deployed to Cloudflare Pages. Social crawlers do not execute JS and never
receive the URL fragment after `#`, so a shared link such as
`https://popyson.com/#/blog/type-driven-cli` causes the crawler to fetch
`https://popyson.com/` and read only the static `<head>` of the single
`index.html`. Therefore per-article OGP cannot reach crawlers without:

1. moving route state into the path (so the server/CDN can serve a
   route-specific document), and
2. generating a route-specific HTML document with baked-in metadata at build
   time.

## Confirmed values

- Canonical domain: `https://popyson.com`
- Site name: `popyson.com`
- `og:type`: `website`
- `og:title` rule:
  - Blog article: `{article title} | popyson.com`
  - About: `About | popyson.com`
  - Reading list: `Reading list | popyson.com`
  - Works: `Works | popyson.com`
  - Works item: `{item title} | popyson.com`
- `og:site_name`: `popyson.com`
- `og:description`: generic, simple, concise; per-page overridable.
- `og:locale`: follows the page language (`ja_JP` / `en_US`).
- Twitter: `twitter:card=summary_large_image`, `twitter:site=@popyson1648`,
  `twitter:creator=@popyson1648`; title/description/image mirror OG values.
- Provisional image: `provisional_ogp_image.png` (placed in `public/`, 1200x630).

## Scope

### 1. Routing migration (hash -> path, History API)

- `src/app.jsx`:
  - Rewrite `parseRoute` to read `window.location.pathname` (+ `search`)
    instead of `location.hash`. Map `/`, `/about`, `/blog`, `/blog/<id>`,
    `/app`, `/app/<id>`, `/reading`, `/rss`.
  - Replace `hashchange` listener with `popstate`; `nav(to)` uses
    `history.pushState` + manual route state update (and `window.scrollTo`).
  - Keep the existing default-landing behavior (About) consistent with the
    feedback batch.
- Replace every `href="#/..."` / `nav("/...")` usage across:
  - `src/components.jsx` (TopBar `link()`, Footer RSS link, profile links),
  - `src/pages.jsx` (TopPage cloud, RecentList, About `nav`, Works cards,
    detail back buttons, RssPage),
  - `src/blog.jsx` (list links, tag links with `?tag=`, article nav, related),
  - search modal navigation in `src/components.jsx`.
  - Anchors must keep real `href` (e.g. `/blog/x`) for crawlability and
    middle-click, with `onClick` calling `nav` + `preventDefault`.
- Decide language-in-URL strategy for crawler-visible `og:locale`:
  - Option chosen for this plan: prefix locale (`/en/...`), default `ja` at
    root with no prefix. This requires `parseRoute` to strip an optional
    leading `ja|en` segment and `nav`/links to carry the active locale. This
    is the most invasive sub-part; if descoped, ship a single default
    `og:locale=ja_JP` + `og:locale:alternate=en_US` and accept that crawlers
    get the default language only.

### 2. Build-time prerendering

- Add a prerender step that, for each known route, emits a standalone HTML
  file with the correct `<title>` and OG/Twitter `<meta>` baked into `<head>`,
  while still loading the same SPA bundle so client navigation works after
  hydration/mount.
- Approach: a Node post-build script (`scripts/prerender.mjs`) run after
  `vite build`:
  - Read the built `dist/index.html` as a template.
  - Import route data from `src/posts.js` (POSTS) and the Works/About data
    (extract a Node-importable data module if needed, mirroring the
    `posts.js` split done in the feedback batch).
  - For each route, clone the template, inject route-specific
    `<title>`/meta, and write to the matching path
    (`dist/about/index.html`, `dist/blog/<id>/index.html`, etc.).
  - Update `package.json` build: `"build": "vite build && node scripts/prerender.mjs"`.
  - (Optional) Use `react-dom/server` to also prerender visible HTML for
    better SEO/first paint; not required for OGP correctness. Keep optional
    to limit risk.

### 3. Cloudflare Pages serving / SPA fallback

- Add `public/_redirects` (or `_routes.json`) so:
  - Direct deep links serve the matching prerendered HTML.
  - Unknown paths fall back to SPA `index.html` (200 rewrite) so client
    routing still works.
- Verify the existing `reading-refresh.yml` deploy (wrangler pages deploy)
  picks up the new `dist` layout and the prerender step runs in CI.

### 4. Metadata + image

- Add OG/Twitter meta block to the template `index.html` with sensible
  site-wide defaults (used by the SPA fallback and as the prerender base).
- Add a small runtime meta updater (route/lang change) so the live browser
  tab + JS-executing crawlers stay correct after client navigation.
- Add `public/provisional_ogp_image.png` (1200x630). Reference with an
  absolute URL `https://popyson.com/provisional_ogp_image.png`.
  - Note: user asked for a provisional directory at project root, but Vite
    only deploys `public/` and OGP requires a served, stable, absolute URL,
    so the image lives in `public/`.

### 5. RSS coupling

- After path migration, RSS item links change from
  `https://popyson.com/#/blog/<id>` to `https://popyson.com/blog/<id>`.
  Update the RSS generator (added in the feedback batch) accordingly.

## Non-goals

- Changing persona/demo content.
- Server-side rendering beyond what prerendering requires.
- Per-article social image generation (single provisional image for now).

## Assumptions

- Node 22 / Vite 6; `vite.config.js` is ESM.
- Production domain is `https://popyson.com`.
- The feedback batch (`posts.js` split, static `feed.xml`, site rename,
  About landing) has already landed; this branch builds on it.

## Steps

1. Branch from the merged feedback batch (not stale main).
2. Implement path routing in `app.jsx` + update all links/search nav.
3. Decide + implement locale-in-URL (or descope to default locale).
4. Add `scripts/prerender.mjs` + wire `package.json` build.
5. Add `_redirects` / `_routes.json` + provisional image + meta template.
6. Add runtime meta updater.
7. Update RSS item links to path form.
8. Update `.project/structure.md`, add `.decisions/ogp-path-routing.md`.
9. Verify (below).

## Verification

- `python3 scripts/verify.py` (lint / build / a11y / Lighthouse).
- `npm run build && npm run preview`, then:
  - Direct-load each deep link (`/blog/<id>`, `/about`, `/app/<id>`, ...) and
    confirm `view-source` shows the correct baked `<title>` + OG/Twitter meta.
  - Client navigation between pages still works (no full reloads breaking).
  - `?tag=` filtering, search modal navigation, back buttons work.
  - Validate cards with a local OGP/Twitter validator or by inspecting the
    served HTML head per route.
- Confirm CI deploy (`reading-refresh.yml`) builds and uploads the new
  multi-file `dist` and `_redirects` correctly to Cloudflare Pages.

## Open Issues

Resolved during implementation (see `.decisions/ogp-path-routing.md`):

- Locale-in-URL: **chosen** — per-locale URLs (`/en` prefix) + bidirectional
  `hreflang` + per-locale prerendered files, for findability, shareability,
  and web-native correctness. Language is derived from the URL (no
  `localStorage`).
- SSR vs head-only: **head-only** prerendering (no `react-dom/server`);
  recommended low-risk path for OGP correctness. Body SSR deferred.
- 404 / unknown deep links: rely on Cloudflare Pages' default SPA fallback
  (no top-level `404.html`, no `_redirects` catch-all so prerendered files are
  not shadowed); unknown paths boot the SPA, which routes to About.
- Provisional image: generated 1200x630 placeholder
  (`public/provisional_ogp_image.png` via `scripts/make_ogp_placeholder.mjs`).

Still open:

- Replace the provisional image with a real (non-placeholder) 1200x630 OGP
  image before launch.
- In-app article/Works/related links remain native `<button>`s (the a11y
  check enforces native buttons), so they are not crawlable as `<a href>` and
  lack middle-click open-in-new-tab. Discovery is covered by `sitemap.xml` +
  `hreflang`; converting cards to anchors is a possible follow-up.
- Canonical URLs use the no-trailing-slash form (matching the RSS feed); if
  Cloudflare's served trailing-slash form causes a canonical mismatch in
  practice, reconcile the two.
