/* ============================================================
   Blog: list (filter + sort) and article (TOC + components)
   ============================================================ */

/* ===================== BLOG LIST (Notion-style filter/sort) ===================== */
/* bodyText lives in components.jsx (shared with the search modal) */

/* one filter editor — reused by the add-menu and by each active pill */
function FilterEditor({ prop, filters, setFilters, close, t }) {
  const { TAGS } = window.BlogData;
  const [q, setQ] = useState("");
  if (prop === "tags") {
    const shown = TAGS.filter((tg) => tg.toLowerCase().includes(q.toLowerCase()));
    const toggle = (tg) => setFilters((f) => ({ ...f, tags: f.tags.includes(tg) ? f.tags.filter((x) => x !== tg) : [...f.tags, tg] }));
    return (
      <>
        <div className="menu-head">{t.f_tag} · {t.tag_contains}</div>
        <input className="menu-input" placeholder={t.tag_filter_ph} value={q} autoFocus
               onChange={(e) => setQ(e.target.value)} />
        <div className="menu-scroll">
          {shown.map((tg) => {
            const on = filters.tags.includes(tg);
            return (
              <button key={tg} className="menu-item" onClick={() => toggle(tg)}>
                <span className={"checkbox" + (on ? " on" : "")}>{on && <Icon.check width={11} height={11} />}</span>
                <span className="mi-grow">#{tg}</span>
              </button>
            );
          })}
          {shown.length === 0 && <div className="menu-row"><span className="mr-label">—</span></div>}
        </div>
      </>
    );
  }
  return (
    <>
      <div className="menu-head">{prop === "title" ? t.f_title : t.f_body}</div>
      <input className="menu-input" autoFocus
             placeholder={prop === "title" ? t.title_contains : t.body_contains}
             value={filters[prop]} onChange={(e) => setFilters((f) => ({ ...f, [prop]: e.target.value }))}
             onKeyDown={(e) => { if (e.key === "Enter") close(); }} />
    </>
  );
}

function AddFilterMenu({ filters, setFilters, close, t }) {
  const [prop, setProp] = useState(null);
  if (!prop) {
    const props = [["tags", t.f_tag, Icon.tagi], ["title", t.f_title, Icon.filter], ["body", t.f_body, Icon.search]];
    return (
      <>
        <div className="menu-head">{t.filter_add_title}</div>
        {props.map(([key, label, Ic]) => (
          <button key={key} className="menu-item" onClick={() => setProp(key)}>
            <Ic width={15} height={15} style={{ color: "var(--text-faint)" }} />
            <span className="mi-grow">{label}</span>
            <Icon.chevron width={14} height={14} style={{ color: "var(--text-faint)" }} />
          </button>
        ))}
      </>
    );
  }
  return (
    <>
      <div className="menu-back" onClick={() => setProp(null)}><Icon.back width={13} height={13} /> {t.filter_add_title}</div>
      <FilterEditor prop={prop} filters={filters} setFilters={setFilters} close={close} t={t} />
    </>
  );
}

function FilterPill({ prop, filters, setFilters, t }) {
  let label;
  if (prop === "tags") label = filters.tags.map((x) => "#" + x).join(", ");
  else label = filters[prop];
  const key = prop === "tags" ? t.f_tag : prop === "title" ? t.f_title : t.f_body;
  const remove = () => setFilters((f) => ({ ...f, [prop]: prop === "tags" ? [] : "" }));
  return (
    <Dropdown width={250} button={({ toggle }) => (
      <span className="fpill">
        <span className="fpill-label" onClick={toggle}><span className="fpill-key">{key}</span><span>{label}</span></span>
        <button className="fpill-x" onClick={(e) => { e.stopPropagation(); remove(); }} aria-label="remove">
          <Icon.x width={13} height={13} />
        </button>
      </span>
    )}>
      {({ close }) => <FilterEditor prop={prop} filters={filters} setFilters={setFilters} close={close} t={t} />}
    </Dropdown>
  );
}

