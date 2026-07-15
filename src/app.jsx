/* ============================================================
   App shell: routing, theme, language
   ============================================================ */
import { useEffect, useMemo, useState } from "react";
import { AppCtx, Footer, TopBar } from "./components.jsx";
import { AboutPage, ApplicationDetail, ApplicationPage, ReadingPage, RssPage } from "./pages.jsx";
import { Article, BlogList } from "./blog.jsx";
import { headModel, localized } from "./meta.js";
import { parseRoute } from "./routing.js";

const RISOGRAPH_DEFAULTS = {
  bgNoiseOpacity: 30,
  // Keep baseFrequency at or below ~1 cycle per rendered pixel (tile is
  // 200px for a 200-unit viewBox). Higher values alias into blotchy
  // moiré, which the dark theme's screen blend makes plainly visible.
  bgNoiseFrequency: 0.9,
  bgNoiseOctaves: 2,
  bgDistortion: 0,
  bgRoughness: 0.25,
  textNoiseOpacity: 11,
  textNoiseFrequency: 25,
  textDistortion: 0,
  textRoughness: 0.16,
};

function createNoiseUrl(frequency, octaves = 3) {
  const noiseSvg = `
    <svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'>
      <filter id='noiseFilter'>
        <feTurbulence type='fractalNoise' baseFrequency='${frequency}' numOctaves='${octaves}' stitchTiles='stitch'/>
        <feColorMatrix type='saturate' values='0'/>
      </filter>
      <rect width='100%' height='100%' filter='url(#noiseFilter)'/>
    </svg>
  `;
  return `url("data:image/svg+xml,${encodeURIComponent(noiseSvg.trim())}")`;
}

function createFilterId(prefix, distortion, roughness) {
  const safeRoughness = String(roughness).replace(".", "-");
  return `${prefix}-${distortion}-${safeRoughness}`;
}

// Upsert <head> tags so the live tab + JS-executing crawlers stay correct
// after client navigation. Mirrors what scripts/prerender.mjs bakes in.
function upsertMeta(key, keyAttr, content) {
  let el = document.head.querySelector(`meta[${keyAttr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(keyAttr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}
function upsertLink(rel, href, hreflang) {
  const sel = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang]):not([type])`;
  let el = document.head.querySelector(sel);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    if (hreflang) el.setAttribute("hreflang", hreflang);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}
function applyHead(m) {
  document.title = m.title;
  upsertMeta("description", "name", m.description);
  upsertLink("canonical", m.canonical);
  for (const a of m.alternates) upsertLink("alternate", a.href, a.hreflang);
  upsertMeta("og:type", "property", m.og.type);
  upsertMeta("og:site_name", "property", m.og.site_name);
  upsertMeta("og:title", "property", m.og.title);
  upsertMeta("og:description", "property", m.og.description);
  upsertMeta("og:url", "property", m.og.url);
  upsertMeta("og:image", "property", m.og.image);
  upsertMeta("og:locale", "property", m.og.locale);
  upsertMeta("og:locale:alternate", "property", m.og.localeAlternate);
  upsertMeta("twitter:card", "name", m.twitter.card);
  upsertMeta("twitter:site", "name", m.twitter.site);
  upsertMeta("twitter:creator", "name", m.twitter.creator);
  upsertMeta("twitter:title", "name", m.twitter.title);
  upsertMeta("twitter:description", "name", m.twitter.description);
  upsertMeta("twitter:image", "name", m.twitter.image);
}

function useSystemDark() {
  const [dark, setDark] = useState(
    () => window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const fn = (e) => setDark(e.matches);
    mq.addEventListener ? mq.addEventListener("change", fn) : mq.addListener(fn);
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", fn) : mq.removeListener(fn);
    };
  }, []);
  return dark;
}

