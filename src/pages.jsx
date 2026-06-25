/* ============================================================
   Pages: About (default landing), Application(+detail), Reading List, RSS
   ============================================================ */
import { useContext, useEffect, useState } from "react";
import { AppCtx, Chip, Icon, L, PageHead, Ph } from "./components.jsx";
import { localizedDateLabel } from "./dateLabel.js";
import { localized } from "./meta.js";

/* ===================== ABOUT ===================== */
export function AboutPage() {
  const { t, lang, nav } = useContext(AppCtx);
  const { PERSON, APPS } = window.BlogData;
  const linkIcon = (label) => {
    if (label === "GitHub") return <Icon.github width={15} height={15} />;
    if (label === "X") return <Icon.xcom width={14} height={14} />;
    if (label === "LinkedIn") return <Icon.linkedin width={15} height={15} />;
    if (label === "Wantedly") return <Icon.wantedly width={15} height={15} />;
    if (label === "RSS") return <Icon.rss width={15} height={15} />;
    if (label.includes("@") || label.includes(" at ")) return <Icon.mail width={15} height={15} />;
    return <Icon.ext width={14} height={14} />;
  };

  // Tracks which activity row is expanded (null = none). Hoisted to the page
  // body so the Activity markup can stay inline in the render output.
  const [openActivity, setOpenActivity] = useState(null);

  return (
    <div className="container route-fade">
      <PageHead title={t.page_about.title} />
      <div className="about-top">
        <div className="avatar">{PERSON.initials}</div>
        <div>
          <h2 className="about-name">{L(PERSON.name, lang)}</h2>
          <div className="about-role">
            {L(PERSON.role, lang)} · {L(PERSON.location, lang)}
          </div>
          <p className="about-tag">{L(PERSON.tagline, lang)}</p>
          <div className="links-row" data-cf-change="ch-profile-links">
            {PERSON.links.map((lk) => {
              const internal = lk.href.startsWith("/"); // in-app route (locale applied via nav)
              if (lk.href.startsWith("mailto:"))
                return (
                  <span key={lk.label} className="profile-link profile-link-text">
                    {linkIcon(lk.label)}
                    {lk.label}
                  </span>
                );
              return (
                <a
                  key={lk.label}
                  className="profile-link"
                  href={internal ? localized(lk.href, lang) : lk.href}
                  target={internal ? undefined : "_blank"}
                  rel={internal ? undefined : "noopener noreferrer"}
                  onClick={
                    internal
                      ? (e) => {
                          e.preventDefault();
                          nav(lk.href);
                        }
                      : undefined
                  }
                >
                  {linkIcon(lk.label)}
                  {lk.label}
                </a>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        {PERSON.bio[lang].map((para) => (
          <p key={para} style={{ maxWidth: "62ch", color: "var(--text-muted)", lineHeight: 1.8 }}>
            {para}
          </p>
        ))}
      </div>

      <div className="about-grid">
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
        <div className="about-block">
          <h2>{t.about_activity}</h2>
          <div className="act-list">
            {PERSON.activities.map((a, i) => {
              const title = L(a, lang);
              const expanded = openActivity === i;
              return (
                <div className="act-item" key={i}>
                  <button
                    className="act-toggle"
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`activity-detail-${i}`}
                    onClick={() => setOpenActivity((current) => (current === i ? null : i))}
                  >
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
      </div>
      <div style={{ marginTop: 40 }}>
        <div className="about-block">
          <h2>{t.about_made}</h2>
          <div className="made-grid">
            {APPS.slice(0, 4).map((a) => (
              <button
                className="made-card"
                type="button"
                key={a.id}
                onClick={() => nav("/app/" + a.id)}
              >
                <div className="made-title">{a.title}</div>
                <div className="made-sub">{L(a.tagline, lang)}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== APPLICATION ===================== */
export function ApplicationPage() {
  const { t, lang, nav } = useContext(AppCtx);
  const { APPS } = window.BlogData;
  return (
    <div className="container route-fade">
      <PageHead title={t.page_app.title} />
      <div className="app-grid">
        {APPS.map((a) => (
          <div className="acard" key={a.id}>
            <Ph className="acard-img" />
            <div className="acard-body">
              <h3 className="acard-title">{a.title}</h3>
              <div className="acard-tagline">{L(a.tagline, lang)}</div>
              <p className="acard-desc">{L(a.desc, lang)}</p>
              <div className="tag-row">
                {a.stack.map((s) => (
                  <Chip key={s} isStatic>
                    {s}
                  </Chip>
                ))}
              </div>
              <div className="acard-foot">
                <span className="acard-year">{a.year}</span>
                <button
                  className="btn btn-accent"
                  type="button"
                  onClick={() => nav("/app/" + a.id)}
                  aria-label={`${t.detail}: ${a.title}`}
                >
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
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);
  if (!a)
    return (
      <div className="container route-fade">
        <p>Not found.</p>
      </div>
    );
  return (
    <div className="container route-fade">
      <div className="adetail">
        <button className="btn btn-ghost" type="button" onClick={() => nav("/app")}>
          <Icon.back /> {t.back_app}
        </button>
        <h1>{a.title}</h1>
        <div className="adetail-tagline">{L(a.tagline, lang)}</div>
        <Ph className="adetail-hero" />
        <div className="prose">
          {a.detail[lang].map((para) => (
            <p key={para}>{para}</p>
          ))}
        </div>
        <div className="adetail-side">
          <div className="kv">
            <span className="k">{t.stack}</span>
            <span>{a.stack.join(" · ")}</span>
          </div>
          <div className="kv">
            <span className="k">{t.year}</span>
            <span>{a.year}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== READING LIST ===================== */
/* Data comes from Instapaper (see scripts/fetch_instapaper.mjs):
   unread folder -> done:false (未読), archive folder -> done:true (読了).
   Read-only — the site is not the source of truth, so there is no toggle. */
export function ReadingPage() {
  const { t, lang } = useContext(AppCtx);
  const { READING } = window.BlogData;
  const [filter, setFilter] = useState("todo");
  const shown = READING.filter((r) => (filter === "done" ? r.done : !r.done));

  return (
    <div className="container route-fade">
      <PageHead title={t.page_reading.title} />
      <div className="seg-filter" role="group" aria-label={t.filter}>
        {["todo", "done"].map((f) => (
          <button
            key={f}
            className={filter === f ? "on" : ""}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {f === "todo" ? t.reading_todo : t.reading_done}
          </button>
        ))}
      </div>
      <div className="reading-list">
        {shown.map((r) => (
          <div className="ritem" key={r.id}>
            <div className="ritem-main">
              <div className={"ritem-title" + (r.done ? " done" : "")}>{r.title}</div>
              <div className="ritem-sub">
                <span>{localizedDateLabel(r, lang)}</span>
                <span>{r.source}</span>
              </div>
            </div>
            <div className="ritem-side">
              {r.url ? (
                <a
                  className="btn btn-ghost"
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${r.title}: ${t.open_link}`}
                >
                  <Icon.ext />
                </a>
              ) : (
                <span className="btn btn-ghost btn-disabled" aria-disabled="true" title={t.no_link}>
                  <Icon.ext />
                </span>
              )}
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
  const url = "https://popyson.com/feed.xml";
  const copy = () => {
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="container route-fade">
      <div className="rss-wrap">
        <div className="rss-mark">
          <Icon.rss width={28} height={28} />
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{t.rss_title}</h1>
        <p className="muted" style={{ marginTop: 10 }}>
          {t.rss_desc}
        </p>
        <div className="rss-url">
          <span>{url}</span>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={copy}
            aria-label={t.copy_rss_url}
          >
            {copied ? <Icon.check /> : <Icon.copy />}
          </button>
        </div>
        <div className="sr-only" role="status" aria-live="polite">
          {copied ? t.copied : ""}
        </div>
        <div style={{ marginTop: 26 }}>
          <button className="btn" type="button" onClick={() => nav("/blog")}>
            <Icon.back /> {t.back_blog}
          </button>
        </div>
      </div>
    </div>
  );
}