function BlogList() {
  const { t, lang, nav, tw } = useContext(AppCtx);
  const { POSTS } = window.BlogData;
  const [filters, setFilters] = useState({ tags: [], title: "", body: "" });
  const [sortKey, setSortKey] = useState("date"); // date | kana
  const [sortDir, setSortDir] = useState("desc");  // asc | desc

  const list = useMemo(() => {
    let r = POSTS.filter((p) => {
      if (filters.tags.length && !filters.tags.some((tg) => p.tags.includes(tg))) return false;
      if (filters.title && !L(p.title, lang).toLowerCase().includes(filters.title.toLowerCase())) return false;
      if (filters.body) {
        const hay = (L(p.summary, lang) + " " + bodyText(p.id, lang)).toLowerCase();
        if (!hay.includes(filters.body.toLowerCase())) return false;
      }
      return true;
    });
    const cmp = sortKey === "date"
      ? (a, b) => a.date.localeCompare(b.date)
      : (a, b) => a.kana.localeCompare(b.kana, "ja");
    r = [...r].sort((a, b) => sortDir === "asc" ? cmp(a, b) : cmp(b, a));
    return r;
  }, [filters, sortKey, sortDir, lang]);

  const activeProps = [];
  if (filters.tags.length) activeProps.push("tags");
  if (filters.title) activeProps.push("title");
  if (filters.body) activeProps.push("body");
  const clearAll = () => setFilters({ tags: [], title: "", body: "" });

  return (
    <div className="container route-fade">
      <PageHead title={t.page_blog.title} sub={t.page_blog.sub} />

      <div className="fbar">
        <span className="fbar-label">View</span>
        <Dropdown width={250} button={({ open, toggle }) => (
          <button className={"fbtn" + (open ? " on" : "")} onClick={toggle}>
            <Icon.plus width={14} height={14} /> {t.filter_add}
          </button>
        )}>
          {({ close }) => <AddFilterMenu filters={filters} setFilters={setFilters} close={close} t={t} />}
        </Dropdown>

        {activeProps.map((prop) => (
          <FilterPill key={prop} prop={prop} filters={filters} setFilters={setFilters} t={t} />
        ))}
        {activeProps.length > 0 && (
          <button className="btn btn-ghost" onClick={clearAll} style={{ fontSize: 12.5 }}>{t.clear_all}</button>
        )}

        <div className="fbar-spacer" />

        <Dropdown width={230} align="right" button={({ open, toggle }) => (
          <button className={"fbtn" + (open ? " on" : "")} onClick={toggle}>
            <Icon.sort width={14} height={14} /> Sort: {sortKey === "date" ? t.s_date : t.s_kana}
            <span className="faint">{sortDir === "asc" ? "↑" : "↓"}</span>
          </button>
        )}>
          {() => (
            <>
              <div className="menu-row">
                <span className="mr-label">{t.sort_basis}</span>
                <div className="seg-mini">
                  <button className={sortKey === "date" ? "on" : ""} onClick={() => setSortKey("date")}>{t.s_date}</button>
                  <button className={sortKey === "kana" ? "on" : ""} onClick={() => setSortKey("kana")}>{t.s_kana}</button>
                </div>
              </div>
              <div className="menu-sep" />
              <div className="menu-row">
                <span className="mr-label">{t.sort_order}</span>
                <div className="seg-mini">
                  <button className={sortDir === "asc" ? "on" : ""} onClick={() => setSortDir("asc")}>{t.order_asc}</button>
                  <button className={sortDir === "desc" ? "on" : ""} onClick={() => setSortDir("desc")}>{t.order_desc}</button>
                </div>
              </div>
            </>
          )}
        </Dropdown>

        <span className="result-count">{t.results(list.length)}</span>
      </div>

      {list.length === 0 ? (
        <div className="empty">{t.no_results}</div>
      ) : (
        <div className={tw.blogLayout === "grid" ? "post-index post-index-grid" : "post-index"}>
          {list.map((p, i) => (
            <button className="post-index-card" key={p.id} onClick={() => nav("/blog/" + p.id)}>
              <span className="post-index-no">{String(i + 1).padStart(2, "0")}</span>
              <span className="post-index-main">
                <span className="post-index-meta">{fmtDate(p.date, lang)} · {p.reading} {t.min_read}</span>
                <span className="post-index-title">{L(p.title, lang)}</span>
                <span className="post-index-summary">{L(p.summary, lang)}</span>
                <span className="post-index-tags">{p.tags.map((tg) => <span key={tg}>#{tg}</span>)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===================== ARTICLE ===================== */
function Article({ id }) {
  const { t, lang, nav } = useContext(AppCtx);
  const { POSTS } = window.BlogData;
  const post = POSTS.find((p) => p.id === id);
  const [tocOpen, setTocOpen] = useState(false);
  useEffect(() => { window.scrollTo(0, 0); setTocOpen(false); }, [id]);
  if (!post) return <div className="container route-fade"><p>Not found.</p></div>;

  const blocks = window.ArticleBody.get(id);
  const headings = blocks.filter((b) => b.kind === "h2");

  const related = POSTS
    .filter((p) => p.id !== id)
    .map((p) => ({ p, score: p.tags.filter((tg) => post.tags.includes(tg)).length }))
    .sort((a, b) => b.score - a.score || b.p.date.localeCompare(a.p.date))
    .slice(0, 3).map((x) => x.p);

  const jump = (headingId) => {
    const el = document.getElementById("sec-" + headingId);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 76, behavior: "smooth" });
    setTocOpen(false);
  };
  const toc = (
    <ol className="toc-list">
      {headings.map((h) => (
        <li key={h.id}>
          <a href={"#sec-" + h.id} onClick={(e) => { e.preventDefault(); jump(h.id); }}>
            {L({ ja: h.ja, en: h.en }, lang)}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="container article-shell route-fade">
      <aside className="article-toc" aria-label={t.toc}>
        <div className="toc-title">{t.toc}</div>
        {toc}
      </aside>

      <article className="article">
        <div className="article-mobile-nav">
          <button className="article-mobile-author" onClick={() => nav("/blog")}><Icon.back width={13} height={13} /> {t.back_blog}</button>
          <button className="article-mobile-toc-btn" onClick={() => setTocOpen((v) => !v)} aria-expanded={tocOpen}>
            {t.toc}
          </button>
        </div>
        {tocOpen && (
          <div className="article-mobile-toc" aria-label={t.toc}>
            {toc}
          </div>
        )}

        <button className="article-back" onClick={() => nav("/blog")}><Icon.back width={13} height={13} /> {t.back_blog}</button>
        <div className="article-head">
          <h1>{L(post.title, lang)}</h1>
          <div className="article-meta">
            <span>{fmtDate(post.date, lang)}</span>
            <span>{post.reading} {t.min_read}</span>
          </div>
          <div className="article-tags">{post.tags.map((tg) => <span key={tg}>#{tg}</span>)}</div>
        </div>

        <div className="prose">
          {blocks.map((b, i) => <Block key={i} b={b} lang={lang} />)}
        </div>

        <section className="related">
          <hr className="hr" />
          <div className="sec-label">{t.related}</div>
          <div className="related-list" data-cf-change="ch-related-thumbs">
            {related.map((p) => (
              <button className="rel-card" key={p.id} onClick={() => nav("/blog/" + p.id)}>
                <Ph className="rel-thumb" label="THUMB" />
                <span className="rel-body">
                  <span className="rel-title">{L(p.title, lang)}</span>
                  <span className="rel-date">{fmtDate(p.date, lang)} · {p.tags.map((tg) => "#" + tg).join(" ")}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      </article>
    </div>
  );
}

/* render one content block */
function Block({ b, lang }) {
  switch (b.kind) {
    case "h2":
      return <h2 id={"sec-" + b.id} data-cf-change={b.id === "problem" ? "ch-heading-decoration" : undefined}>{L({ ja: b.ja, en: b.en }, lang)}</h2>;
    case "p":
      return <p>{L({ ja: b.ja, en: b.en }, lang)}</p>;
    case "ul":
      return <ul>{(b[lang] || []).map((x, i) => <li key={i}>{x}</li>)}</ul>;
    case "ol":
      return <ol data-cf-change="ch-numbered-list">{(b[lang] || []).map((x, i) => <li key={i}>{x}</li>)}</ol>;
    case "code":
      return <CodeBlock lang={b.lang} code={b.code} />;
    case "msg": {
      const glyph = { info: "i", tip: "✓", warn: "!", note: "•" }[b.variant] || "i";
      return (
        <div className={"msg msg-" + b.variant} data-cf-change="ch-message-boxes">
          <div className="msg-icon">{glyph}</div>
          <div className="msg-body">
            <p>{L({ ja: b.ja, en: b.en }, lang)}</p>
          </div>
        </div>
      );
    }
    default: return null;
  }
}

function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1400); };
  return (
    <div className="code" data-cf-change="ch-code-block">
      <div className="code-bar">
        <span className="code-lang">{lang}</span>
        <button className="btn btn-ghost" style={{ padding: "2px 6px" }} onClick={copy}>
          {copied ? <Icon.check width={13} height={13} /> : <Icon.copy width={13} height={13} />}
        </button>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  );
}

Object.assign(window, { BlogList, Article, Block, CodeBlock });
