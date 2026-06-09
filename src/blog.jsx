/* ============================================================
   Blog: list (filter + sort) and article (TOC + components)
   ============================================================ */
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { createColumnHelper, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { AppCtx, Icon, L, PageHead, Ph, bodyText, fmtDate } from "./components.jsx";

let highlighterPromise;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = Promise.all([
      import("shiki/core"),
      import("shiki/engine/oniguruma"),
      import("shiki/wasm"),
      import("shiki/langs/rust.mjs"),
      import("shiki/langs/typescript.mjs"),
      import("shiki/themes/github-light.mjs"),
      import("shiki/themes/github-dark.mjs"),
    ]).then(([core, engine, wasm, rust, typescript, githubLight, githubDark]) => core.createHighlighterCore({
      themes: [githubLight.default, githubDark.default],
      langs: [rust.default, typescript.default],
      engine: engine.createOnigurumaEngine(wasm.default),
    }));
  }
  return highlighterPromise;
}

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
              <button key={tg} className="menu-item" type="button" role="menuitemcheckbox" aria-checked={on} onClick={() => toggle(tg)}>
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
        <div className="prop-grid">
          {props.map(([key, label, Ic]) => (
            <button key={key} className="menu-item prop-item" type="button" role="menuitem" onClick={() => setProp(key)}>
              <Ic width={15} height={15} style={{ color: "var(--text-faint)" }} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </>
    );
  }
  return (
    <>
      <button className="menu-back" type="button" onClick={() => setProp(null)}><Icon.back width={13} height={13} /> {t.filter_add_title}</button>
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
    <span className="fpill">
      <span className="fpill-label"><span className="fpill-key">{key}</span><span>{label}</span></span>
      <button className="fpill-x" type="button" onClick={remove} aria-label={`${t.clear}: ${key}`}>
        <Icon.x width={13} height={13} />
      </button>
    </span>
  );
}

