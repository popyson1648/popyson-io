# Structure

## Top-level Directories

- `src/`: React application source, app CSS, content data modules, and Pagefind-powered search UI.
- `scripts/`: repository automation (metadata generation, build steps, content loader, the verification runner, and the Lighthouse helper).
- `tests/`: Vitest specs grouped into `unit`/`integration`/`component` projects (`*.test.mjs`, `*.integration.test.mjs`, `*.test.jsx`), the Python accessibility check, the component setup file, and `fixtures/`, run through the verification phases. See `.project/testing.md`.
- `.project/`: short contributor-facing project documentation.
- `.plans/`: task plans.
- `.decisions/`: accepted project decisions.
- `.github/workflows/`: CI, database content publication, site deploy, scheduled Instapaper refresh, secret scanning, and security remediation automation.
- `workers/content-api/`: authenticated D1/R2 authoring and CI publication API.
- `workers/content-backup/`: scheduled D1 export and R2 asset backup Workflow.
- `editor/`: the dedicated local editor Vite configuration and Git-ignored optimized `dist/` output. The root site build and deployment do not read this output.

## Important Modules

- `src/main.jsx`: Vite React entry point.
- `src/app.jsx`: path-based routing (History API; About is the default landing page, language carried in the URL — `/en` prefix for English), theme state, the runtime `<head>` (OGP/Twitter/hreflang) updater, and the app shell.
- `src/components.jsx`: shared UI components, icons (incl. Simple Icons brand glyphs), and helpers.
- `src/blog.jsx`: blog list, filters, Pagefind search combobox, article shell, TOC behavior, and delegated article code-copy interaction. Article body HTML is generated at build time.
- `src/blogRoute.jsx`: browser-only lazy route boundary that loads the Blog UI and rendered article bodies only when a Blog list or article route is opened. Build-time prerendering continues to import `src/blog.jsx` directly.
- `src/pages.jsx`: about (default landing), application, reading, and RSS pages.
- `src/embedFrames.js`: runtime side of post embeds. It takes the height X and Instagram report for their frames and points the X frame at the current theme. Used by the two article bodies (`src/blog.jsx`, `src/pages.jsx`).
- `src/prerenderRoutes.jsx`: build-time SSR entry. `scripts/prerender.mjs` loads it through Vite's SSR pipeline and renders each non-article route's page component (`renderToStaticMarkup`) to bake the primary body into `#root`. No client hydration — `createRoot` still replaces the markup on mount.
- `src/meta.js`: single source of truth for per-route/per-locale metadata (titles, descriptions, canonical, hreflang, OGP/Twitter) and the prerender route list; shared by `src/app.jsx` (runtime) and `scripts/prerender.mjs` (build).
- `scripts/contentSnapshotClient.mjs`: validates and materializes pinned D1/R2 publication and release snapshots into an explicit isolated root.
- `src/content/metadata.toml`: article metadata defaults plus Gemini (tags/summary) and OpenAI (`[thumbnail_generation]`) provider/model settings.
- `src/content/prompts/tag-generation.md`: system instruction used by automatic tag generation.
- `src/content/prompts/summary-generation.md`: system instruction used by automatic summary generation.
- `src/content/prompts/thumbnail-concept.md`: system instruction that derives the thumbnail concept from the Japanese summary.
- `src/content/prompts/thumbnail-generation.md`: OpenAI image prompt with a `{CONCEPT}` placeholder for auto thumbnails.
- `workers/content-api/src/`: author CRUD, revision history, asset, publication job, release, and reconciliation handlers.
- `workers/content-backup/src/`: scheduled D1 export and content-addressed R2 backup handlers.
- `scripts/articleHtml.mjs`: build-time Markdown renderer. It turns post Markdown into safe HTML, applies Shiki dual-theme syntax highlighting, wraps code-copy controls, resolves `::embed` directives into iframes, and generates search plain text. Author-facing syntax is documented in `.project/article-markdown.md`.
- `scripts/embedProviders.mjs`: maps a URL an author can copy (YouTube, Docswell, Vimeo, X, and Instagram page URLs; the Speaker Deck `/player/<id>` URL, since a talk page does not carry the player id) to the iframe URL that service documents. One entry per service; unknown URLs stay links.
- `scripts/content_loader.mjs`: Node-side content reader shared by Vite's `virtual:site-content`, RSS generation, and prerendering. Browser-facing article bodies are rendered to `{ html, text }` at build/dev time.
- `scripts/metadataSchema.mjs`: shared article frontmatter schema and validation rules used by the loader and lint script.
- `tests/check_frontmatter.test.mjs`: metadata lint for every article Markdown file.
- `scripts/generate_metadata.mjs`: resolves `date = "auto"`, `auto_tags`, `[sumup] mode = "auto"`, `[thumbnail] mode = "auto"` (OpenAI image generation into `public/thumbnails/`), and default thumbnails, writing generated values back to Markdown. In check mode, it only performs a static unresolved-metadata check.
- `tests/check_metadata_quality.test.mjs`: static quality checks for generated tags and summaries.
- `tests/check_metadata_schema.test.mjs`: schema unit checks for valid and invalid metadata examples.
- `tests/check_generate_metadata.test.mjs`: metadata generation unit checks with a mock provider.
- `editor.html` and `src/editor/`: local-only SmartHR UI authoring entry at `/editor`, including Markdown tools for Blog/Works, structured About forms, private autosave, photo selection/capture, and save/publish status. It is separate from the production `index.html` entry.
- `editor-preview.html` and `src/editor/previewMain.jsx`: development-only iframe preview entry. It imports the public site theme and CSS, renders Blog, Works, and About page class structures, and synchronizes content and scroll position with the editor without leaking public global styles into SmartHR UI.
- `src/editor/imagePreparation.js`: converts and shrinks a picked image before it is uploaded, so HEIC photos and files over the 10MB Content API limit still reach the store. HEIC decoding pulls in `heic-to` through a dynamic import and is absent from the initial editor download. See `.decisions/2026-08-13-editor-client-side-image-conversion.md`.
- `editor/vite.config.js`: builds the editor and preview entries into `editor/dist/` without emitting published content assets or changing the public-site build.
- `scripts/editorServer.mjs` and `scripts/editorApiPlugin.mjs`: local editor server and APIs. Normal authoring serves the optimized local bundle; `editor:dev` provides HMR. Both stay on loopback while a separate Tailscale Serve HTTPS listener provides the stable bookmarked URL. API access checks the loopback proxy peer, detected Tailscale DNS host, Serve-injected node-owner login, and mutation Origin. They are enabled by editor commands, not by the production site.
- `scripts/contentCloudEditorModel.mjs` and `scripts/contentCloudClient.mjs`: schema-aware editor adapter and authenticated Worker client.
- `scripts/contentAssetsPlugin.mjs`: serves snapshot assets in development and emits them under the static public build.
- `src/readingTime.js`: estimates the reading time of a Markdown body per locale, replacing the removed `reading` front-matter field.
- `<snapshot>/src/content/works/<slug>/index.{ja,en}.md`: one work per directory inside the content snapshot, TOML front matter plus a Markdown body. The slug is the URL segment (`/app/<slug>`). Exposed as `APPS` (metadata) and `WORK_BODIES` (rendered HTML) through `virtual:site-content`. Articles and About have the same shape under `posts/` and `about/`.
- `archive/content/`: the articles, works, About, and thumbnails the repository shipped before the D1/R2 cutover. Read-only history; nothing reads it.
- `tests/fixtures/content/`: the snapshot the unit and component suites read, so they need neither credentials nor production data.
- `scripts/pull_content_snapshot.mjs`: writes a snapshot from the author API for local work (`npm run content:pull`).
- `scripts/workSchema.mjs`: front matter schema for works, separate from the article one.
- `scripts/new_work.mjs`: creates a work directory from a slug. Run it with `npm run new:work -- <slug>`.
- `src/data.js`, `src/articleBody.js`, `src/i18n.js`: browser data bootstrap, generated article body bootstrap, and localized UI strings.
- `src/content/theme.toml`: single source of truth for the light/dark color tokens (CSS custom properties), generated into CSS at build time.
- `scripts/prerender.mjs`: post-`vite build` step that bakes a per-route/per-locale `<head>` into a standalone HTML file under `dist/`, injects article title/body HTML into article route `#root`, renders every other route's body from `src/prerenderRoutes.jsx` into `#root`, and emits `sitemap.xml` + `robots.txt`.
- `scripts/build_pagefind.mjs`: post-prerender Pagefind index builder. It writes per-locale article custom records with title, summary, tags, body, and filters to `dist/pagefind/`.
- `tests/check_pagefind_search.integration.test.mjs`: smoke test for the built Japanese and English Pagefind indexes.
- `tests/check_prerendered_routes.integration.test.mjs`: smoke test asserting every prerendered route/locale bakes its primary body content into `#root`.
- `scripts/make_ogp_placeholder.mjs`: dependency-free generator for the provisional 1200x630 `public/provisional_ogp_image.png` (replace the image before launch).
- `src/reading.json`: Instapaper reading-list snapshot, generated by `scripts/fetch_instapaper.mjs` and imported by `src/data.js`.
- `scripts/instapaper_oauth.mjs`, `scripts/fetch_instapaper.mjs`, `scripts/instapaper_auth.mjs`: Instapaper Full API OAuth helpers, snapshot fetcher, and one-time token helper.
- `src/styles.css`, `src/app.css`: global styles and app-specific styles. Color tokens are NOT here — they are generated from `src/content/theme.toml` (imported as `virtual:theme.css` in `src/main.jsx`); `styles.css :root` holds only non-color tokens.
- `vite.config.js`: build config; the `tomlContent()` plugin generates `virtual:theme.css` from `theme.toml` and transforms `*.toml` imports into ES modules. Requires the `smol-toml` devDependency.
- `vitest.config.js`: test config; reuses `vite.config.js` and defines the `unit`/`integration`/`component` Vitest projects plus v8 coverage. `tests/setup.component.js` registers Testing Library matchers for the `component` project.

