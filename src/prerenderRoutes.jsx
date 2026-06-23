/* ============================================================
   Build-time root renderer for non-article routes.

   scripts/prerender.mjs loads this module through Vite's SSR pipeline
   (so JSX and `virtual:site-content` resolve) and renders each route's
   main page component to static HTML. The markup is baked into the
   route's `#root` so crawlers and no-JS visitors see the primary body
   content. The SPA still mounts via `createRoot`, which replaces the
   baked markup on the client — there is no hydration, so the static
   render never produces a DOM-mismatch warning.

   The page components read content from `window.BlogData` / `window.I18N`
   and only touch browser APIs inside effects and event handlers, which do
   not run during `renderToStaticMarkup`. A minimal `window` shim plus the
   content modules (data.js / i18n.js / articleBody.js) supply everything
   the render path needs.
   ============================================================ */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AppCtx } from "./components.jsx";
import { AboutPage, ApplicationDetail, ApplicationPage, ReadingPage, RssPage } from "./pages.jsx";
import { BlogList } from "./blog.jsx";

let globalsReady = null;

// The content modules attach to `window` via IIFEs on import, so the shim
// must exist first. react-dom/server is already imported above (without a
// window), so loading the shim here cannot make it misdetect a browser.
async function ensureGlobals() {
  if (!globalsReady) {
    globalsReady = (async () => {
      if (typeof globalThis.window === "undefined") {
        globalThis.window = /** @type {Window & typeof globalThis} */ (/** @type {unknown} */ (globalThis));
      }
      await import("./i18n.js"); // -> window.I18N
      await import("./data.js"); // -> window.BlogData
      await import("./articleBody.js"); // -> window.ArticleBody
    })();
  }
  return globalsReady;
}

const PAGE_BY_ROUTE = {
  about: () => createElement(AboutPage),
  blog: () => createElement(BlogList),
  app: () => createElement(ApplicationPage),
  appDetail: (route) => createElement(ApplicationDetail, { id: route.id }),
  reading: () => createElement(ReadingPage),
  rss: () => createElement(RssPage),
};

/**
 * Render a route's main page component to static HTML for `#root`.
 * Returns "" for routes handled elsewhere (e.g. `article`).
 */
export async function renderRouteRoot(route, lang) {
  const make = PAGE_BY_ROUTE[route.name];
  if (!make) return "";
  await ensureGlobals();
  const t = window.I18N?.[lang];
  if (!t) throw new Error(`Missing i18n bundle for lang "${lang}" in renderRouteRoot(${route.name})`);
  const noop = () => {};
  // Static render: nav/theme handlers never fire, so a no-op context is enough.
  const ctx = { t, lang, theme: "light", setTheme: noop, route, nav: noop };
  return renderToStaticMarkup(createElement(AppCtx.Provider, { value: ctx }, make(route)));
}
