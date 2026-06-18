# Decision

## Title

Prerender `#root` body for all routes by static-rendering React components

## Date

2026-06-18

## Status

Accepted

## Decision

Every route's primary body content is baked into the served HTML at build time.
Non-article routes (About, Blog list, Application, Application detail, Reading,
RSS) are rendered from their real React page components with `react-dom/server`
`renderToStaticMarkup` and injected into `#root` by `scripts/prerender.mjs`.
The renderer lives in `src/prerenderRoutes.jsx` and is loaded through Vite's SSR
pipeline so JSX and `virtual:site-content` resolve.

The client still mounts with `createRoot`, which replaces the baked markup on
mount. There is no hydration, so the static render never produces a DOM-mismatch
warning. Article routes keep their dedicated body injection.

## Context

`scripts/prerender.mjs` previously baked only article bodies into `#root`; other
routes shipped a near-empty root, hurting crawler and no-JS visibility (issue
#32). The page components read content from `window.BlogData` / `window.I18N` and
only touch browser APIs inside effects and handlers, so their render paths are
safe to execute in Node behind a minimal `window` shim.

## Alternatives

- Hand-write static HTML fragments per route (like the article injection). High
  duplication and drift risk against the live components.
- Adopt full client hydration (`renderToString` + `hydrateRoot`). Requires making
  the app shell SSR-safe (route injection, guarding `localStorage` / `matchMedia`
  / `window.location`) and debugging hydration mismatches — large scope for a
  static site, and contrary to the accepted `build-time-article-rendering`
  decision that keeps React responsible only for the shell and interactions.
- Pre-render only metadata and rely on the SPA for body content (the prior state).

## Reason

Reusing the real components keeps the prerendered body in lockstep with the live
UI (no drift) while staying within the established "static markup replaced by
`createRoot`" model. It needs no app-shell refactor and adds no client hydration
risk, yet makes every route's main content visible without JavaScript.

## Consequences

- `scripts/prerender.mjs` spins up a short-lived Vite SSR server during build to
  transform `src/prerenderRoutes.jsx`.
- Page components must keep browser-API usage inside effects/handlers so the
  static render stays safe; `scripts/check_prerendered_routes.mjs` guards that
  each route's body is present in `dist`.
- `BlogList` renders server-side, producing a benign build-time
  "useLayoutEffect does nothing on the server" notice (not a client warning).

## Revisit Conditions

Revisit if the site adopts full React SSR/hydration, if a route needs
request-time personalization, or if a page component must read browser state
during render.
