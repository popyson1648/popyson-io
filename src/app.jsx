/* ============================================================
   App shell: routing, theme, language, tweaks
   ============================================================ */
import { useEffect, useMemo, useState } from "react";
import { AppCtx, Footer, TopBar } from "./components.jsx";
import { AboutPage, ApplicationDetail, ApplicationPage, ReadingPage, RssPage } from "./pages.jsx";
import { Article, BlogList } from "./blog.jsx";
import { TweakColor, TweakRadio, TweakSection, TweaksPanel, useTweaks } from "./tweaks-panel.jsx";
import { headModel, localized } from "./meta.js";

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "topLayout": "hero",
  "blogLayout": "list",
  "appLayout": "cards",
  "aboutLayout": "two-col",
  "cornerStyle": "rounded",
  "lightAccent": "#4960ff",
  "darkAccent": "#6f82ff"
}/*EDITMODE-END*/;

const RISOGRAPH_DEFAULTS = {
  bgNoiseOpacity: 30,
  bgNoiseFrequency: 15.5,
  bgDistortion: 0,
  bgRoughness: 0.25,
  circleOpacity: 60,
  circleNoiseOpacity: 6,
  circleNoiseFrequency: 33,
  circleDistortion: 8,
  circleRoughness: 0.25,
  textNoiseOpacity: 11,
  textNoiseFrequency: 25,
  textDistortion: 0,
  textRoughness: 0.16,
};

