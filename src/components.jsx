/* ============================================================
   Shared components, icons, helpers.  Exports to window.
   ============================================================ */
import { useState, useEffect, useRef, useMemo, useContext, createContext, useId } from "react";
import { localized, routeToPath } from "./meta.js";

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
  github: (p) => <svg {...sIcon} fill="currentColor" stroke="none" {...p}><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>,
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
  mail: (p) => <svg {...sIcon} fill="currentColor" stroke="none" {...p}><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5z" /></svg>,
  xcom: (p) => <svg {...sIcon} width={15} height={15} fill="currentColor" stroke="none" {...p}><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" /></svg>,
  linkedin: (p) => <svg {...sIcon} fill="currentColor" stroke="none" {...p}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>,
  wantedly: (p) => <svg {...sIcon} fill="currentColor" stroke="none" {...p}><path d="M18.453 14.555c-.171-.111-.658-.764-2.006-3.982a9.192 9.192 0 0 0-.237-.526l-.274-.664-2.362-5.702H8.85l2.362 5.702 2.362 5.706 2.181 5.267a.196.196 0 0 0 .362 0l2.373-5.682a.1.1 0 0 0-.037-.119zm-8.85 0c-.171-.111-.658-.764-2.006-3.982a8.971 8.971 0 0 0-.236-.525l-.276-.665-2.36-5.702H0l2.362 5.702 2.362 5.706 2.181 5.267a.196.196 0 0 0 .362 0l2.374-5.682a.098.098 0 0 0-.038-.119ZM24 6.375a2.851 2.851 0 0 1-2.851 2.852 2.851 2.851 0 0 1-2.852-2.852 2.851 2.851 0 0 1 2.852-2.851A2.851 2.851 0 0 1 24 6.375Z" /></svg>,
  caretUp: (p) => <svg {...sIcon} {...p}><path d="M12 19V5M6 11l6-6 6 6" /></svg>,
  caretDown: (p) => <svg {...sIcon} {...p}><path d="M12 5v14M6 13l6 6 6-6" /></svg>,
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
  const { t, lang, theme, setTheme, route, nav } = useContext(AppCtx);
  const here = route.name;
  const ThemeIcon = theme === "light" ? Icon.sun : theme === "dark" ? Icon.moon : Icon.monitor;
  const themeOptions = [
    ["light", t.theme_light, Icon.sun],
    ["dark", t.theme_dark, Icon.moon],
    ["system", t.theme_system, Icon.monitor],
  ];
  const link = (to, key) => (
    <a href={localized(to, lang)} className={here === key ? "active" : ""} data-nav-key={key}
       aria-current={here === key ? "page" : undefined}
       onClick={(e) => { e.preventDefault(); nav(to); }}>{t.nav[key]}</a>
  );
  // Toggle language by re-navigating to the same route under the other locale,
  // preserving an active tag filter. URL is the source of truth for language.
  const toggleLang = () => {
    const other = lang === "ja" ? "en" : "ja";
    const path = routeToPath(route) + (route.tag ? `?tag=${encodeURIComponent(route.tag)}` : "");
    nav(path, other);
  };
  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <nav className="nav">
          {link("/", "about")}
          {link("/blog", "blog")}
          {link("/app", "app")}
          {link("/reading", "reading")}
        </nav>
        <div className="topbar-tools">
          <div className="tool-group tool-group-actions" aria-label={t.tools}>
            <button className="btn btn-ghost lang-btn" type="button" onClick={toggleLang}
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
  const { t, lang, nav } = useContext(AppCtx);
  return (
    <footer className="foot">
      <div className="container foot-inner">
        <span>© 2026 {t.brand}</span>
        <a href={localized("/rss", lang)} onClick={(e) => { e.preventDefault(); nav("/rss"); }}>
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

export function bestSnippet(fields, where, q) {
  const order = where === "tag"
    ? ["tags", "title", "body"]
    : where === "body"
      ? ["body", "title", "tags"]
      : ["title", "body", "tags"];
  const exactField = order.find((field) => findQueryMatch(fields[field], q));
  return searchSnippet(fields[exactField || order[0]], q);
}

