/* ============================================================
   Blog: list (filter + sort) and article (TOC + components)
   ============================================================ */
import { useContext, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createColumnHelper, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { AppCtx, Icon, L, PageHead, Ph, bestSnippet, bodyText, fmtDate, highlight } from "./components.jsx";
import { createSoftmatcha2SearchIndex } from "./softmatcha2Search.js";

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
  const { t, lang, nav } = useContext(AppCtx);
  const { POSTS, TAGS } = window.BlogData;
  const [filters, setFilters] = useState({ tags: [], title: "", body: "" });
  const [sortKey, setSortKey] = useState("date"); // date | kana
  const [sortDir, setSortDir] = useState("desc");  // asc | desc
  const [openPanel, setOpenPanel] = useState(null); // null | "search" | "filter" | "sort"
  const [filterProp, setFilterProp] = useState("tags"); // active filter tab: tags | title | body
  const [searchQuery, setSearchQuery] = useState("");
  const [searchActive, setSearchActive] = useState(0); // highlighted result index
  const deferredQuery = useDeferredValue(searchQuery); // debounce result computation while typing
  const panelRef = useRef(null);    // .fbar-wrap — outside-click boundary
  const controlsRef = useRef(null); // .fbar-controls — animated-width target
  const backRef = useRef(null);     // back arrow shown while expanded
  const searchBtnRef = useRef(null); // collapsed search trigger
  const filterBtnRef = useRef(null); // collapsed filter trigger
  const sortBtnRef = useRef(null);   // collapsed sort trigger
  const searchInputRef = useRef(null); // inline search field
  const resultsRef = useRef(null);     // results listbox popup
  const lastOpenedRef = useRef(null); // which trigger opened the bar
  const restoreFocusRef = useRef(false); // restore focus to trigger on close (keyboard only)
  const prevOpenRef = useRef(null); // previous openPanel, to detect open/close edges

  const closePanel = () => { setOpenPanel(null); setSearchQuery(""); setSearchActive(0); };
  // Back arrow always returns to the collapsed top (search / filter / sort).
  // Filter keeps its property tabs visible, so there is no nested step to undo.
  const goBack = () => { restoreFocusRef.current = true; closePanel(); };

  // Grow/shrink the toolbar smoothly as its content changes. `fit-content`/`auto`
  // can't be transitioned, so pin an explicit px width each time. We size from the
  // span of the row's children (first-left → last-right), which reflects the true
  // content width in either direction — unlike `scrollWidth`, which never reports
  // less than the (still-wide) container while collapsing, and unlike the pill's
  // `auto` width, which collapses because `.fbar-inline` is a shrinkable flex item.
  // The span is also invariant under the reveal animation's uniform translate.
  const measureWidth = (el) => {
    const inner = el.firstElementChild;
    const kids = inner && inner.children;
    if (!kids || !kids.length) return el.getBoundingClientRect().width;
    const cs = getComputedStyle(el);
    const extra = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
                + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
    const span = kids[kids.length - 1].getBoundingClientRect().right - kids[0].getBoundingClientRect().left;
    return Math.min(span + extra, window.innerWidth - 20);
  };
  useLayoutEffect(() => {
    const el = controlsRef.current;
    if (!el) return;
    const inner = el.firstElementChild;
    const start = el.getBoundingClientRect().width;
    const target = measureWidth(el);
    // Asymmetric timing: entering/expanding lingers, collapsing exits quicker
    // (Material motion: exit transitions are shorter than enter transitions).
    el.style.transitionDuration = target >= start ? "260ms" : "180ms";
    el.style.width = start + "px";
    void el.offsetWidth; // force reflow so the transition runs from `start`
    el.style.width = target + "px";
    // Fade/slide the swapped content in (WAAPI re-triggers without remounting,
    // so width measurement above always reads the live row). Skip if reduced.
    if (inner && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      inner.animate(
        [{ opacity: 0, transform: "translateX(7px)" }, { opacity: 1, transform: "translateX(0)" }],
        { duration: 220, easing: "cubic-bezier(0.2, 0, 0, 1)" },
      );
    }
  }, [openPanel, filterProp, lang]);

  // Re-pin the width when the viewport changes (no animation needed).
  useEffect(() => {
    const onResize = () => {
      const el = controlsRef.current;
      if (el) el.style.width = measureWidth(el) + "px";
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Custom fonts can reflow the row after the first measure; re-pin once they load.
  useEffect(() => {
    let live = true;
    document.fonts?.ready.then(() => {
      const el = controlsRef.current;
      if (live && el) el.style.width = measureWidth(el) + "px";
    });
    return () => { live = false; };
  }, []);

  // Move focus into the bar when it expands; return it to the trigger when it
  // collapses via keyboard/back (WAI-ARIA disclosure focus management). Only act
  // on the open/close edge so switching property tabs doesn't steal focus; text
  // fields handle their own focus via autoFocus.
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = openPanel;
    if (openPanel && !wasOpen) {
      lastOpenedRef.current = openPanel;
      // search focuses its own input (autoFocus); other panels focus the back arrow
      if (openPanel !== "search") backRef.current?.focus({ preventScroll: true });
    } else if (!openPanel && wasOpen && restoreFocusRef.current) {
      const trigger = { search: searchBtnRef, filter: filterBtnRef, sort: sortBtnRef }[lastOpenedRef.current];
      trigger?.current?.focus({ preventScroll: true });
      restoreFocusRef.current = false;
    }
  }, [openPanel]);

  // Collapse the toolbar on outside click / Escape.
  useEffect(() => {
    if (!openPanel) return;
    const onDoc = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        restoreFocusRef.current = false; // pointer elsewhere — don't yank focus back
        closePanel();
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") { restoreFocusRef.current = true; closePanel(); }
    };
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

  const toggleTag = (tg) => setFilters((f) => ({ ...f, tags: f.tags.includes(tg) ? f.tags.filter((x) => x !== tg) : [...f.tags, tg] }));
  const propTabs = [["tags", t.f_tag], ["title", t.f_title], ["body", t.f_body]];

  // ---- inline search (same incremental index as the retired modal) ----
  const searchDocs = useMemo(() => POSTS.map((p) => ({
    p,
    title: L(p.title, lang),
    tags: p.tags.map((tag) => `#${tag}`).join(" "),
    body: `${L(p.summary, lang)} ${bodyText(p.id, lang)}`,
  })), [POSTS, lang]);
  const searchDocById = useMemo(() => new Map(searchDocs.map((doc) => [doc.p.id, doc])), [searchDocs]);
  const searchIndex = useMemo(() => createSoftmatcha2SearchIndex(searchDocs), [searchDocs]);
  const searchResults = useMemo(() => {
    const term = deferredQuery.trim();
    return searchIndex.search(term, { limit: term ? 8 : 5 });
  }, [deferredQuery, searchIndex]);

  useEffect(() => { setSearchActive(0); }, [deferredQuery]);
  // aria-activedescendant doesn't auto-scroll; keep the active option in view
  useEffect(() => {
    if (openPanel !== "search") return;
    const hit = searchResults[searchActive];
    if (hit) document.getElementById(`fbar-result-${hit.p.id}`)?.scrollIntoView({ block: "nearest" });
  }, [searchActive, openPanel, searchResults]);

  const goSearch = (p) => { closePanel(); nav("/blog/" + p.id); };
  const onSearchKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSearchActive((a) => Math.min(a + 1, searchResults.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSearchActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Home") { e.preventDefault(); setSearchActive(0); }
    else if (e.key === "End") { e.preventDefault(); setSearchActive(searchResults.length - 1); }
    else if (e.key === "Enter" && searchResults[searchActive]) { e.preventDefault(); goSearch(searchResults[searchActive].p); }
    // Escape is handled by the bar's global handler (collapse + restore focus)
  };

  return (
    <div className="container route-fade">
      <PageHead title={t.page_blog.title} />

      <div className="fbar-wrap" ref={panelRef}>
        <div className="fbar" aria-label={t.filters_label}>
          <div className="fbar-ctrl-wrap">
            <div className={"fbar-controls" + (openPanel ? " expanded" : "")} ref={controlsRef} role="toolbar" aria-label={t.tools}>
              <div className="fbar-inline">
                {!openPanel && (
                  <>
                    <button ref={searchBtnRef} className="fbtn ficon search-btn"
                            type="button" onClick={() => setOpenPanel("search")}
                            aria-expanded={openPanel === "search"} aria-controls="search-results"
                            aria-label={t.search} title={t.search}>
                      <Icon.search width={16} height={16} />
                    </button>
                    <button ref={filterBtnRef} className={"fbtn ficon filter-add-btn" + (hasActiveFilters ? " active" : "")}
                            type="button" onClick={() => setOpenPanel("filter")}
                            aria-expanded={openPanel === "filter"} aria-controls="filter-panel"
                            aria-label={t.filter_add} title={t.filter_add}>
                      <Icon.filter width={16} height={16} />
                    </button>
                    <button ref={sortBtnRef} className="fbtn ficon sort-btn"
                            type="button" onClick={() => setOpenPanel("sort")}
                            aria-expanded={openPanel === "sort"} aria-controls="sort-panel"
                            aria-label={`${t.sort}: ${sortLabel}, ${orderLabel}`} title={`${t.sort}: ${sortLabel}, ${orderLabel}`}>
                      <Icon.sort width={16} height={16} />
                    </button>
                  </>
                )}

                {openPanel && (
                  <button className="fbtn ficon fbar-back" ref={backRef} type="button" onClick={goBack} aria-label={t.back_tools} title={t.back_tools}>
                    <Icon.back width={16} height={16} />
                  </button>
                )}

                {openPanel === "search" && (
                  <div className="fbar-search">
                    <Icon.search width={16} height={16} aria-hidden="true" />
                    <input ref={searchInputRef} className="fbar-search-input" type="text" autoFocus
                           role="combobox" aria-expanded={searchResults.length > 0} aria-controls="search-results"
                           aria-autocomplete="list" aria-label={t.search}
                           aria-activedescendant={searchResults[searchActive] ? `fbar-result-${searchResults[searchActive].p.id}` : undefined}
                           placeholder={t.search_ph} value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={onSearchKey} />
                    {searchQuery && (
                      <button className="search-clear" type="button" onClick={() => { setSearchQuery(""); searchInputRef.current?.focus(); }} aria-label={t.clear_search} title={t.clear_search}>
                        <Icon.x width={14} height={14} />
                      </button>
                    )}
                  </div>
                )}

                {openPanel === "sort" && (
                  <div className="fbar-fields" id="sort-panel" role="region" aria-label={t.sort}>
                    <div className="seg-mini" role="group" aria-label={`${t.s_date} / ${t.s_kana}`}>
                      <button type="button" className={sortKey === "date" ? "on" : ""} aria-pressed={sortKey === "date"} onClick={() => setSortKey("date")}>{t.s_date}</button>
                      <button type="button" className={sortKey === "kana" ? "on" : ""} aria-pressed={sortKey === "kana"} onClick={() => setSortKey("kana")}>{t.s_kana}</button>
                    </div>
                    <span className="fbar-sep" aria-hidden="true" />
                    <div className="seg-mini" role="group" aria-label={`${t.order_asc} / ${t.order_desc}`}>
                      <button type="button" className={"seg-ico" + (sortDir === "asc" ? " on" : "")} aria-pressed={sortDir === "asc"} onClick={() => setSortDir("asc")}><Icon.caretUp width={12} height={12} />{t.order_asc}</button>
                      <button type="button" className={"seg-ico" + (sortDir === "desc" ? " on" : "")} aria-pressed={sortDir === "desc"} onClick={() => setSortDir("desc")}><Icon.caretDown width={12} height={12} />{t.order_desc}</button>
                    </div>
                  </div>
                )}

                {openPanel === "filter" && (
                  <div className="fbar-fields" id="filter-panel" role="region" aria-label={t.filter_add}>
                    <div className="seg-mini" role="group" aria-label={t.filter_add}>
                      {propTabs.map(([key, label]) => (
                        <button key={key} type="button" className={filterProp === key ? "on" : ""} aria-pressed={filterProp === key} onClick={() => setFilterProp(key)}>{label}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {openPanel === "search" && (
              <div className="fbar-results" id="search-results" role="listbox" ref={resultsRef}
                   aria-label={searchQuery.trim() ? t.results(searchResults.length) : t.search_recent}>
                {searchResults.length === 0 ? (
                  <div className="fbar-results-empty">{t.search_no}</div>
                ) : (
                  <>
                    <div className="fbar-results-head">{searchQuery.trim() ? t.results(searchResults.length) : t.search_recent}</div>
                    {searchResults.map(({ p, where }, i) => {
                      const query = searchQuery.trim();
                      const doc = searchDocById.get(p.id);
                      const snippet = query && doc ? bestSnippet(doc, where, query) : "";
                      return (
                        <button key={p.id} id={`fbar-result-${p.id}`} className={"sug" + (i === searchActive ? " active" : "")}
                                type="button" role="option" aria-selected={i === searchActive}
                                onMouseEnter={() => setSearchActive(i)} onClick={() => goSearch(p)}>
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
            )}

            {openPanel === "filter" && (
              <div className="fbar-pop" role="region" aria-label={t.filter_add}>
                {filterProp === "tags" ? (
                  <div className="fbar-chips" role="group" aria-label={t.f_tag}>
                    {TAGS.map((tg) => {
                      const on = filters.tags.includes(tg);
                      return (
                        <button key={tg} type="button" className={"fbar-chip" + (on ? " on" : "")} aria-pressed={on} onClick={() => toggleTag(tg)}>#{tg}</button>
                      );
                    })}
                  </div>
                ) : (
                  <input className="fbar-pop-input" autoFocus
                         placeholder={filterProp === "title" ? t.title_contains : t.body_contains}
                         value={filters[filterProp]}
                         onChange={(e) => setFilters((f) => ({ ...f, [filterProp]: e.target.value }))}
                         onKeyDown={(e) => { if (e.key === "Enter") closePanel(); }} />
                )}
              </div>
            )}
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

