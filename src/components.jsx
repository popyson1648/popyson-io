/* ============================================================
   Shared components, icons, helpers.  Exports to window.
   ============================================================ */
import { useState, useEffect, useRef, useMemo, useContext, createContext, useId } from "react";
import { createSoftmatcha2SearchIndex } from "./softmatcha2Search.js";

export const AppCtx = createContext(null);

/* ---------- helpers ---------- */
export function fmtDate(iso, lang) {
  const d = new Date(iso + "T00:00:00");
  if (lang === "ja") return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
export function L(obj, lang) { // localize {ja,en} or plain string
  if (obj == null) return "";
  if (typeof obj === "string") return obj;
  return obj[lang] ?? obj.ja ?? "";
}

/* searchable body text for "body" search/filter */
export function bodyText(id, lang) {
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
export const Icon = {
  arrow: (p) => <svg {...sIcon} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  chevron: (p) => <svg {...sIcon} {...p}><path d="M9 6l6 6-6 6" /></svg>,
  back: (p) => <svg {...sIcon} {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>,
  sun: (p) => <svg {...sIcon} {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" /></svg>,
  moon: (p) => <svg {...sIcon} {...p}><path d="M21 12.8A8 8 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8z" /></svg>,
  monitor: (p) => <svg {...sIcon} {...p}><rect x="3" y="4" width="18" height="12" rx="1.5" /><path d="M8 20h8M12 16v4" /></svg>,
  settings: (p) => <svg {...sIcon} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.3 7A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1z" /></svg>,
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
export function Ph({ className = "", style, label }) {
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
          fontFamily: "var(--mono)", fontSize: 13, color: "var(--text-faint)",
          background: "transparent", padding: "2px 6px", zIndex: 1, letterSpacing: "0.04em"
        }}>{label}</span>
      )}
    </div>
  );
}

/* ---------- tag / chip ---------- */
export function Chip({ children, on, onClick, isStatic }) {
  if (isStatic) {
    return <span className={"chip static" + (on ? " on" : "")}>{children}</span>;
  }
  return (
    <button className={"chip" + (on ? " on" : "") + (isStatic ? " static" : "")}
            onClick={onClick} type="button" aria-pressed={!!on}>
      {children}
    </button>
  );
}