export function BlogList() {
  const { t, lang, nav, openSearch } = useContext(AppCtx);
  const { POSTS } = window.BlogData;
  const [filters, setFilters] = useState({ tags: [], title: "", body: "" });
  const [sortKey, setSortKey] = useState("date"); // date | kana
  const [sortDir, setSortDir] = useState("desc");  // asc | desc
  const [openPanel, setOpenPanel] = useState(null); // null | "filter" | "sort"
  const panelRef = useRef(null);

  useEffect(() => {
    if (!openPanel) return;
    const onDoc = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpenPanel(null); };
    const onKey = (e) => { if (e.key === "Escape") setOpenPanel(null); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [openPanel]);

  const rows = useMemo(() => POSTS.map((p) => ({
    raw: p,
    title: L(p.title, lang),
    body: `${L(p.summary, lang)} ${bodyText(p.id, lang)}`,
    tags: p.tags,
    date: p.date,
    kana: p.kana,
  })), [POSTS, lang]);
  const columns = useMemo(() => {
    const column = createColumnHelper();
    return [
      column.accessor("title", {
        id: "title",
        filterFn: "includesString",
      }),
      column.accessor("body", {
        id: "body",
        filterFn: "includesString",
      }),
      column.accessor("tags", {
        id: "tags",
        filterFn: (row, columnId, value) => {
          if (!value?.length) return true;
          const tags = row.getValue(columnId);
          return value.some((tag) => tags.includes(tag));
        },
      }),
      column.accessor("date", {
        id: "date",
        sortingFn: "text",
      }),
      column.accessor("kana", {
        id: "kana",
        sortingFn: (a, b, columnId) => a.getValue(columnId).localeCompare(b.getValue(columnId), "ja"),
      }),
    ];
  }, []);
  const columnFilters = useMemo(() => [
    ...(filters.tags.length ? [{ id: "tags", value: filters.tags }] : []),
    ...(filters.title ? [{ id: "title", value: filters.title }] : []),
    ...(filters.body ? [{ id: "body", value: filters.body }] : []),
  ], [filters]);
  const sorting = useMemo(() => [{ id: sortKey, desc: sortDir === "desc" }], [sortKey, sortDir]);
  const table = useReactTable({
    data: rows,
    columns,
    state: { columnFilters, sorting },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  const list = table.getRowModel().rows.map((row) => row.original.raw);

  const activeProps = [];
  if (filters.tags.length) activeProps.push("tags");
  if (filters.title) activeProps.push("title");
  if (filters.body) activeProps.push("body");
  const clearAll = () => setFilters({ tags: [], title: "", body: "" });
  const sortLabel = sortKey === "date" ? t.s_date : t.s_kana;
  const orderLabel = sortDir === "asc" ? t.order_asc : t.order_desc;
  const hasActiveFilters = activeProps.length > 0;

  return (
    <div className="container route-fade">
      <PageHead title={t.page_blog.title} />

      <div className="fbar-wrap" ref={panelRef}>
        <div className="fbar" aria-label={t.filters_label}>
          <div className="fbar-controls" role="toolbar" aria-label={t.tools}>
            <button className="fbtn ficon" type="button" onClick={openSearch} aria-label={t.search} title={t.search}>
              <Icon.search width={16} height={16} />
            </button>
            <button className={"fbtn ficon filter-add-btn" + (openPanel === "filter" ? " on" : "") + (hasActiveFilters ? " active" : "")}
                    type="button" onClick={() => setOpenPanel((p) => (p === "filter" ? null : "filter"))}
                    aria-expanded={openPanel === "filter"} aria-controls="filter-panel"
                    aria-label={t.filter_add_title} title={t.filter_add_title}>
              <Icon.filter width={16} height={16} />
            </button>
            <button className={"fbtn ficon sort-btn" + (openPanel === "sort" ? " on" : "")}
                    type="button" onClick={() => setOpenPanel((p) => (p === "sort" ? null : "sort"))}
                    aria-expanded={openPanel === "sort"} aria-controls="sort-panel"
                    aria-label={`${t.sort}: ${sortLabel}, ${orderLabel}`} title={`${t.sort}: ${sortLabel}, ${orderLabel}`}>
              <Icon.sort width={16} height={16} />
            </button>
          </div>

          {hasActiveFilters && (
            <div className="fbar-state">
              <div className="active-filters" aria-live="polite">
                {activeProps.map((prop) => (
                  <FilterPill key={prop} prop={prop} filters={filters} setFilters={setFilters} t={t} />
                ))}
                <button className="btn btn-ghost clear-filters" type="button" onClick={clearAll}>{t.clear_all}</button>
              </div>
            </div>
          )}
        </div>

        {openPanel === "filter" && (
          <div className="fpanel" id="filter-panel" role="region" aria-label={t.filter_add_title}>
            <AddFilterMenu filters={filters} setFilters={setFilters} close={() => setOpenPanel(null)} t={t} />
          </div>
        )}
        {openPanel === "sort" && (
          <div className="fpanel" id="sort-panel" role="region" aria-label={t.sort}>
            <div className="menu-row">
              <span className="mr-label">{t.sort_basis}</span>
              <div className="seg-mini" role="group" aria-label={t.sort_basis}>
                <button type="button" className={sortKey === "date" ? "on" : ""} aria-pressed={sortKey === "date"} onClick={() => setSortKey("date")}>{t.s_date}</button>
                <button type="button" className={sortKey === "kana" ? "on" : ""} aria-pressed={sortKey === "kana"} onClick={() => setSortKey("kana")}>{t.s_kana}</button>
              </div>
            </div>
            <div className="menu-sep" />
            <div className="menu-row">
              <span className="mr-label">{t.sort_order}</span>
              <div className="seg-mini" role="group" aria-label={t.sort_order}>
                <button type="button" className={sortDir === "asc" ? "on" : ""} aria-pressed={sortDir === "asc"} onClick={() => setSortDir("asc")}>{t.order_asc}</button>
                <button type="button" className={sortDir === "desc" ? "on" : ""} aria-pressed={sortDir === "desc"} onClick={() => setSortDir("desc")}>{t.order_desc}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {list.length === 0 ? (
        <div className="empty">{t.no_results}</div>
      ) : (
        <div className="post-index">
          {list.map((p, i) => (
            <button className="post-index-card" type="button" key={p.id} onClick={() => nav("/blog/" + p.id)}>
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
export function Article({ id }) {
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
          <button className="article-mobile-author" type="button" onClick={() => nav("/blog")}><Icon.back width={13} height={13} /> {t.back_blog}</button>
          <button className="article-mobile-toc-btn" type="button" onClick={() => setTocOpen((v) => !v)} aria-expanded={tocOpen} aria-controls="article-mobile-toc">
            {t.toc}
          </button>
        </div>
        {tocOpen && (
          <div className="article-mobile-toc" id="article-mobile-toc" aria-label={t.toc}>
            {toc}
          </div>
        )}

        <button className="article-back" type="button" onClick={() => nav("/blog")}><Icon.back width={13} height={13} /> {t.back_blog}</button>
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
              <button className="rel-card" type="button" key={p.id} onClick={() => nav("/blog/" + p.id)}>
                <Ph className="rel-thumb" />
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
export function Block({ b, lang }) {
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
      const message = L({ ja: b.ja, en: b.en }, lang).trim();
      return (
        <div className={"msg msg-" + b.variant} data-cf-change="ch-message-boxes">
          <div className="msg-body">
            <p>{message}</p>
          </div>
        </div>
      );
    }
    default: return null;
  }
}

export function CodeBlock({ lang, code }) {
  const { t } = useContext(AppCtx);
  const [copied, setCopied] = useState(false);
  const [html, setHtml] = useState("");
  useEffect(() => {
    let live = true;
    getHighlighter().then((highlighter) => highlighter.codeToHtml(code, {
      lang: lang || "text",
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
    })).then((nextHtml) => {
      if (live) setHtml(nextHtml);
    }).catch(() => {
      if (live) setHtml("");
    });
    return () => { live = false; };
  }, [lang, code]);
  const copy = () => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1400); };
  return (
    <div className="code" data-cf-change="ch-code-block">
      <div className="code-bar">
        <span className="code-lang">{lang}</span>
        <button className="btn btn-ghost" type="button" style={{ padding: "2px 6px" }} onClick={copy} aria-label={copied ? t.copied_code : t.copy_code}>
          {copied ? <Icon.check width={13} height={13} /> : <Icon.copy width={13} height={13} />}
        </button>
      </div>
      {html ? (
        <div className="code-highlight" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre><code>{code}</code></pre>
      )}
    </div>
  );
}
