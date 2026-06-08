/* ============================================================
   Pages: Top, About, Application(+detail), Reading List, RSS
   ============================================================ */
import { useContext, useEffect, useState } from "react";
import { AppCtx, Chip, Icon, L, PageHead, Ph, fmtDate } from "./components.jsx";

/* ===================== TOP ===================== */
export function TopPage() {
  const { t, nav } = useContext(AppCtx);
  const pages = [
    { to: "/about",   key: "about",   no: "01" },
    { to: "/blog",    key: "blog",    no: "02" },
    { to: "/app",     key: "app",     no: "03" },
    { to: "/reading", key: "reading", no: "04" },
  ];
  return (
    <div className="container route-fade top-simple">
      <h1>{t.brand}</h1>
      <nav className="top-link-cloud" aria-label={t.top_pages}>
        {pages.map((p) => (
          <a key={p.key} href={"#" + p.to} aria-label={t.nav[p.key]} onClick={(e) => { e.preventDefault(); nav(p.to); }}>
            <span>{p.no}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}

export function RecentList({ posts }) {
  const { lang, nav } = useContext(AppCtx);
  return (
    <div className="reading-list">
      {posts.map((p) => (
        <a key={p.id} className="ritem" href={"#/blog/" + p.id} style={{ cursor: "pointer", color: "inherit" }}
           onClick={(e) => { e.preventDefault(); nav("/blog/" + p.id); }}>
          <div className="ritem-main">
            <div className="ritem-title" style={{ fontWeight: 700 }}>{L(p.title, lang)}</div>
            <div className="ritem-sub"><span>{fmtDate(p.date, lang)}</span>{p.tags.map((tg) => <span key={tg}>#{tg}</span>)}</div>
          </div>
          <Icon.arrow />
        </a>
      ))}
    </div>
  );
}

/* ===================== ABOUT ===================== */
export function AboutPage() {
  const { t, lang, nav, tw } = useContext(AppCtx);
  const { PERSON, APPS } = window.BlogData;
  const linkIcon = (label) => {
    if (label === "GitHub") return <Icon.github width={15} height={15} />;
    if (label === "RSS") return <Icon.rss width={15} height={15} />;
    return <Icon.ext width={14} height={14} />;
  };

  const Career = () => (
    <div className="about-block">
      <h2>{t.about_career}</h2>
      <div className="timeline">
        {PERSON.career.map((c, i) => (
          <div className="tl-item" key={i}>
            <div className="tl-period">{c.period}</div>
            <div>
              <div className="tl-role">{L(c.role, lang)}</div>
              <div className="tl-org">{L(c.org, lang)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  const Activity = () => {
    const [open, setOpen] = useState(null);
    return (
      <div className="about-block">
        <h2>{t.about_activity}</h2>
        <div className="act-list">
          {PERSON.activities.map((a, i) => {
            const title = L(a, lang);
            const expanded = open === i;
            return (
              <div className="act-item" key={i}>
                <button className="act-toggle" type="button" aria-expanded={expanded}
                        aria-controls={`activity-detail-${i}`}
                        onClick={() => setOpen((current) => current === i ? null : i)}>
                  <span>{title}</span>
                  <Icon.chevron className={expanded ? "open" : ""} width={14} height={14} />
                </button>
                {expanded && (
                  <div className="act-detail" id={`activity-detail-${i}`}>
                    {t.activity_detail(title)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  const Made = () => (
    <div className="about-block">
      <h2>{t.about_made}</h2>
      <div className="made-grid">
        {APPS.slice(0, 4).map((a) => (
          <button className="made-card" type="button" key={a.id} onClick={() => nav("/app/" + a.id)}>
            <div className="made-title">{a.title}</div>
            <div className="made-sub">{L(a.tagline, lang)}</div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="container route-fade">
      <PageHead title={t.page_about.title} />
      <div className="about-top">
        <div className="avatar">{PERSON.initials}</div>
        <div>
          <h2 className="about-name">{L(PERSON.name, lang)}</h2>
          <div className="about-role">{L(PERSON.role, lang)} · {L(PERSON.location, lang)}</div>
          <p className="about-tag">{L(PERSON.tagline, lang)}</p>
          <div className="links-row" data-cf-change="ch-profile-links">
            {PERSON.links.map((lk) => lk.href.startsWith("mailto:") ? (
              <span key={lk.label} className="profile-link profile-link-text">
                {linkIcon(lk.label)}
                {lk.label}
              </span>
            ) : (
              <a key={lk.label} className="profile-link" href={lk.href}
                 onClick={lk.href.startsWith("#") ? (e) => { e.preventDefault(); nav(lk.href.slice(1)); } : undefined}>
                {linkIcon(lk.label)}
                {lk.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        {PERSON.bio[lang].map((para, i) => <p key={i} style={{ maxWidth: "62ch", color: "var(--text-muted)", lineHeight: 1.8 }}>{para}</p>)}
      </div>

      {tw.aboutLayout === "stacked" ? (
        <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 40 }}>
          <Career /><Activity /><Made />
        </div>
      ) : (
        <>
          <div className="about-grid">
            <Career />
            <Activity />
          </div>
          <div style={{ marginTop: 40 }}><Made /></div>
        </>
      )}
    </div>
  );
}

/* ===================== APPLICATION ===================== */
export function ApplicationPage() {
  const { t, lang, nav, tw } = useContext(AppCtx);
  const { APPS } = window.BlogData;
  const rows = tw.appLayout === "rows";
  return (
    <div className="container route-fade">
      <PageHead title={t.page_app.title} />
      <div className={rows ? "post-list" : "app-grid"}>
        {APPS.map((a) => rows ? (
          <button className="pcard" type="button" key={a.id} onClick={() => nav("/app/" + a.id)} aria-label={`${t.detail}: ${a.title}`}>
            <Ph className="pcard-thumb" />
            <div className="pcard-body">
              <h3 className="pcard-title">{a.title}</h3>
              <div className="pcard-meta"><span>{L(a.tagline, lang)}</span><span>· {a.year}</span></div>
              <p className="pcard-summary">{L(a.desc, lang)}</p>
              <div className="tag-row" style={{ marginTop: 4 }}>{a.stack.map((s) => <Chip key={s} isStatic>{s}</Chip>)}</div>
            </div>
          </button>
        ) : (
          <div className="acard" key={a.id}>
            <Ph className="acard-img" />
            <div className="acard-body">
              <h3 className="acard-title">{a.title}</h3>
              <div className="acard-tagline">{L(a.tagline, lang)}</div>
              <p className="acard-desc">{L(a.desc, lang)}</p>
              <div className="tag-row">{a.stack.map((s) => <Chip key={s} isStatic>{s}</Chip>)}</div>
              <div className="acard-foot">
                <span className="acard-year">{a.year}</span>
                <button className="btn btn-accent" type="button" onClick={() => nav("/app/" + a.id)} aria-label={`${t.detail}: ${a.title}`}>
                  {t.detail} <Icon.arrow width={14} height={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ApplicationDetail({ id }) {
  const { t, lang, nav } = useContext(AppCtx);
  const { APPS } = window.BlogData;
  const a = APPS.find((x) => x.id === id);
  useEffect(() => { window.scrollTo(0, 0); }, [id]);
  if (!a) return <div className="container route-fade"><p>Not found.</p></div>;
  return (
    <div className="container route-fade">
      <div className="adetail">
        <button className="btn btn-ghost" type="button" onClick={() => nav("/app")}><Icon.back /> {t.back_app}</button>
        <h1>{a.title}</h1>
        <div className="adetail-tagline">{L(a.tagline, lang)}</div>
        <Ph className="adetail-hero" />
        <div className="prose">
          {a.detail[lang].map((para, i) => <p key={i}>{para}</p>)}
        </div>
        <div className="adetail-side">
          <div className="kv"><span className="k">{t.stack}</span><span>{a.stack.join(" · ")}</span></div>
          <div className="kv"><span className="k">{t.year}</span><span>{a.year}</span></div>
        </div>
      </div>
    </div>
  );
}

/* ===================== READING LIST ===================== */
export function ReadingPage() {
  const { t, lang } = useContext(AppCtx);
  const { READING } = window.BlogData;
  const [items, setItems] = useState(() => READING.map((r) => ({ ...r })));
  const [filter, setFilter] = useState("all");
  const shown = items.filter((r) => filter === "all" ? true : filter === "done" ? r.done : !r.done);
  const toggle = (i) => setItems((prev) => prev.map((r, idx) => idx === i ? { ...r, done: !r.done } : r));
  const idxOf = (r) => items.indexOf(r);

  return (
    <div className="container route-fade">
      <PageHead title={t.page_reading.title} />
      <div className="seg-filter" role="group" aria-label={t.filter}>
        {["all", "todo", "done"].map((f) => (
          <button key={f} className={filter === (f === "todo" ? "todo" : f) ? "on" : ""}
                  type="button" aria-pressed={filter === (f === "todo" ? "todo" : f)}
                  onClick={() => setFilter(f === "todo" ? "todo" : f)}>
            {f === "all" ? t.reading_all : f === "todo" ? t.reading_todo : t.reading_done}
          </button>
        ))}
      </div>
      <div className="reading-list">
        {shown.map((r) => (
          <div className="ritem" key={r.title.ja + r.date}>
            <button className={"rcheck" + (r.done ? " done" : "")} type="button"
                    aria-pressed={r.done} aria-label={`${L(r.title, lang)}: ${r.done ? t.reading_done : t.reading_todo}`}
                    onClick={() => toggle(idxOf(r))}>
              {r.done && <Icon.check width={14} height={14} />}
            </button>
            <div className="ritem-main">
              <div className={"ritem-title" + (r.done ? " done" : "")}>{L(r.title, lang)}</div>
              <div className="ritem-sub">
                <span>{fmtDate(r.date, lang)}</span>
                <span>{r.source}</span>
              </div>
            </div>
            <div className="ritem-side">
              <span className="btn btn-ghost btn-disabled" aria-disabled="true" title={t.no_link}><Icon.ext /></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===================== RSS ===================== */
export function RssPage() {
  const { t, nav } = useContext(AppCtx);
  const [copied, setCopied] = useState(false);
  const url = "https://sen-no-note.example/feed.xml";
  const copy = () => { navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); };
  return (
    <div className="container route-fade">
      <div className="rss-wrap">
        <div className="rss-mark"><Icon.rss width={28} height={28} /></div>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{t.rss_title}</h1>
        <p className="muted" style={{ marginTop: 10 }}>{t.rss_desc}</p>
        <div className="rss-url">
          <span>{url}</span>
          <button className="btn btn-ghost" type="button" onClick={copy} aria-label={t.copy_rss_url}>{copied ? <Icon.check /> : <Icon.copy />}</button>
        </div>
        <div className="sr-only" role="status" aria-live="polite">{copied ? t.copied : ""}</div>
        <div style={{ marginTop: 26 }}>
          <button className="btn" type="button" onClick={() => nav("/blog")}><Icon.back /> {t.back_blog}</button>
        </div>
      </div>
    </div>
  );
}
