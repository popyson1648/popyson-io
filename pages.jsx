/* ============================================================
   Pages: Top, About, Application(+detail), Reading List, RSS
   ============================================================ */

/* ===================== TOP ===================== */
function TopPage() {
  const { t, nav } = useContext(AppCtx);
  const pages = [
    { to: "/about",   key: "about",   no: "01" },
    { to: "/blog",    key: "blog",    no: "02" },
    { to: "/app",     key: "app",     no: "03" },
    { to: "/reading", key: "reading", no: "04" },
    { to: "/rss",     key: "rss",     no: "05", label: "RSS" },
  ];
  return (
    <div className="container route-fade top-simple">
      <h1>ハロー</h1>
      <nav className="top-link-cloud" aria-label={t.top_pages}>
        {pages.map((p) => (
          <a key={p.key} href={"#" + p.to} onClick={(e) => { e.preventDefault(); nav(p.to); }}>
            <span>{p.no}</span>
            {p.label || t.nav[p.key]}
          </a>
        ))}
      </nav>
    </div>
  );
}

function RecentList({ posts }) {
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
function AboutPage() {
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
  const Activity = () => (
    <div className="about-block">
      <h2>{t.about_activity}</h2>
      <ul className="act-list">
        {PERSON.activities.map((a, i) => <li key={i}>{L(a, lang)}</li>)}
      </ul>
    </div>
  );
  const Made = () => (
    <div className="about-block">
      <h2>{t.about_made}</h2>
      <div className="made-grid">
        {APPS.slice(0, 4).map((a) => (
          <div className="made-card" key={a.id} onClick={() => nav("/app/" + a.id)}>
            <div className="made-title">{a.title}</div>
            <div className="made-sub">{L(a.tagline, lang)}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="container route-fade">
      <PageHead title={t.page_about.title} sub={t.page_about.sub} />
      <div className="about-top">
        <div className="avatar">{PERSON.initials}</div>
        <div>
          <h2 className="about-name">{L(PERSON.name, lang)}</h2>
          <div className="about-role">{L(PERSON.role, lang)} · {L(PERSON.location, lang)}</div>
          <p className="about-tag">{L(PERSON.tagline, lang)}</p>
          <div className="links-row" data-cf-change="ch-profile-links">
            {PERSON.links.map((lk) => (
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
function ApplicationPage() {
  const { t, lang, nav, tw } = useContext(AppCtx);
  const { APPS } = window.BlogData;
  const rows = tw.appLayout === "rows";
  return (
    <div className="container route-fade">
      <PageHead title={t.page_app.title} sub={t.page_app.sub} />
      <div className={rows ? "post-list" : "app-grid"}>
        {APPS.map((a) => rows ? (
          <button className="pcard" key={a.id} onClick={() => nav("/app/" + a.id)}>
            <Ph className="pcard-thumb" label="IMG" />
            <div className="pcard-body">
              <h3 className="pcard-title">{a.title}</h3>
              <div className="pcard-meta"><span>{L(a.tagline, lang)}</span><span>· {a.year}</span></div>
              <p className="pcard-summary">{L(a.desc, lang)}</p>
              <div className="tag-row" style={{ marginTop: 4 }}>{a.stack.map((s) => <Chip key={s} isStatic>{s}</Chip>)}</div>
            </div>
          </button>
        ) : (
          <div className="acard" key={a.id}>
            <Ph className="acard-img" label="IMAGE" />
            <div className="acard-body">
              <h3 className="acard-title">{a.title}</h3>
              <div className="acard-tagline">{L(a.tagline, lang)}</div>
              <p className="acard-desc">{L(a.desc, lang)}</p>
              <div className="tag-row">{a.stack.map((s) => <Chip key={s} isStatic>{s}</Chip>)}</div>
              <div className="acard-foot">
                <span className="acard-year">{a.year}</span>
                <button className="btn btn-accent" onClick={() => nav("/app/" + a.id)}>
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

function ApplicationDetail({ id }) {
  const { t, lang, nav } = useContext(AppCtx);
  const { APPS } = window.BlogData;
  const a = APPS.find((x) => x.id === id);
  useEffect(() => { window.scrollTo(0, 0); }, [id]);
  if (!a) return <div className="container route-fade"><p>Not found.</p></div>;
  return (
    <div className="container route-fade">
      <div className="adetail">
        <button className="btn btn-ghost" onClick={() => nav("/app")}><Icon.back /> {t.back_app}</button>
        <h1>{a.title}</h1>
        <div className="adetail-tagline">{L(a.tagline, lang)}</div>
        <Ph className="adetail-hero" label="IMAGE" />
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
function ReadingPage() {
  const { t, lang } = useContext(AppCtx);
  const { READING } = window.BlogData;
  const [items, setItems] = useState(() => READING.map((r) => ({ ...r })));
  const [filter, setFilter] = useState("all");
  const shown = items.filter((r) => filter === "all" ? true : filter === "done" ? r.done : !r.done);
  const toggle = (i) => setItems((prev) => prev.map((r, idx) => idx === i ? { ...r, done: !r.done } : r));
  const idxOf = (r) => items.indexOf(r);

  return (
    <div className="container route-fade">
      <PageHead title={t.page_reading.title} sub={t.page_reading.sub} />
      <div className="seg-filter">
        {["all", "todo", "done"].map((f) => (
          <button key={f} className={filter === (f === "todo" ? "todo" : f) ? "on" : ""}
                  onClick={() => setFilter(f === "todo" ? "todo" : f)}>
            {f === "all" ? t.reading_all : f === "todo" ? t.reading_todo : t.reading_done}
          </button>
        ))}
      </div>
      <div className="reading-list">
        {shown.map((r) => (
          <div className="ritem" key={r.title.ja + r.date}>
            <div className={"rcheck" + (r.done ? " done" : "")} role="checkbox" aria-checked={r.done}
                 tabIndex={0} onClick={() => toggle(idxOf(r))}
                 onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(idxOf(r)); } }}>
              {r.done && <Icon.check width={14} height={14} />}
            </div>
            <div className="ritem-main">
              <div className={"ritem-title" + (r.done ? " done" : "")}>{L(r.title, lang)}</div>
              <div className="ritem-sub">
                <span>{r.source}</span><span>{t.added} {fmtDate(r.date, lang)}</span>
                {r.tags.map((tg) => <span key={tg}>#{tg}</span>)}
              </div>
              {r.note && <div className="ritem-note">“{L(r.note, lang)}”</div>}
            </div>
            <div className="ritem-side">
              <a className="btn btn-ghost" href="#" onClick={(e) => e.preventDefault()}><Icon.ext /></a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===================== RSS ===================== */
function RssPage() {
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
          <button className="btn btn-ghost" onClick={copy}>{copied ? <Icon.check /> : <Icon.copy />}</button>
        </div>
        <div style={{ marginTop: 26 }}>
          <button className="btn" onClick={() => nav("/blog")}><Icon.back /> {t.back_blog}</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TopPage, AboutPage, ApplicationPage, ApplicationDetail, ReadingPage, RssPage, RecentList });