function createNoiseUrl(frequency) {
  const noiseSvg = `
    <svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'>
      <filter id='noiseFilter'>
        <feTurbulence type='fractalNoise' baseFrequency='${frequency}' numOctaves='3' stitchTiles='stitch'/>
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

// Path-based routing. Language lives in the URL: Japanese (default) has no
// prefix, English is served under "/en". The leading locale segment is
// stripped here and carried on the route as `lang`.
function parseRoute(pathname, search) {
  let path = pathname || "/";
  let lang = "ja";
  if (/^\/en(\/|$)/.test(path)) { lang = "en"; path = path.slice(3) || "/"; }
  const query = new URLSearchParams(search || "");
  const parts = path.split("/").filter(Boolean); // ["blog","id"]
  const seg = parts[0] || "";
  let route;
  if (seg === "")             route = { name: "about" };
  else if (seg === "about")   route = { name: "about" };
  else if (seg === "blog")    route = parts[1] ? { name: "article", id: parts[1] } : { name: "blog", tag: query.get("tag") || null };
  else if (seg === "app")     route = parts[1] ? { name: "appDetail", id: parts[1] } : { name: "app" };
  else if (seg === "reading") route = { name: "reading" };
  else if (seg === "rss")     route = { name: "rss" };
  else                        route = { name: "about" };
  return { ...route, lang };
}

// Upsert <head> tags so the live tab + JS-executing crawlers stay correct
// after client navigation. Mirrors what scripts/prerender.mjs bakes in.
function upsertMeta(key, keyAttr, content) {
  let el = document.head.querySelector(`meta[${keyAttr}="${key}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute(keyAttr, key); document.head.appendChild(el); }
  el.setAttribute("content", content);
}
function upsertLink(rel, href, hreflang) {
  const sel = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]:not([hreflang]):not([type])`;
  let el = document.head.querySelector(sel);
  if (!el) { el = document.createElement("link"); el.setAttribute("rel", rel); if (hreflang) el.setAttribute("hreflang", hreflang); document.head.appendChild(el); }
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
  const [dark, setDark] = useState(() => window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const fn = (e) => setDark(e.matches);
    mq.addEventListener ? mq.addEventListener("change", fn) : mq.addListener(fn);
    return () => { mq.removeEventListener ? mq.removeEventListener("change", fn) : mq.removeListener(fn); };
  }, []);
  return dark;
}

export default function App() {
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = useState(() => parseRoute(window.location.pathname, window.location.search));
  const lang = route.lang; // language is derived from the URL (no localStorage)
  const [theme, setTheme] = useState(() => localStorage.getItem("blog.theme") || "system");
  const riso = RISOGRAPH_DEFAULTS;
  const sysDark = useSystemDark();
  const bgNoiseUrl = useMemo(() => createNoiseUrl(riso.bgNoiseFrequency), [riso.bgNoiseFrequency]);
  const circleNoiseUrl = useMemo(() => createNoiseUrl(riso.circleNoiseFrequency), [riso.circleNoiseFrequency]);
  const bgFilterId = useMemo(() => createFilterId("bg-rough", riso.bgDistortion, riso.bgRoughness), [riso.bgDistortion, riso.bgRoughness]);
  const circleFilterId = useMemo(() => createFilterId("circle-rough", riso.circleDistortion, riso.circleRoughness), [riso.circleDistortion, riso.circleRoughness]);

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
  useEffect(() => { applyHead(headModel(route, lang)); }, [route, lang]);

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

  // apply tweak-driven CSS vars
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--r", tw.cornerStyle === "square" ? "0px" : "5px");
    root.style.setProperty("--r-sm", tw.cornerStyle === "square" ? "0px" : "3px");
  }, [tw.cornerStyle]);
  useEffect(() => {
    // accent override per resolved theme
    const v = resolved === "dark" ? tw.darkAccent : tw.lightAccent;
    document.documentElement.style.setProperty("--accent", v);
  }, [tw.lightAccent, tw.darkAccent, resolved]);
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--bg-noise-url", bgNoiseUrl);
    root.style.setProperty("--circle-noise-url", circleNoiseUrl);
    root.style.setProperty("--text-noise-url", "none");
    root.style.setProperty("--grain-light", circleNoiseUrl);
    root.style.setProperty("--grain-dark", circleNoiseUrl);
    root.style.setProperty("--bg-noise-opacity", riso.bgNoiseOpacity / 100);
    root.style.setProperty("--bg-edge-filter", `url(#${bgFilterId})`);
    root.style.setProperty("--grain-circle-opacity", riso.circleOpacity / 100);
    root.style.setProperty("--grain-noise-opacity", riso.circleNoiseOpacity / 100);
    root.style.setProperty("--circle-edge-filter", `url(#${circleFilterId})`);
    root.style.setProperty("--text-edge-filter", "none");
    root.style.setProperty("--text-ink-opacity", "0%");
    root.style.setProperty("--text-ink-alt-opacity", "0%");
    root.style.setProperty("--text-ink-offset", "0px");
    root.style.setProperty("--text-ink-alt-offset", "0px");
  }, [bgFilterId, bgNoiseUrl, circleFilterId, circleNoiseUrl, riso]);

  const t = window.I18N[lang];
  const ctx = { t, lang, theme, setTheme, route, nav, tw };

  let page;
  switch (route.name) {
    case "about":     page = <AboutPage />; break;
    case "blog":      page = <BlogList />; break;
    case "article":   page = <Article id={route.id} />; break;
    case "app":       page = <ApplicationPage />; break;
    case "appDetail": page = <ApplicationDetail id={route.id} />; break;
    case "reading":   page = <ReadingPage />; break;
    case "rss":       page = <RssPage />; break;
    default:          page = <AboutPage />;
  }

  return (
    <AppCtx.Provider value={ctx}>
      <div className="grain-bg" aria-hidden="true">
        <div className="bg-noise"></div>
        <div className="grain-circle grain-circle-1">
          <div className="grain-color"></div>
          <div className="grain-noise"></div>
        </div>
        <div className="grain-circle grain-circle-2">
          <div className="grain-color"></div>
          <div className="grain-noise"></div>
        </div>
      </div>
      <div className="app">
        <svg className="grain-filter-defs" aria-hidden="true" focusable="false">
          <filter id={bgFilterId} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency={riso.bgRoughness} numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={riso.bgDistortion} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id={circleFilterId} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency={riso.circleRoughness} numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={riso.circleDistortion} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
        <TopBar />
        <main id="main" className="app-main" tabIndex={-1}>{page}</main>
        <Footer />
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label={lang === "ja" ? "レイアウト" : "Layout"} />
        <TweakRadio label={lang === "ja" ? "トップ" : "Top page"} value={tw.topLayout}
                    options={[{label: "Hero", value: "hero"}, {label: "Split", value: "split"}, {label: "Index", value: "index"}]}
                    onChange={(v) => setTweak("topLayout", v)} />
        <TweakRadio label="Blog" value={tw.blogLayout}
                    options={[{label: "List", value: "list"}, {label: "Grid", value: "grid"}]}
                    onChange={(v) => setTweak("blogLayout", v)} />
        <TweakRadio label="Works" value={tw.appLayout}
                    options={[{label: "Cards", value: "cards"}, {label: "Rows", value: "rows"}]}
                    onChange={(v) => setTweak("appLayout", v)} />
        <TweakRadio label="About" value={tw.aboutLayout}
                    options={[{label: "2 col", value: "two-col"}, {label: "Stacked", value: "stacked"}]}
                    onChange={(v) => setTweak("aboutLayout", v)} />

        <TweakSection label={lang === "ja" ? "スタイル" : "Style"} />
        <TweakRadio label={lang === "ja" ? "角" : "Corners"} value={tw.cornerStyle}
                    options={[{label: lang === "ja" ? "角丸" : "Rounded", value: "rounded"}, {label: lang === "ja" ? "直角" : "Square", value: "square"}]}
                    onChange={(v) => setTweak("cornerStyle", v)} />
        <TweakColor label={lang === "ja" ? "アクセント（Light）" : "Accent (Light)"} value={tw.lightAccent}
                    options={["#4960ff", "#d4ff0a", "#3c4ed6", "#2435b8"]}
                    onChange={(v) => setTweak("lightAccent", v)} />
        <TweakColor label={lang === "ja" ? "アクセント（Dark）" : "Accent (Dark)"} value={tw.darkAccent}
                    options={["#4960ff", "#d4ff0a", "#3c4ed6", "#2435b8"]}
                    onChange={(v) => setTweak("darkAccent", v)} />
      </TweaksPanel>
    </AppCtx.Provider>
  );
}
