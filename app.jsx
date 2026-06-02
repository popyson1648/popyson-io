/* ============================================================
   App shell: routing, theme, language, tweaks
   ============================================================ */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "topLayout": "hero",
  "blogLayout": "list",
  "appLayout": "cards",
  "aboutLayout": "two-col",
  "cornerStyle": "rounded",
  "lightAccent": "#4d6182",
  "darkAccent": "#cdab74"
}/*EDITMODE-END*/;

function parseRoute(hash) {
  const h = (hash || "").replace(/^#/, "");
  const parts = h.split("/").filter(Boolean); // ["blog","id"]
  const seg = parts[0] || "";
  if (seg === "" )       return { name: "top" };
  if (seg === "about")   return { name: "about" };
  if (seg === "blog")    return parts[1] ? { name: "article", id: parts[1] } : { name: "blog" };
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

function App() {
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  const [lang, setLang] = useState(() => localStorage.getItem("blog.lang") || "ja");
  const [theme, setTheme] = useState(() => localStorage.getItem("blog.theme") || "system");
  const [searchOpen, setSearchOpen] = useState(false);
  const sysDark = useSystemDark();

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

  const t = window.I18N[lang];
  const ctx = { t, lang, setLang, theme, setTheme, route, nav, tw, openSearch: () => setSearchOpen(true) };

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
      <div className="app">
        <TopBar />
        <main className="app-main">{page}</main>
        <Footer />
      </div>

      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}

      <TweaksPanel title="Tweaks">
        <TweakSection label={lang === "ja" ? "レイアウト" : "Layout"} />
        <TweakRadio label={lang === "ja" ? "トップ" : "Top page"} value={tw.topLayout}
                    options={[{label: "Hero", value: "hero"}, {label: "Split", value: "split"}, {label: "Index", value: "index"}]}
                    onChange={(v) => setTweak("topLayout", v)} />
        <TweakRadio label="Blog" value={tw.blogLayout}
                    options={[{label: "List", value: "list"}, {label: "Grid", value: "grid"}]}
                    onChange={(v) => setTweak("blogLayout", v)} />
        <TweakRadio label="Application" value={tw.appLayout}
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
                    options={["#4d6182", "#5a7363", "#8a6a52", "#6a5e7e"]}
                    onChange={(v) => setTweak("lightAccent", v)} />
        <TweakColor label={lang === "ja" ? "アクセント（Dark）" : "Accent (Dark)"} value={tw.darkAccent}
                    options={["#cdab74", "#9bb9c4", "#b79bc4", "#9cc4a4"]}
                    onChange={(v) => setTweak("darkAccent", v)} />
      </TweaksPanel>
    </AppCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
