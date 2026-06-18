# Plan

## Goal

Implement issue #32: prerender the `#root` body for every route, not just
articles. About, Blog list, Application, Application detail, Reading, and RSS
must ship their primary body content in the static HTML so crawlers and no-JS
visitors see it. Client navigation and the existing article prerender must be
preserved, with no hydration warnings or runtime errors.

## Scope

1. Add `src/prerenderRoutes.jsx`: a build-time SSR entry that renders each
   non-article route's real React page component to static HTML via
   `react-dom/server` `renderToStaticMarkup`, wrapped in an `AppCtx` provider
   with no-op `nav`/`setTheme`. Browser globals (`window.BlogData`,
   `window.I18N`, `window.ArticleBody`) are supplied through a `window` shim and
   the existing content bootstrap modules.
2. Update `scripts/prerender.mjs` to load that entry through Vite's SSR pipeline
   (`createServer` middleware mode + `ssrLoadModule`) and bake the rendered body
   into `#root` for non-article routes. Article routes keep the existing
   `renderArticleRoot` injection.
3. Add `scripts/check_prerendered_routes.mjs` smoke test and wire it into the
   `test_unit` verification phase.
4. Update `.project/structure.md`, `.project/testing.md`, and record a decision.

## Non-goals

- Full client-side React hydration (`hydrateRoot`). The SPA still mounts with
  `createRoot`, which replaces the baked markup — the established architecture
  in `.decisions/build-time-article-rendering.md`.
- Rendering the app shell (TopBar/Footer/grain background) into `#root`; only
  the page body is baked, matching the article convention.
- Changing routing, metadata, sitemap/robots, or search index generation.

## Assumptions

- Page components only touch browser APIs inside effects and event handlers,
  which do not run during `renderToStaticMarkup`; their render paths read data
  from `window.BlogData` / `window.I18N` only.
- Because there is no hydration, static-render output need not byte-match the
  client render; `createRoot` discards it on mount.

## Steps

1. Worktree off `origin/main`.
2. Write `src/prerenderRoutes.jsx` (window shim + `renderRouteRoot`).
3. Wire `scripts/prerender.mjs` to the Vite SSR loader.
4. Add `scripts/check_prerendered_routes.mjs`; add it to `verification.toml`.
5. Update project docs and record the decision.
6. `python3 scripts/verify.py`; inspect `dist/**` and `npm run preview`.

## Verification

- `python3 scripts/verify.py` (lint, build+unit smoke incl. the new check, a11y,
  lighthouse).
- Inspect generated `dist` route HTML for ja and en: About name, Blog post list,
  Works grid, app detail title, Reading list, RSS URL all present in `#root`.
- `npm run preview`: client navigation works; no console hydration warning or
  runtime error.

## Open Issues

- `BlogList` renders `@tanstack/react-table` server-side; React logs a benign
  "useLayoutEffect does nothing on the server" notice at build time. It is not a
  client hydration warning and does not affect output.
