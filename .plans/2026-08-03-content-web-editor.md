# Plan

## Goal

Add a simple, responsive web editor for authoring the repository's bilingual Blog posts and Works. The editor runs as a local server, reads and writes the existing Markdown/TOML files, and provides an accurate live preview using the site's current Markdown rendering pipeline.

## Scope

- Add an `npm run editor` command that starts the Vite application with local content-editor APIs enabled.
- Serve the editor at `/editor` without changing the public site's existing routes or static deployment model.
- Use `smarthr-ui` (the `kufu/smarthr-ui` package) and its required providers/peer dependencies for editor controls and feedback.
- List, create, open, and save both content kinds:
  - Blog posts under `src/content/posts/<post-id>/index.{ja,en}.md`.
  - Works under `src/content/works/<slug>/index.{ja,en}.md`.
- Provide schema-aware metadata forms:
  - Blog: title, date, tags, kana, summary mode/text, automatic tags, and thumbnail mode/path.
  - Works: title, tagline, summary, year, stack, thumbnail, and hero, while keeping shared fields Japanese-source-only.
- Provide Japanese/English locale switching with an unsaved-change indicator.
- Provide a Markdown writing surface with:
  - keyboard shortcuts for save, bold, italic, and link;
  - toolbar insertion for headings, emphasis, links, images, quotes, lists, task lists, code, tables, and the site's callouts;
  - character count, line count, and estimated reading time;
  - undo/redo through native textarea behavior.
- Provide debounced live preview through the existing server-side Markdown renderer, including GFM, callouts, safe URLs, and Shiki syntax highlighting.
- Provide image upload by file selection, drag-and-drop, and clipboard paste. Store validated raster images in the content's prescribed asset directory:
  - Blog: `src/content/posts/<post-id>/assets/`.
  - Works: `src/content/works/<slug>/assets/`.
- Add a deterministic content-asset pipeline that serves those source assets in development and copies them into the production build below `/content-assets/<kind>/<id>/`. Insert that stable site-absolute URL into Markdown so editor preview and published pages use the same reference.
- Prevent accidental overwrites with dirty-state navigation warnings and revision-based conflict detection when a file changes on disk after it was opened.
- Add responsive behavior:
  - Desktop: content sidebar, metadata panel, and resizable write/preview workspace with write, split, and preview modes.
  - Mobile: stacked screens, sticky actions, horizontally scrollable formatting controls, and explicit write/preview switching.
- Protect write APIs with a random token generated for each editor-server run. Bind to the local network by default for phone access and document an explicit loopback-only option.
- Add a `Save and publish` action for the content currently open in the editor:
  - save and validate both locale files;
  - run the repository's standard verification;
  - stage only that content directory, including its `assets/` files;
  - create the existing content-style commit message and push the current branch through the existing configured remote/upstream rules;
  - stream progress and return actionable verification, Git, and push errors in the UI.
- Keep `Save` and `Save and publish` as separate explicit actions, with a confirmation dialog before publishing and protection against concurrent publish jobs.
- Add component, unit, and API-level tests for editor state, serialization, path validation, preview, save conflicts, uploads, and responsive controls.
- Update contributor documentation for setup, commands, phone access, saved file locations, security boundaries, and supported Markdown.
- Record the accepted local-editor architecture and security boundary under `.decisions/`.

## Non-goals

- Authentication, accounts, multi-user collaboration, a database, or remote hosted authoring.
- Git merge, metadata generation, or AI translation from the editor UI.
- Changing the production website to require a backend.
- Raw HTML, MDX, Mermaid, embedded executable content, or Markdown syntax not supported by the current site renderer.
- Deleting posts or Works from the editor.
- Editing About, Reading, theme, prompt, or metadata configuration files.

## Assumptions

- The editor is an authoring aid for this checked-out repository; saving means writing the existing content files and uploaded assets to the working tree.
- Japanese and English files continue to be created together, but each locale may be edited independently.
- Manual save is authoritative. A small browser recovery draft may be kept locally to recover from refresh/crash, but it does not write repository files until the user saves.
- `smarthr-ui` version 99 is compatible with the repository's React 19 setup; required `react-intl` and `styled-components` peer dependencies will be added.
- Phone access is expected on a trusted local network. The standard command binds to the LAN and retains per-run token protection; authors can explicitly request a loopback-only bind.
- Uploaded images are limited to PNG, JPEG, WebP, and GIF with a conservative size limit; SVG and arbitrary files are rejected. Names are sanitized and collisions receive deterministic suffixes instead of overwriting an existing asset.
- Publishing is intentionally limited to the currently open Blog post or Work. Existing staged changes outside that content directory, a detached branch, a missing upstream/remote, verification failures, and push failures stop the operation without widening the Git scope.
- The editor never merges a branch. A successful publish means commit and push to the current branch, matching the repository's existing content publishing behavior.

## Steps

1. Add and document the accepted editor-server architecture, content API contract, asset URL/build mapping, publish boundary, session-token handling, and frontend route isolation.
2. Refactor the existing post/work scaffold and frontmatter serialization logic into reusable, tested modules without changing current CLI behavior.
3. Implement the editor server entry point and token-protected APIs for listing, reading, creating, previewing, saving, uploading assets, and publishing the current content item.
4. Add a development-only `/editor` frontend entry, SmartHR UI providers, responsive application shell, content navigation, and loading/error/empty states.
5. Build the schema-aware metadata forms, locale switching, draft model, dirty/conflict handling, keyboard shortcuts, and save feedback.
6. Build the Markdown toolbar, selection transforms, drag/paste upload flow, live preview, writing metrics, and desktop/mobile layout modes.
7. Add separate save/publish actions, confirmation and progress UI, single-item Git scoping, verification execution, commit/push integration, and failure recovery.
8. Add focused unit/component/API tests, update project documentation, and keep verification configuration aligned if new checks are introduced.
9. Run formatting, linting, type checking, unit/component/integration tests, production build, static accessibility checks, and manual desktop/mobile browser verification. Review the final diff for security, regressions, maintainability, and production bundle impact.

## Verification

- `npm run format`
- `python3 scripts/verify.py`
- Start `npm run editor`, then verify create/open/edit/preview/save/reload for one Blog post and one Work without committing the temporary content changes.
- Upload, paste, and drag one image into each content kind; verify the source file lands in that entry's `assets/` directory and the same stable URL renders in editor preview, Vite development, and the production build.
- Verify invalid slugs, traversal attempts, unsupported uploads, invalid metadata, stale revisions, and missing/incorrect tokens are rejected without modifying files.
- Exercise publishing against a disposable local Git remote: verify only the open entry and its assets are staged, verification runs before commit, the expected content-style commit is pushed, and failures leave unrelated files and staged changes untouched.
- Verify the public production build has no active editor write API and existing About, Blog, Works, Reading, article, RSS, and English routes still build and render.
- Inspect the editor in desktop and phone-sized viewports, including keyboard navigation, visible labels, focus behavior, overflow, editor/preview switching, uploads, and save status.

## Open Issues

- None. AI-assisted metadata and translation remain in the existing CLI/CI workflows. The editor publish action reuses the repository's verification and Git rules but never merges branches.