export default function App() {
  const [route, setRoute] = useState(() =>
    parseRoute(window.location.pathname, window.location.search),
  );
  const lang = route.lang; // language is derived from the URL (no localStorage)
  const [theme, setTheme] = useState(() => localStorage.getItem("blog.theme") || "system");
  const riso = RISOGRAPH_DEFAULTS;
  const sysDark = useSystemDark();
  const bgNoiseUrl = useMemo(
    () => createNoiseUrl(riso.bgNoiseFrequency, riso.bgNoiseOctaves),
    [riso.bgNoiseFrequency, riso.bgNoiseOctaves],
  );
  const bgFilterId = useMemo(
    () => createFilterId("bg-rough", riso.bgDistortion, riso.bgRoughness),
    [riso.bgDistortion, riso.bgRoughness],
  );

  // routing (History API). `to` is a canonical, locale-less path
  // (e.g. "/blog/x", "/blog?tag=foo"); the active locale prefix is applied
  // here. Pass `langOverride` to switch language while staying on the route.
  useEffect(() => {
    const fn = () => setRoute(parseRoute(window.location.pathname, window.location.search));
    window.addEventListener("popstate", fn);
    return () => window.removeEventListener("popstate", fn);
  }, []);
  const nav = (to, langOverride) => {
    const url = localized(to, langOverride || route.lang);
    if (url !== window.location.pathname + window.location.search) {
      window.history.pushState({}, "", url);
    }
    setRoute(parseRoute(window.location.pathname, window.location.search));
    window.scrollTo(0, 0);
  };

  // keep document.title + OG/Twitter/hreflang meta in sync with the route
  useEffect(() => {
    applyHead(headModel(route, lang));
  }, [route, lang]);

  // resolve + apply theme
  const resolved = theme === "system" ? (sysDark ? "dark" : "light") : theme;
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolved);
    localStorage.setItem("blog.theme", theme);
  }, [theme, resolved]);

  // lang (authoritative source is the URL)
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // riso/grain CSS vars (corner radius + per-theme --accent now come straight
  // from src/styles.css :root and the generated virtual:theme.css).
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--bg-noise-url", bgNoiseUrl);
    root.style.setProperty("--text-noise-url", "none");
    root.style.setProperty("--bg-noise-opacity", String(riso.bgNoiseOpacity / 100));
    root.style.setProperty("--bg-edge-filter", `url(#${bgFilterId})`);
    root.style.setProperty("--text-edge-filter", "none");
    root.style.setProperty("--text-ink-opacity", "0%");
    root.style.setProperty("--text-ink-alt-opacity", "0%");
    root.style.setProperty("--text-ink-offset", "0px");
    root.style.setProperty("--text-ink-alt-offset", "0px");
  }, [bgFilterId, bgNoiseUrl, riso]);

  const t = window.I18N[lang];
  const ctx = { t, lang, theme, setTheme, route, nav };

  let page;
  switch (route.name) {
    case "about":
      page = <AboutPage />;
      break;
    case "blog":
      page = <BlogList />;
      break;
    case "article":
      page = <Article id={route.id} />;
      break;
    case "app":
      page = <ApplicationPage />;
      break;
    case "appDetail":
      page = <ApplicationDetail id={route.id} />;
      break;
    case "reading":
      page = <ReadingPage />;
      break;
    case "rss":
      page = <RssPage />;
      break;
    default:
      page = <AboutPage />;
  }

  return (
    <AppCtx.Provider value={ctx}>
      <div className="grain-bg" aria-hidden="true">
        <div className="bg-gradient">
          <div className="bg-gradient-noise"></div>
          <div className="bg-gradient-color"></div>
        </div>
        <div className="bg-noise"></div>
      </div>
      <div className="app">
        <svg className="grain-filter-defs" aria-hidden="true" focusable="false">
          {/* Dark-mode remap for the finished light gradient (.bg-gradient):
              in the light palette the blue channel runs the paper↔lime axis
              (#fdfff7 B=247 … #d4ff0a B=10). Swap only the existing dark
              endpoints: light paper maps to dim lime #2f3b07, and light lime
              maps to dark paper #12141d. Every blurred in-between shade stays
              proportional along the same axis. */}
          <filter id="gg-dark-map" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="0 0  0.122363 0 0.065790
                      0 0  0.164558 0 0.071978
                      0 0 -0.092827 0 0.117366
                      0 0  0        1 0"
            />
          </filter>
          <filter id={bgFilterId} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={riso.bgRoughness}
              numOctaves="3"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={riso.bgDistortion}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </svg>
        <TopBar />
        <main id="main" className="app-main" tabIndex={-1}>
          {page}
        </main>
        <Footer />
      </div>
    </AppCtx.Provider>
  );
}
