/* ============================================================
   Blog: list (filter + sort) and article (TOC + components)
   ============================================================ */
import { useContext, useEffect, useMemo, useState } from "react";
import { createColumnHelper, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { createHighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";
import wasm from "shiki/wasm";
import rust from "shiki/langs/rust.mjs";
import typescript from "shiki/langs/typescript.mjs";
import githubLight from "shiki/themes/github-light.mjs";
import githubDark from "shiki/themes/github-dark.mjs";
import { AppCtx, Dropdown, Icon, L, PageHead, Ph, bodyText, fmtDate } from "./components.jsx";

const highlighterPromise = createHighlighterCore({
  themes: [githubLight, githubDark],
  langs: [rust, typescript],
  engine: createOnigurumaEngine(wasm),
});

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

export function BlogList() {
  const { t, lang, nav, tw } = useContext(AppCtx);
  const { POSTS } = window.BlogData;
  const [filters, setFilters] = useState({ tags: [], title: "", body: "" });
  const [sortKey, setSortKey] = useState("date"); // date | kana
  const [sortDir, setSortDir] = useState("desc");  // asc | desc

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
            <Icon.sort width={14} height={14} /> {t.sort}
            <span className="faint">{sortKey === "date" ? t.s_date : t.s_kana}</span>
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
      return (
        <div className={"msg msg-" + b.variant} data-cf-change="ch-message-boxes">
          <div className="msg-body">
            <p>{L({ ja: b.ja, en: b.en }, lang)}</p>
          </div>
        </div>
      );
    }
    default: return null;
  }
}

export function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);
  const [html, setHtml] = useState("");
  useEffect(() => {
    let live = true;
    highlighterPromise.then((highlighter) => highlighter.codeToHtml(code, {
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
        <button className="btn btn-ghost" style={{ padding: "2px 6px" }} onClick={copy}>
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
