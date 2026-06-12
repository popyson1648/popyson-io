/* ============================================================
   App shell: routing, theme, language, tweaks
   ============================================================ */
import { useEffect, useMemo, useState } from "react";
import { AppCtx, Footer, TopBar } from "./components.jsx";
import { AboutPage, ApplicationDetail, ApplicationPage, ReadingPage, RssPage, TopPage } from "./pages.jsx";
import { Article, BlogList } from "./blog.jsx";
import { TweakColor, TweakRadio, TweakSection, TweaksPanel, useTweaks } from "./tweaks-panel.jsx";

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

function parseRoute(hash) {
  const raw = (hash || "").replace(/^#/, "");
  const qIdx = raw.indexOf("?");
  const path = qIdx >= 0 ? raw.slice(0, qIdx) : raw;
  const query = new URLSearchParams(qIdx >= 0 ? raw.slice(qIdx + 1) : "");
  const parts = path.split("/").filter(Boolean); // ["blog","id"]
  const seg = parts[0] || "";
  if (seg === "" )       return { name: "top" };
  if (seg === "about")   return { name: "about" };
  if (seg === "blog")    return parts[1] ? { name: "article", id: parts[1] } : { name: "blog", tag: query.get("tag") || null };
  if (seg === "app")     return parts[1] ? { name: "appDetail", id: parts[1] } : { name: "app" };
  if (seg === "reading") return { name: "reading" };
  if (seg === "rss")     return { name: "rss" };
  return { name: "top" };
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
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  const [lang, setLang] = useState(() => localStorage.getItem("blog.lang") || "ja");
  const [theme, setTheme] = useState(() => localStorage.getItem("blog.theme") || "system");
  const riso = RISOGRAPH_DEFAULTS;
  const sysDark = useSystemDark();
  const bgNoiseUrl = useMemo(() => createNoiseUrl(riso.bgNoiseFrequency), [riso.bgNoiseFrequency]);
  const circleNoiseUrl = useMemo(() => createNoiseUrl(riso.circleNoiseFrequency), [riso.circleNoiseFrequency]);
  const bgFilterId = useMemo(() => createFilterId("bg-rough", riso.bgDistortion, riso.bgRoughness), [riso.bgDistortion, riso.bgRoughness]);
  const circleFilterId = useMemo(() => createFilterId("circle-rough", riso.circleDistortion, riso.circleRoughness), [riso.circleDistortion, riso.circleRoughness]);

  // routing
  useEffect(() => {
    const fn = () => { setRoute(parseRoute(window.location.hash)); };
    window.addEventListener("hashchange", fn);
    if (!window.location.hash) window.location.hash = "/";
    return () => window.removeEventListener("hashchange", fn);
  }, []);
  const nav = (to) => { window.location.hash = to; };

  // resolve + apply theme
  const resolved = theme === "system" ? (sysDark ? "dark" : "light") : theme;
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolved);
    localStorage.setItem("blog.theme", theme);
  }, [theme, resolved]);

  // lang
  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem("blog.lang", lang);
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
  const ctx = { t, lang, setLang, theme, setTheme, route, nav, tw };

  let page;
  switch (route.name) {
    case "about":     page = <AboutPage />; break;
    case "blog":      page = <BlogList />; break;
    case "article":   page = <Article id={route.id} />; break;
    case "app":       page = <ApplicationPage />; break;
    case "appDetail": page = <ApplicationDetail id={route.id} />; break;
    case "reading":   page = <ReadingPage />; break;
    case "rss":       page = <RssPage />; break;
    default:          page = <TopPage />;
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
