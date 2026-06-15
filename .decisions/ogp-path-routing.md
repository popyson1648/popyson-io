# Decision

## Title

OGP via path routing, per-locale URLs, and build-time prerendering

## Date

2026-06-16

## Status

Accepted

## Decision

Serve correct per-page Open Graph / Twitter Card metadata to crawlers by:

1. Migrating routing from hash (`#/blog/<id>`) to the History API path
   (`/blog/<id>`), with **language carried in the URL path**: Japanese
   (default) has no prefix, English is served under `/en` (e.g.
   `/en/blog/<id>`). Language is derived from the URL, not `localStorage`.
2. Prerendering, after `vite build`, a standalone HTML file per route and
   locale (`scripts/prerender.mjs`) with a baked `<head>`: `<title>`,
   description, `canonical`, bidirectional `hreflang` (ja / en / x-default),
   Open Graph and Twitter Card meta. Each file still loads the same SPA
   bundle, so client navigation works after mount.
3. A runtime `<head>` updater in `src/app.jsx` that re-applies the same
   metadata on client navigation, sharing the single source of truth in
   `src/meta.js` so prerendered and live `<head>`s never drift.
4. Emitting `sitemap.xml` (with `hreflang` alternates) and `robots.txt` for
   discoverability.

Prerendering bakes the `<head>` only; the visible `<body>` is still rendered
by the client SPA (no `react-dom/server`).

## Context

The site is a client-rendered React SPA on Cloudflare Pages. Social crawlers
do not execute JS and never receive the URL fragment after `#`, so a shared
`#/blog/<id>` link made every crawler read the single static `index.html`
head. Per-page OGP therefore could not reach crawlers without moving route
(and locale) state into the path and generating route-specific documents.

Content is bilingual within each post (`title.ja`/`title.en`), switched by a
user-initiated toggle.

## Alternatives

- **Single default locale** (`og:locale=ja_JP` + `og:locale:alternate=en_US`,
  one canonical URL, no `/en`): lowest risk, but the English rendering is
  invisible to crawlers and not independently shareable/bookmarkable.
- **Full SSR of the body** (`react-dom/server`): better first paint / SEO of
  body text, but high hydration-mismatch risk given `localStorage`-driven
  theme and the `window.BlogData` / `window.I18N` global-injection pattern;
  out of proportion to the OGP goal.
- **Dynamic rendering / prerender service** (serve prerendered HTML only to
  crawlers): extra infrastructure; unnecessary for a small static site.

## Reason

Evaluated against findability, usability, and alignment with how the web
works (URL identifies a resource), per-locale URLs win on all three:

- Findability: both languages are independently crawlable/indexable; backed
  by `sitemap.xml` + `hreflang`.
- Usability: language is part of the URL, so shared/bookmarked links preserve
  language and middle-click works.
- Web-native: separate URLs + self-canonical + bidirectional `hreflang` is
  the recommended multilingual pattern.

Head-only prerendering is the recommended, low-risk way to make OGP correct
for crawlers without taking on SSR hydration risk.

## Consequences

- Routing, all in-app links, and the language toggle now operate on paths and
  apply the locale prefix; `localStorage` no longer stores language.
- `src/apps.js` was extracted (mirroring `src/posts.js`) so Works data is
  Node-importable by the prerenderer.
- `npm run build` is now `vite build && node scripts/prerender.mjs` and emits a
  multi-file `dist/` (route directories + `sitemap.xml` + `robots.txt`).
- Cloudflare Pages serves the prerendered file for each clean URL; unknown
  paths fall back to the SPA via Pages' default single-page-application
  behavior (no top-level `404.html`, **no `_redirects` catch-all**, which
  would otherwise shadow the prerendered files).
- Asset and favicon references are absolute (`/assets/...`, `/favicon.svg`) so
  they resolve from nested route paths.

## Revisit Conditions

- Replace the provisional 1200x630 image (`public/provisional_ogp_image.png`)
  with a real social image before launch.
- If body-level SEO/first paint becomes a priority, revisit full SSR/SSG.
- If per-article social images or an English RSS feed are wanted.
- Canonical URLs use the no-trailing-slash form to match the RSS feed; if
  Cloudflare's served form (trailing slash) causes a canonical mismatch in
  practice, reconcile the two.