/* ---------- top bar ---------- */
export function TopBar() {
  const { t, lang, setLang, theme, setTheme, route, nav } = useContext(AppCtx);
  const here = route.name;
  const ThemeIcon = theme === "light" ? Icon.sun : theme === "dark" ? Icon.moon : Icon.monitor;
  const themeOptions = [
    ["light", t.theme_light, Icon.sun],
    ["dark", t.theme_dark, Icon.moon],
    ["system", t.theme_system, Icon.monitor],
  ];
  const link = (to, key) => (
    <a href={"#" + to} className={here === key ? "active" : ""} data-nav-key={key}
       aria-current={here === key ? "page" : undefined}
       onClick={(e) => { e.preventDefault(); nav(to); }}>{t.nav[key]}</a>
  );
  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <nav className="nav">
          {link("/about", "about")}
          {link("/blog", "blog")}
          {link("/app", "app")}
          {link("/reading", "reading")}
        </nav>
        <div className="topbar-tools">
          <div className="tool-group tool-group-actions" aria-label={t.tools}>
            <button className="btn btn-ghost lang-btn" type="button" onClick={() => setLang(lang === "ja" ? "en" : "ja")}
                    aria-label={t.lang_toggle}
                    title={t.language}>
              {t.lang}
            </button>
            <Dropdown width={176} align="right" button={({ open, menuId, toggle }) => (
              <button className={"icon-btn theme-trigger" + (open ? " active" : "")} type="button"
                      onClick={toggle} aria-expanded={open} aria-controls={menuId}
                      title={t.theme} aria-label={t.theme}>
                <ThemeIcon />
              </button>
            )}>
              {({ close }) => (
                <>
                  <div className="menu-head">{t.theme}</div>
                  {themeOptions.map(([key, label, Ic]) => (
                    <button key={key} className="menu-item theme-menu-item" type="button" role="menuitemradio"
                            aria-checked={theme === key}
                            onClick={() => { setTheme(key); close(); }}>
                      <Ic width={15} height={15} />
                      <span className="mi-grow">{label}</span>
                      {theme === key && <Icon.check width={14} height={14} className="mi-check" />}
                    </button>
                  ))}
                </>
              )}
            </Dropdown>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ---------- footer ---------- */
export function Footer() {
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
export function PageHead({ title, sub }) {
  return (
    <div className="page-head">
      <h1>{title}</h1>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

/* ---------- dropdown (Notion-style popover menu) ---------- */
export function Dropdown({ button, width = 240, align = "left", children }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const menuId = useId();
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
      {button({ open, menuId, toggle: () => setOpen((o) => !o), close: () => setOpen(false) })}
      {open && (
        <div id={menuId} className="menu" role="menu" style={{ width, [align === "right" ? "right" : "left"]: 0 }}>
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  );
}

/* ---------- search modal (with live suggest) ---------- */
export function highlight(text, q) {
  const match = findQueryMatch(text, q);
  if (!match) return text;
  return <>{text.slice(0, match.index)}<mark>{text.slice(match.index, match.index + match.length)}</mark>{text.slice(match.index + match.length)}</>;
}

function findQueryMatch(text, q) {
  const source = String(text || "");
  const query = String(q || "").normalize("NFKC").trim();
  if (!source || !query) return null;
  const lower = source.normalize("NFKC").toLowerCase();
  const normalizedQuery = query.toLowerCase();
  const fragments = [normalizedQuery, ...normalizedQuery.split(" ").filter(Boolean)];
  const chars = [...normalizedQuery.replace(/\s/g, "")];
  if (chars.length === 1) fragments.push(chars[0]);
  for (let i = 0; i < chars.length - 1; i += 1) fragments.push(chars[i] + chars[i + 1]);

  for (const fragment of [...new Set(fragments)].filter(Boolean).sort((a, b) => b.length - a.length)) {
    const index = lower.indexOf(fragment);
    if (index >= 0) return { index, length: fragment.length };
  }
  return null;
}

function clipText(text, max) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

function searchSnippet(text, q, max = 112) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return "";
  const match = findQueryMatch(value, q);
  if (!match) return clipText(value, max);
  const center = match.index + Math.floor(match.length / 2);
  const start = Math.max(0, Math.min(center - Math.floor(max / 2), Math.max(0, value.length - max)));
  const end = Math.min(value.length, start + max);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < value.length ? "…" : "";
  return `${prefix}${value.slice(start, end).trim()}${suffix}`;
}

function bestSnippet(fields, where, q) {
  const order = where === "tag"
    ? ["tags", "title", "body"]
    : where === "body"
      ? ["body", "title", "tags"]
      : ["title", "body", "tags"];
  const exactField = order.find((field) => findQueryMatch(fields[field], q));
  return searchSnippet(fields[exactField || order[0]], q);
}

export function SearchModal({ onClose }) {
  const { t, lang, nav } = useContext(AppCtx);
  const { POSTS } = window.BlogData;
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const modalRef = useRef(null);
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const visualViewport = window.visualViewport;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const rootOverflow = root.style.overflow;
    const bodyOverflow = body.style.overflow;
    const bodyPosition = body.style.position;
    const bodyTop = body.style.top;
    const bodyLeft = body.style.left;
    const bodyRight = body.style.right;
    const bodyWidth = body.style.width;

    const setViewportVars = () => {
      root.style.setProperty("--search-viewport-height", `${Math.round(visualViewport?.height ?? window.innerHeight)}px`);
      root.style.setProperty("--search-viewport-top", `${Math.round(visualViewport?.offsetTop ?? 0)}px`);
    };

    setViewportVars();
    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = `-${scrollX}px`;
    body.style.right = "0";
    body.style.width = "100%";
    inputRef.current?.focus({ preventScroll: true });

    visualViewport?.addEventListener("resize", setViewportVars);
    visualViewport?.addEventListener("scroll", setViewportVars);
    window.addEventListener("resize", setViewportVars);

    return () => {
      visualViewport?.removeEventListener("resize", setViewportVars);
      visualViewport?.removeEventListener("scroll", setViewportVars);
      window.removeEventListener("resize", setViewportVars);
      root.style.removeProperty("--search-viewport-height");
      root.style.removeProperty("--search-viewport-top");
      root.style.overflow = rootOverflow;
      body.style.overflow = bodyOverflow;
      body.style.position = bodyPosition;
      body.style.top = bodyTop;
      body.style.left = bodyLeft;
      body.style.right = bodyRight;
      body.style.width = bodyWidth;
      window.scrollTo(scrollX, scrollY);
      opener?.focus({ preventScroll: true });
    };
  }, []);

  const searchDocs = useMemo(() => POSTS.map((p) => ({
    p,
    title: L(p.title, lang),
    tags: p.tags.map((tag) => `#${tag}`).join(" "),
    body: `${L(p.summary, lang)} ${bodyText(p.id, lang)}`,
  })), [POSTS, lang]);
  const searchDocById = useMemo(() => new Map(searchDocs.map((doc) => [doc.p.id, doc])), [searchDocs]);
  const searchIndex = useMemo(() => createSoftmatcha2SearchIndex(searchDocs), [searchDocs]);
  const results = useMemo(() => {
    return searchIndex.search(q.trim(), { limit: q.trim() ? 20 : 5 });
  }, [q, searchIndex]);

  useEffect(() => { setActive(0); }, [q]);
  const go = (p) => { nav("/blog/" + p.id); onClose(); };
  const onKey = (e) => {
    if (e.key === "Tab") {
      const nodes = modalRef.current?.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])");
      const focusable = Array.from(nodes || []).filter((node) => node instanceof HTMLElement && node.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && results[active]) { go(results[active].p); }
    else if (e.key === "Escape") { onClose(); }
  };

  return (
    <div className="modal-overlay" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={t.search} ref={modalRef} onKeyDown={onKey}>
        <button className="esc" type="button" onClick={onClose} aria-label={t.close_search} title={t.close_search}>
          <Icon.x width={16} height={16} />
        </button>
        <div className="modal-search">
          <Icon.search width={20} height={20} style={{ color: "var(--text-muted)" }} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
                 placeholder={t.search_ph} aria-label={t.search}
                 aria-controls="search-results" aria-activedescendant={results[active] ? `search-result-${results[active].p.id}` : undefined} />
          {q && (
            <button className="search-clear" type="button" onClick={() => setQ("")} aria-label={t.clear_search} title={t.clear_search}>
              <Icon.x width={14} height={14} />
            </button>
          )}
        </div>
        <div className="modal-list" id="search-results" role="listbox" aria-label={q.trim() ? t.results(results.length) : t.search_recent}>
          {results.length === 0 ? (
            <div className="modal-empty">{t.search_no}</div>
          ) : (
            <>
              <div className="modal-section">{q.trim() ? t.results(results.length) : t.search_recent}</div>
              {results.map(({ p, where }, i) => {
                const query = q.trim();
                const doc = searchDocById.get(p.id);
                const snippet = query && doc ? bestSnippet(doc, where, query) : "";
                return (
                  <button key={p.id} id={`search-result-${p.id}`} className={"sug" + (i === active ? " active" : "")}
                          type="button" role="option" aria-selected={i === active}
                          onMouseEnter={() => setActive(i)} onClick={() => go(p)}>
                    <Ph className="sug-thumb" />
                    <div className="sug-main">
                      <div className="sug-title">{highlight(L(p.title, lang), query)}</div>
                      {snippet && <div className="sug-snippet">{highlight(snippet, query)}</div>}
                      <div className="sug-meta">
                        <span className="sug-date">{fmtDate(p.date, lang)}</span>
                        <span className="sug-tags" title={p.tags.map((tg) => `#${tg}`).join(" ")}>{p.tags.map((tg) => `#${tg}`).join(" ")}</span>
                        {where && where !== "title" && <span className="sug-match">{where === "tag" ? t.in_tag : t.in_title}{lang === "ja" ? "に一致" : " match"}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
