/* ============================================================
   Route metadata — single source of truth for titles, descriptions,
   canonical URLs, hreflang alternates and Open Graph / Twitter Card
   values.

   Consumed by:
   - the browser app (src/app.jsx) to keep document.title + <head> meta
     correct after client-side navigation, and
   - the build-time prerenderer (scripts/prerender.mjs) to bake a
     route-specific <head> into a standalone HTML file per route/locale.

   Locale strategy: language lives in the URL path. Japanese (default)
   has no prefix; English is served under "/en". Each page self-canonicals
   and links bidirectional hreflang alternates (ja / en / x-default), so
   both languages are independently crawlable and shareable.

   Plain ESM so it is importable from Node during the build. Post data is
   supplied by window.BlogData in the browser and configureMetaData() in Node.
   ============================================================ */
import { APPS } from "./apps.js";

export const SITE = {
  url: "https://popyson.com",
  name: "popyson.com",
  twitter: "@popyson1648",
  image: "https://popyson.com/provisional_ogp_image.png",
};

const L = (field, lang) => (field && field[lang]) || (field && field.ja) || "";
const ROUTE_LOCALES = ["ja", "en"];
let configuredPosts = [];

export function configureMetaData({ POSTS = [] } = {}) {
  configuredPosts = POSTS;
}

function posts() {
  return globalThis.window?.BlogData?.POSTS || configuredPosts;
}

// Generic, concise per-page descriptions (overridden by article / work copy).
const PAGE_DESC = {
  about:   { ja: "分散システム、開発者ツール、設計について書く個人ブログ。", en: "A personal site on distributed systems, developer tools and design." },
  blog:    { ja: "書いたものの一覧。", en: "Things I've written." },
  app:     { ja: "作ったものの一覧。", en: "Things I've built." },
  reading: { ja: "読んだもの・読みたいもの。", en: "Things I've read and want to read." },
  rss:     { ja: "更新を RSS で購読できます。", en: "Subscribe to updates via RSS." },
};

// og:title suffix label per page (kept ASCII / English per the OGP plan).
const PAGE_LABEL = {
  about:   "About",
  blog:    "Blog",
  app:     "Works",
  reading: "Reading list",
  rss:     "RSS",
};

/** Canonical (locale-less, tag-less) path for a route. About is the home ("/"). */
export function routeToPath(route) {
  switch (route.name) {
    case "about":     return "/";
    case "blog":      return "/blog";
    case "article":   return `/blog/${route.id}`;
    case "app":       return "/app";
    case "appDetail": return `/app/${route.id}`;
    case "reading":   return "/reading";
    case "rss":       return "/rss";
    default:          return "/";
  }
}

/** Prefix a canonical path with the locale segment ("/en") for English. */
export function localized(path, lang) {
  if (lang !== "en") return path;
  return path === "/" ? "/en" : `/en${path}`;
}

function findPost(id) { return posts().find((p) => p.id === id) || null; }
function findApp(id) { return APPS.find((a) => a.id === id) || null; }

/** Page title + description for a route in a given language. */
function titleAndDesc(route, lang) {
  switch (route.name) {
    case "article": {
      const p = findPost(route.id);
      if (p) return { title: `${L(p.title, lang)} | ${SITE.name}`, description: L(p.summary, lang) };
      break;
    }
    case "appDetail": {
      const a = findApp(route.id);
      if (a) return { title: `${a.title} | ${SITE.name}`, description: L(a.desc, lang) };
      break;
    }
    default:
      break;
  }
  const label = PAGE_LABEL[route.name] || PAGE_LABEL.about;
  const desc = PAGE_DESC[route.name] || PAGE_DESC.about;
  return { title: `${label} | ${SITE.name}`, description: L(desc, lang) };
}

/**
 * Structured head model for a route/locale. Both the prerenderer (to HTML)
 * and the runtime updater (to the DOM) consume this so the two never drift.
 */
export function headModel(route, lang) {
  const { title, description } = titleAndDesc(route, lang);
  const canonicalPath = routeToPath(route); // tag-less: filters are not distinct canonicals
  const canonical = SITE.url + localized(canonicalPath, lang);
  const locale = lang === "en" ? "en_US" : "ja_JP";
  const altLocale = lang === "en" ? "ja_JP" : "en_US";

  return {
    lang,
    title,
    description,
    canonical,
    alternates: [
      { hreflang: "ja", href: SITE.url + localized(canonicalPath, "ja") },
      { hreflang: "en", href: SITE.url + localized(canonicalPath, "en") },
      { hreflang: "x-default", href: SITE.url + localized(canonicalPath, "ja") },
    ],
    og: {
      type: "website",
      site_name: SITE.name,
      title,
      description,
      url: canonical,
      image: SITE.image,
      locale,
      localeAlternate: altLocale,
    },
    twitter: {
      card: "summary_large_image",
      site: SITE.twitter,
      creator: SITE.twitter,
      title,
      description,
      image: SITE.image,
    },
  };
}

function baseRouteEntries() {
  return [
    { dir: "",      route: { name: "about" } },   // home (About is the landing)
    { dir: "about", route: { name: "about" } },   // alias, canonicals to "/"
    { dir: "blog",  route: { name: "blog" } },
    ...posts().map((p) => ({ dir: `blog/${p.id}`, route: { name: "article", id: p.id } })),
    { dir: "app",   route: { name: "app" } },
    ...APPS.map((a) => ({ dir: `app/${a.id}`, route: { name: "appDetail", id: a.id } })),
    { dir: "reading", route: { name: "reading" } },
    { dir: "rss",     route: { name: "rss" } },
  ];
}

function outputDirForLocale(dir, lang) {
  if (lang !== "en") return dir;
  return dir ? `en/${dir}` : "en";
}

function localizedRouteEntries(entries) {
  return entries.flatMap((entry) => ROUTE_LOCALES.map((lang) => ({
    dir: outputDirForLocale(entry.dir, lang),
    route: entry.route,
    lang,
  })));
}

/**
 * Every route to prerender, for both locales. `dir` is the output directory
 * under dist/ (""/"about"/"blog/<id>"/... and the "en/"-prefixed mirror).
 */
export function allRoutes() {
  return localizedRouteEntries(baseRouteEntries());
}