## Where To Make Changes

- Change frontend behavior in `src/`.
- Change build, lint, and Lighthouse configuration in the root tool config files.
- Change verification commands in `.project/verification.toml`, then keep `.project/testing.md`, `.pre-commit-config.yaml`, and `.github/workflows/ci.yml` aligned.
- Record task plans in `.plans/` and accepted structural or policy decisions in `.decisions/`.

## Areas That Require Extra Care

- The site is statically deployed; avoid adding backend requirements without an accepted decision.
- D1/R2 contain private revisions and assets. Never print their contents, identifiers, Access configuration, or device-specific editor hostnames to shared logs.
- `index.html` must point at the Vite entry `src/main.jsx`, and it holds the `<!-- OG:START -->`/`<!-- OG:END -->` markers that `scripts/prerender.mjs` rewrites per route — keep them intact.
- `npm run build` runs `vite build && node scripts/prerender.mjs && node scripts/build_pagefind.mjs` and produces a multi-file `dist/` (route directories + `sitemap.xml` + `robots.txt` + `pagefind/`). Routing, links, metadata, and search indexes are path/locale based — see `.decisions/ogp-path-routing.md`.
- Cloudflare Pages relies on its default SPA fallback (no top-level `404.html`, no `_redirects` catch-all) so prerendered files are not shadowed.
- Search uses the generated Pagefind static index; keep `scripts/build_pagefind.mjs` and `tests/check_pagefind_search.integration.test.mjs` aligned when indexed fields change.
- Article Markdown must use the front matter shape documented in `.project/metadata.md`; `tests/check_frontmatter.test.mjs` (in the `test_unit` phase) fails on legacy or invalid metadata.
