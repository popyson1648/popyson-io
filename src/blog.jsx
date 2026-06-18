/* ============================================================
   Blog: list (filter + sort) and article (TOC + components)
   ============================================================ */
import { useContext, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createColumnHelper, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { AppCtx, Icon, L, PageHead, Ph, bestSnippet, bodyText, highlight } from "./components.jsx";
import { localizedDateLabel } from "./dateLabel.js";
import { sectionId } from "./headingSlug.js";

const FILTER_PROPS = ["tags", "title", "body"];
const SEARCH_RESULT_LIMIT = 8;
const SEARCH_RECENT_LIMIT = 5;
const TOOLBAR_VIEWPORT_GUTTER = 20;
const ARTICLE_SCROLL_OFFSET = 76;
const CODE_COPY_FEEDBACK_MS = 1400;
const COPY_ICON_HTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-icon="copy"><rect x="9" y="9" width="11" height="11" rx="1.5"></rect><path d="M5 15V5a1 1 0 0 1 1-1h10"></path></svg>';
const CHECK_ICON_HTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-icon="check"><path d="M5 12l5 5 9-10"></path></svg>';
let pagefindLoadPromise = null;
let pagefindActiveLang = null;

function emptyFilters(initialTag = null) {
  return { tags: initialTag ? [initialTag] : [], title: "", body: "" };
}

async function loadPagefind(lang) {
  if (!pagefindLoadPromise) {
    pagefindLoadPromise = import(/* @vite-ignore */ "/pagefind/pagefind.js");
  }
  const pagefind = await pagefindLoadPromise;
  if (pagefindActiveLang !== lang) {
    await pagefind.destroy();
    document.documentElement.lang = lang;
    await pagefind.options({ excerptLength: 24 });
    pagefindActiveLang = lang;
  }
  return pagefind;
}

function textFromHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSearchText(value) {
  return String(value || "").normalize("NFKC").toLowerCase();
}

function queryMatches(value, query) {
  const text = normalizeSearchText(value);
  const q = normalizeSearchText(query).trim();
  if (!text || !q) return false;
  if (text.includes(q)) return true;
  return q.split(/\s+/).filter(Boolean).some((token) => text.includes(token));
}

function inferMatchLocation(doc, query) {
  if (queryMatches(doc.title, query)) return "title";
  if (queryMatches(doc.tags, query)) return "tag";
  return "body";
}

function postIdFromSearchUrl(url) {
  try {
    const { pathname } = new URL(url, window.location.origin);
    return pathname.match(/^\/(?:en\/)?blog\/([^/]+)/)?.[1] || null;
  } catch {
    return null;
  }
}

async function searchPagefindPosts(query, lang, postsById, docsById, limit) {
  const pagefind = await loadPagefind(lang);
  const response = await pagefind.search(query, { filters: { lang: [lang] } });
  const output = [];
  for (const result of response.results) {
    const data = await result.data();
    const id = postIdFromSearchUrl(data.url);
    const p = id ? postsById.get(id) : null;
    const doc = id ? docsById.get(id) : null;
    if (!p || !doc) continue;
    output.push({
      p,
      where: inferMatchLocation(doc, query),
      snippet: textFromHtml(data.excerpt || data.meta?.summary || ""),
    });
    if (output.length >= limit) break;
  }
  return output;
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
  const { t, lang, nav, route } = useContext(AppCtx);
  const { POSTS, TAGS } = window.BlogData;
  // A tag can arrive via the query (/blog?tag=foo) when navigating from an
  // article's tag — seed the tag filter from it (ignoring unknown tags).
  const initialTag = route?.tag && TAGS.includes(route.tag) ? route.tag : null;
  const [filters, setFilters] = useState(emptyFilters(initialTag));
  // Keep in sync if the route tag changes while this list stays mounted.
  useEffect(() => {
    if (route?.tag && TAGS.includes(route.tag)) {
      setFilters((f) => (f.tags.includes(route.tag) ? f : { ...f, tags: [route.tag] }));
    }
  }, [route?.tag]); // eslint-disable-line react-hooks/exhaustive-deps
  const [sortKey, setSortKey] = useState("date"); // date | kana
  const [sortDir, setSortDir] = useState("desc");  // asc | desc
  const [openPanel, setOpenPanel] = useState(null); // null | "search" | "filter" | "sort"
  const [filterProp, setFilterProp] = useState("tags"); // active filter tab: tags | title | body
  const [searchQuery, setSearchQuery] = useState("");
  const [pagefindResults, setPagefindResults] = useState([]);
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
  const measureToolbarWidth = (el) => {
    const inner = el.firstElementChild;
    const kids = inner && inner.children;
    if (!kids || !kids.length) return el.getBoundingClientRect().width;
    const cs = getComputedStyle(el);
    const extra = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
                + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
    const span = kids[kids.length - 1].getBoundingClientRect().right - kids[0].getBoundingClientRect().left;
    return Math.min(span + extra, window.innerWidth - TOOLBAR_VIEWPORT_GUTTER);
  };
  useLayoutEffect(() => {
    const el = controlsRef.current;
    if (!el) return;
    const inner = el.firstElementChild;
    const start = el.getBoundingClientRect().width;
    const target = measureToolbarWidth(el);
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
      if (el) el.style.width = measureToolbarWidth(el) + "px";
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Custom fonts can reflow the row after the first measure; re-pin once they load.
  useEffect(() => {
    let live = true;
    document.fonts?.ready.then(() => {
      const el = controlsRef.current;
      if (live && el) el.style.width = measureToolbarWidth(el) + "px";
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

  // Collapse the toolbar on outside pointer interaction / Escape.
  useEffect(() => {
    if (!openPanel) return;
    const onDoc = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        restoreFocusRef.current = false; // pointer elsewhere: don't yank focus back
        closePanel();
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") { restoreFocusRef.current = true; closePanel(); }
    };
    document.addEventListener("pointerdown", onDoc, true);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDoc, true); document.removeEventListener("keydown", onKey); };
  }, [openPanel]);

  const postDocs = useMemo(() => POSTS.map((p) => {
    const title = L(p.title, lang);
    const body = `${L(p.summary, lang)} ${bodyText(p.id, lang)}`;
    return {
      p,
      title,
      body,
      tags: p.tags,
      tagsText: p.tags.map((tag) => `#${tag}`).join(" "),
    };
  }), [POSTS, lang]);
  const rows = useMemo(() => postDocs.map((doc) => ({
    raw: doc.p,
    title: doc.title,
    body: doc.body,
    tags: doc.tags,
    date: doc.p.date,
    kana: doc.p.kana,
  })), [postDocs]);
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
  const clearAll = () => setFilters(emptyFilters());
  const sortLabel = sortKey === "date" ? t.s_date : t.s_kana;
  const orderLabel = sortDir === "asc" ? t.order_asc : t.order_desc;
  const hasActiveFilters = activeProps.length > 0;

  const toggleTag = (tg) => setFilters((f) => ({ ...f, tags: f.tags.includes(tg) ? f.tags.filter((x) => x !== tg) : [...f.tags, tg] }));
  const filterLabels = { tags: t.f_tag, title: t.f_title, body: t.f_body };
  const propTabs = FILTER_PROPS.map((key) => [key, filterLabels[key]]);

  // ---- inline search (same incremental index as the retired modal) ----
  const searchDocs = useMemo(() => postDocs.map((doc) => ({
    p: doc.p,
    title: doc.title,
    tags: doc.tagsText,
    body: doc.body,
  })), [postDocs]);
  const searchDocById = useMemo(() => new Map(searchDocs.map((doc) => [doc.p.id, doc])), [searchDocs]);
  const postById = useMemo(() => new Map(POSTS.map((p) => [p.id, p])), [POSTS]);
  const recentSearchResults = useMemo(() => [...POSTS]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, SEARCH_RECENT_LIMIT)
    .map((p) => ({ p, where: null, snippet: "" })), [POSTS]);
  const searchResults = useMemo(() => {
    const term = deferredQuery.trim();
    return term ? pagefindResults : recentSearchResults;
  }, [deferredQuery, pagefindResults, recentSearchResults]);

  useEffect(() => {
    const term = deferredQuery.trim();
    let live = true;
    if (!term) {
      setPagefindResults([]);
      return () => { live = false; };
    }
    searchPagefindPosts(term, lang, postById, searchDocById, SEARCH_RESULT_LIMIT)
      .then((results) => { if (live) setPagefindResults(results); })
      .catch(() => { if (live) setPagefindResults([]); });
    return () => { live = false; };
  }, [deferredQuery, lang, postById, searchDocById]);

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
                    {searchResults.map(({ p, where, snippet: pagefindSnippet }, i) => {
                      const query = searchQuery.trim();
                      const doc = searchDocById.get(p.id);
                      const snippet = query && doc ? (pagefindSnippet || bestSnippet(doc, where, query)) : "";
                      return (
                        <button key={p.id} id={`fbar-result-${p.id}`} className={"sug" + (i === searchActive ? " active" : "")}
                                type="button" role="option" aria-selected={i === searchActive}
                                onMouseEnter={() => setSearchActive(i)} onClick={() => goSearch(p)}>
                          <Ph className="sug-thumb" />
                          <div className="sug-main">
                            <div className="sug-title">{highlight(L(p.title, lang), query)}</div>
                            {snippet && <div className="sug-snippet">{highlight(snippet, query)}</div>}
                            <div className="sug-meta">
                              <span className="sug-date">{localizedDateLabel(p, lang)}</span>
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
          {list.map((p) => (
            <button className="post-index-card" type="button" key={p.id} onClick={() => nav("/blog/" + p.id)}>
              <span className="post-index-main">
                <span className="post-index-meta">{localizedDateLabel(p, lang)} · {p.reading} {t.min_read}</span>
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
  const proseRef = useRef(null);
  const copyTimers = useRef(new Map());
  // Collapse the mobile TOC when navigating to a different article. Resetting
  // during render (vs. inside the effect) keeps it in sync without a second
  // render pass — the React-recommended way to reset state on a prop change.
  const [tocResetId, setTocResetId] = useState(id);
  if (tocResetId !== id) {
    setTocResetId(id);
    setTocOpen(false);
  }
  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  const body = window.ArticleBody.get(id) || {};
  const localizedBody = body[lang] || body.ja || body.en || { html: "" };
  const bodyHtml = localizedBody.html || "";
  const headings = body.headings || [];

  useEffect(() => {
    const root = proseRef.current;
    if (!root) return undefined;
    const timers = copyTimers.current;

    const resetButton = (button) => {
      button.setAttribute("aria-label", t.copy_code);
      button.innerHTML = COPY_ICON_HTML;
      button.dataset.copied = "false";
    };
    const setCopied = (button) => {
      button.setAttribute("aria-label", t.copied_code);
      button.innerHTML = CHECK_ICON_HTML;
      button.dataset.copied = "true";
      clearTimeout(timers.get(button));
      timers.set(button, window.setTimeout(() => resetButton(button), CODE_COPY_FEEDBACK_MS));
    };
    const onClick = (event) => {
      const button = event.target.closest?.(".code-copy");
      if (!button || !root.contains(button)) return;
      const code = button.closest(".code")?.querySelector(".code-highlight")?.textContent || "";
      navigator.clipboard?.writeText(code);
      setCopied(button);
    };

    root.querySelectorAll(".code-copy").forEach(resetButton);
    root.addEventListener("click", onClick);
    return () => {
      root.removeEventListener("click", onClick);
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, [bodyHtml, t.copy_code, t.copied_code]);

  if (!post) return <div className="container route-fade"><p>Not found.</p></div>;

  const relatedIds = Array.isArray(post.relatedIds) ? post.relatedIds : [];
  const related = relatedIds
    .map((relatedId) => POSTS.find((candidate) => candidate.id === relatedId))
    .filter(Boolean);

  const jump = (headingId) => {
    const el = document.getElementById(sectionId(headingId));
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - ARTICLE_SCROLL_OFFSET, behavior: "smooth" });
    setTocOpen(false);
  };
  const toc = (
    <ol className="toc-list">
      {headings.map((h) => (
        <li key={h.id}>
          <a href={"#" + sectionId(h.id)} onClick={(e) => { e.preventDefault(); jump(h.id); }}>
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
            <span>{localizedDateLabel(post, lang)}</span>
            <span>{post.reading} {t.min_read}</span>
          </div>
          <div className="article-tags">{post.tags.map((tg) => (
            <button key={tg} type="button" className="article-tag-link"
                    onClick={() => nav("/blog?tag=" + encodeURIComponent(tg))}
                    aria-label={t.tag_to_list(tg)} title={t.tag_to_list(tg)}>#{tg}</button>
          ))}</div>
        </div>

        <div className="prose" ref={proseRef} dangerouslySetInnerHTML={{ __html: bodyHtml }} />

        <section className="related">
          <hr className="hr" />
          <div className="sec-label">{t.related}</div>
          <div className="related-list" data-cf-change="ch-related-thumbs">
            {related.map((p) => (
              <button className="rel-card" type="button" key={p.id} onClick={() => nav("/blog/" + p.id)}>
                <Ph className="rel-thumb" />
                <span className="rel-body">
                  <span className="rel-title">{L(p.title, lang)}</span>
                  <span className="rel-date">{localizedDateLabel(p, lang)} · {p.tags.map((tg) => "#" + tg).join(" ")}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      </article>
    </div>
  );
}
