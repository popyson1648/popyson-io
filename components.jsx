/* ============================================================
   Shared components, icons, helpers.  Exports to window.
   ============================================================ */
const { useState, useEffect, useRef, useMemo, useContext, createContext } = React;

const AppCtx = createContext(null);

/* ---------- helpers ---------- */
function fmtDate(iso, lang) {
  const d = new Date(iso + "T00:00:00");
  if (lang === "ja") return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
function L(obj, lang) { // localize {ja,en} or plain string
  if (obj == null) return "";
  if (typeof obj === "string") return obj;
  return obj[lang] ?? obj.ja ?? "";
}

/* searchable body text for "body" search/filter */
function bodyText(id, lang) {
  const blocks = window.ArticleBody.get(id);
  const parts = [];
  for (const b of blocks) {
    if (b.kind === "p" || b.kind === "h2" || b.kind === "msg") parts.push(L({ ja: b.ja, en: b.en }, lang));
    else if (b.kind === "ul" || b.kind === "ol") parts.push((b[lang] || []).join(" "));
    else if (b.kind === "code") parts.push(b.code);
  }
  return parts.join(" ").toLowerCase();
}

/* ---------- line icons (stroke, currentColor) ---------- */
const sIcon = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" };
const Icon = {
  arrow: (p) => <svg {...sIcon} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  chevron: (p) => <svg {...sIcon} {...p}><path d="M9 6l6 6-6 6" /></svg>,
  back: (p) => <svg {...sIcon} {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>,
  sun: (p) => <svg {...sIcon} {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" /></svg>,
  moon: (p) => <svg {...sIcon} {...p}><path d="M21 12.8A8 8 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8z" /></svg>,
  monitor: (p) => <svg {...sIcon} {...p}><rect x="3" y="4" width="18" height="12" rx="1.5" /><path d="M8 20h8M12 16v4" /></svg>,
  github: (p) => <svg {...sIcon} {...p}><path d="M9 19c-4 1.2-4-2-5.5-2.5M15 22v-3.5c0-1 .1-1.4-.5-2 2-.2 4.1-1 4.1-4.5 0-1-.4-1.9-1-2.6.1-.3.4-1.3-.1-2.6 0 0-.8-.3-2.7 1a9.2 9.2 0 0 0-4.9 0c-1.9-1.3-2.7-1-2.7-1-.5 1.3-.2 2.3-.1 2.6-.6.7-1 1.6-1 2.6 0 3.5 2.1 4.3 4.1 4.5-.3.3-.5.8-.5 1.5V22" /></svg>,
  rss: (p) => <svg {...sIcon} {...p}><path d="M5 19a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM5 12a7 7 0 0 1 7 7M5 5a14 14 0 0 1 14 14" /></svg>,
  check: (p) => <svg {...sIcon} {...p}><path d="M5 12l5 5 9-10" /></svg>,
  search: (p) => <svg {...sIcon} {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>,
  ext: (p) => <svg {...sIcon} {...p}><path d="M7 17L17 7M9 7h8v8" /></svg>,
  copy: (p) => <svg {...sIcon} {...p}><rect x="9" y="9" width="11" height="11" rx="1.5" /><path d="M5 15V5a1 1 0 0 1 1-1h10" /></svg>,
  x: (p) => <svg {...sIcon} {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>,
  plus: (p) => <svg {...sIcon} {...p}><path d="M12 5v14M5 12h14" /></svg>,
  sort: (p) => <svg {...sIcon} {...p}><path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" /></svg>,
  filter: (p) => <svg {...sIcon} {...p}><path d="M3 5h18M6 12h12M10 19h4" /></svg>,
  tagi: (p) => <svg {...sIcon} {...p}><path d="M4 4h7l9 9-7 7-9-9V4z" /><circle cx="8.5" cy="8.5" r="1.3" /></svg>,
};

/* ---------- placeholder thumbnail (× box) ---------- */
function Ph({ className = "", style, label }) {
  return (
    <div className={"ph " + className} style={style} aria-hidden="true">
      <svg className="ph-x" viewBox="0 0 100 100" preserveAspectRatio="none"
           width="100%" height="100%" style={{ position: "absolute", inset: 0, display: "block" }}>
        <line x1="0" y1="0" x2="100" y2="100" stroke="var(--line-strong)" strokeWidth="0.8" vectorEffect="non-scaling-stroke" opacity="0.7" />
        <line x1="100" y1="0" x2="0" y2="100" stroke="var(--line-strong)" strokeWidth="0.8" vectorEffect="non-scaling-stroke" opacity="0.7" />
      </svg>
      {label && (
        <span style={{
          position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
          fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-faint)",
          background: "var(--bg-subtle)", padding: "2px 6px", zIndex: 1, letterSpacing: "0.04em"
        }}>{label}</span>
      )}
    </div>
  );
}

/* ---------- tag / chip ---------- */
function Chip({ children, on, onClick, isStatic }) {
  return (
    <button className={"chip" + (on ? " on" : "") + (isStatic ? " static" : "")}
            onClick={onClick} type="button" tabIndex={isStatic ? -1 : 0}>
      {children}
    </button>
  );
}

/* ---------- top bar ---------- */
function TopBar() {
  const { t, lang, setLang, theme, setTheme, route, nav, openSearch } = useContext(AppCtx);
  const here = route.name;
  const inBlog = here === "blog" || here === "article";
  const link = (to, key) => (
    <a href={"#" + to} className={here === key ? "active" : ""}
       onClick={(e) => { e.preventDefault(); nav(to); }}>{t.nav[key]}</a>
  );
  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <a className="brand" href="#/" onClick={(e) => { e.preventDefault(); nav("/"); }}>
          <span className="brand-mark">線</span>
          <span>{t.brand}</span>
        </a>
        <nav className="nav">
          {link("/about", "about")}
          {link("/blog", "blog")}
          {link("/app", "app")}
          {link("/reading", "reading")}
        </nav>
        <div className="topbar-spacer" />
        <div className="topbar-tools">
          {inBlog && (
            <button className="icon-btn" onClick={openSearch} title={t.search} aria-label={t.search}>
              <Icon.search />
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => setLang(lang === "ja" ? "en" : "ja")}
                  title="Language" style={{ fontWeight: 700, fontSize: 13 }}>
            {t.lang}
          </button>
          <div className="seg" role="group" aria-label={t.theme}>
            <button className={theme === "light" ? "on" : ""} onClick={() => setTheme("light")} title={t.theme_light}><Icon.sun /></button>
            <button className={theme === "system" ? "on" : ""} onClick={() => setTheme("system")} title={t.theme_system}><Icon.monitor /></button>
            <button className={theme === "dark" ? "on" : ""} onClick={() => setTheme("dark")} title={t.theme_dark}><Icon.moon /></button>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ---------- footer ---------- */
function Footer() {
  const { t, nav } = useContext(AppCtx);
  return (
    <footer className="foot">
      <div className="container foot-inner">
        <span>© 2026 {t.brand}</span>
        <a href="#/rss" onClick={(e) => { e.preventDefault(); nav("/rss"); }}>
          <Icon.rss width={14} height={14} /> RSS
        </a>
      </div>
    </footer>
  );
}

/* ---------- page header ---------- */
function PageHead({ title, sub }) {
  return (
    <div className="page-head">
      <h1>{title}</h1>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

/* ---------- dropdown (Notion-style popover menu) ---------- */
function Dropdown({ button, width = 240, align = "left", children }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div className="pop-wrap" ref={wrap}>
      {button({ open, toggle: () => setOpen((o) => !o), close: () => setOpen(false) })}
      {open && (
        <div className="menu" style={{ width, [align === "right" ? "right" : "left"]: 0 }}>
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  );
}

/* ---------- search modal (with live suggest) ---------- */
function highlight(text, q) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

function SearchModal({ onClose }) {
  const { t, lang, nav } = useContext(AppCtx);
  const { POSTS } = window.BlogData;
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [...POSTS].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((p) => ({ p, where: null }));
    return POSTS.map((p) => {
      const title = L(p.title, lang).toLowerCase();
      const tags = p.tags.join(" ").toLowerCase();
      const body = (L(p.summary, lang) + " " + bodyText(p.id, lang)).toLowerCase();
      let where = null;
      if (title.includes(query)) where = "title";
      else if (tags.includes(query)) where = "tag";
      else if (body.includes(query)) where = "body";
      return where ? { p, where } : null;
    }).filter(Boolean);
  }, [q, lang]);

  useEffect(() => { setActive(0); }, [q]);
  const go = (p) => { nav("/blog/" + p.id); onClose(); };
  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && results[active]) { go(results[active].p); }
    else if (e.key === "Escape") { onClose(); }
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-search">
          <Icon.search width={20} height={20} style={{ color: "var(--text-muted)" }} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
                 placeholder={t.search_ph} aria-label={t.search} />
          <span className="esc" onClick={onClose} style={{ cursor: "pointer" }}>ESC</span>
        </div>
        <div className="modal-list">
          {results.length === 0 ? (
            <div className="modal-empty">{t.search_no}</div>
          ) : (
            <>
              <div className="modal-section">{q.trim() ? t.results(results.length) : t.search_recent}</div>
              {results.map(({ p, where }, i) => (
                <button key={p.id} className={"sug" + (i === active ? " active" : "")}
                        onMouseEnter={() => setActive(i)} onClick={() => go(p)}>
                  <Ph className="sug-thumb" />
                  <div className="sug-main">
                    <div className="sug-title">{highlight(L(p.title, lang), q.trim())}</div>
                    <div className="sug-meta">
                      <span>{fmtDate(p.date, lang)}</span>
                      {p.tags.map((tg) => <span key={tg}>#{tg}</span>)}
                      {where && where !== "title" && <span style={{ color: "var(--accent)" }}>{where === "tag" ? t.in_tag : t.in_title}{lang === "ja" ? "に一致" : " match"}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AppCtx, fmtDate, L, bodyText, Icon, Ph, Chip, TopBar, Footer, PageHead, Dropdown, SearchModal, highlight,
  useState, useEffect, useRef, useMemo, useContext });
