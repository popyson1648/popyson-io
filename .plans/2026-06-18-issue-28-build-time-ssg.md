# Plan

## Goal

Implement issue #28: move deterministic work to build time (SSG). Render post
Markdown → HTML at build time, highlight code with Shiki (oniguruma) at build
time, generate the search plain text at build time, and bake article body HTML
into the prerendered HTML. Remove `react-markdown`, `shiki`, `remark`, and the
Markdown parser stack from the client bundle, leaving only React plus pure
interaction (filter/sort/search UI, copy buttons, routing).

## Scope

1. Build-time Markdown → HTML rendering (SSG) so article bodies ship as static HTML.
2. Build-time Shiki highlighting (oniguruma engine), all languages, dual
   `github-light` / `github-dark` themes via the existing `--shiki-*` CSS-variable
   mechanism, with no highlighter JS shipped to the client.
3. Build-time search plain text generated and served; drop runtime
   `markdownToPlainText`.
4. Bake article body HTML into `dist/blog/<id>/index.html` (and `en/…`) inside
   `<div id="root">` as part of `scripts/prerender.mjs`.

## Non-goals

- Filter / sort / search UI (`@tanstack/react-table`) client behavior.
- Theme toggle, copy button semantics, client routing, focus control behavior.
- Full client-side React hydration / SSR of the whole app shell (only article
  body HTML is baked for crawlers; the SPA still mounts via `createRoot`).

## Design

### Build-time renderer (new `scripts/articleHtml.mjs`)

A Node, async `unified` pipeline:

```
unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkDirective)
  .use(remarkCallouts)      // -> <div class="msg msg-VARIANT"><div class="msg-body">[title]+children</div></div>
  .use(remarkHeadingIds)    // depth-2 -> id = sectionId(slug) ("sec-…")
  .use(remarkRehype)        // raw HTML dropped (no allowDangerousHtml) == skipHtml
  .use(rehypeSafeUrls)      // reuse safeMarkdownUrl: unwrap unsafe <a>, drop unsafe <img>; add rel="noreferrer" to external links, loading="lazy" to img
  .use(rehypeShiki, { themes: { light: "github-light", dark: "github-dark" }, defaultColor: false })
  .use(rehypeCodeToolbar)   // wrap <pre.shiki> into the .code/.code-bar/.code-highlight markup + copy button
  .use(rehypeStringify)
```

Notes:
- `remarkCallouts` / `remarkHeadingIds` move into the build module and emit final
  HTML (no more react-markdown `hName: "callout"`). `calloutVariant` and the
  `slugifyHeading` / `sectionId` helpers are reused unchanged.
- `rehypeCodeToolbar` produces exactly the markup `CodeBlock` produces today:
  `.code > (.code-bar > .code-lang + copy <button>) + (.code-highlight > pre.shiki)`.
  The copy button is a static `<button class="code-copy" type="button"
  aria-label="…">` carrying the localized copy label; the icon is the inline
  copy SVG. Code text for copying is read from the rendered `.code-highlight`
  at click time (no duplicated data attribute).
- Output is per locale (the copy aria-label and code-lang differ only by i18n
  copy strings), so render ja and en separately with their copy labels.

### Content wiring

- `content_loader.mjs`: keep `loadSiteContent()` synchronous (RSS only needs
  POST metadata). Add async `renderArticleBodies(content, …)` that maps each
  body `{ ja, en, headings }` to `{ ja: { html, text }, en: { html, text }, headings }`
  using the build renderer + a plain-text extractor.
- `vite.config.js` `virtual:site-content` `load()` becomes async and emits the
  rendered `ARTICLE_BODIES` (html + text + headings). POSTS/TAGS/PERSON unchanged.
- `articleBody.js`: `window.ArticleBody.get(id)` now returns the rendered shape.

### Client changes

- `blog.jsx`:
  - `MarkdownArticle` → render `body[lang].html` via
    `<div className="prose" dangerouslySetInnerHTML={{ __html }} />`.
  - Delete the `react-markdown` import, `markdownComponents`, the runtime
    `CodeBlock` (Shiki) and `getHighlighter()`.
  - Add a single delegated copy handler (a `useEffect` in `Article` on the
    `.prose` node) that copies the code text and swaps the button icon for the
    `copied` feedback window (~1.4s). Honors existing i18n labels.
- `components.jsx`: `bodyText(id, lang)` reads `body[lang].text` (pre-generated)
  instead of calling `markdownToPlainText`.
- Drop the `markdownPipeline.js` client import path; the module (or its
  successor) becomes build-time only.

### Prerender

- `scripts/prerender.mjs`: for `article` routes, inject the baked body HTML into
  `<div id="root">…</div>` (article title `<h1>` + `<div class="prose">…</div>`),
  so crawlers and SNS unfurlers see the body without running JS. Other routes
  keep the empty root. Uses `renderArticleBodies` output.

### Dependencies

- Add devDependencies: `unified`, `remark-parse`, `remark-rehype`,
  `rehype-stringify`, `@shikijs/rehype`.
- Move to devDependencies (build-time only now): `remark-gfm`,
  `remark-directive`, `unist-util-visit`, `shiki`.
- Remove dependency: `react-markdown`.

### Verification updates

- `check_markdown_rendering.mjs`: rewrite to drive the new build renderer
  (fixtures → HTML) and assert: GFM subset, fenced code → `.code`/`.shiki`
  with `--shiki-light`/`--shiki-dark`, callout title + nesting, raw HTML inert,
  unsafe URL dropped, malformed input non-fatal, heading id = `sec-…`.
- `check_accessibility_static.py`: replace the Shiki-lazy-load invariant with a
  new one — client `blog.jsx` must NOT import shiki/react-markdown, and the copy
  button must keep an accessible name; assert built `dist/blog/<id>/index.html`
  contains the body (optional, build-dependent → keep to source-level checks).

## Steps

1. Branch / worktree for issue #28 (off the issue-12 branch).
2. Add/move dependencies; `npm install`.
3. Write `scripts/articleHtml.mjs` (renderer + plain-text extractor + rehype helpers).
4. Wire `content_loader.mjs` (`renderArticleBodies`), `vite.config.js` (async load), `articleBody.js`.
5. Rewrite `blog.jsx` article rendering + delegated copy handler; remove Shiki/markdown client code.
6. Update `components.jsx` `bodyText`.
7. Integrate body HTML baking into `scripts/prerender.mjs`.
8. Update `check_markdown_rendering.mjs` and `check_accessibility_static.py`.
9. Update `.project/structure.md` and record a decision in `.decisions/`.
10. `python3 scripts/verify.py`; confirm no shiki/react-markdown/remark/micromark in client bundle.

## Verification

- `python3 scripts/verify.py` (lint, build, unit, a11y, lighthouse).
- Grep built client assets for `react-markdown` / `shiki` / `remark` / `micromark` — must be absent.
- Inspect `dist/blog/<id>/index.html`: body, code, headings present without JS.
- Manual: callouts, copy button, search/filter/sort work in `npm run preview`.

## Risks

- Reworking the #12 react-markdown components (callouts, copy) into static HTML +
  minimal hydration carries regression risk; mitigate with the rewritten unit
  check and a preview pass.
- Shiki dual-theme output must match the `--shiki-*` CSS variables app.css expects.
- Baking HTML into `#root` is replaced by React on mount; acceptable (crawler-only).

## Open Issues

- `npm install` needs network access for the new packages.
- Whether to bake the full article shell vs. just the prose body into `#root`
  (plan: prose body + title only, minimal).
