# Plan

## Goal

Refine the local Blog and Works editor into a focused, production-grade authoring experience. Preview must use the same rendering, structure, typography, colors, and responsive rules as the public site; images must be selectable from the operating system photo library or captured with the device camera; and drafts must be saved locally without changing or exposing the public content tree until the author explicitly publishes.

## Scope

- Replace the editor-only preview styling with a development-only preview frame that imports the public site's actual `styles.css`, generated theme tokens, and `app.css`.
- Render Blog and Works previews with the same DOM classes and presentational components used by their public pages, including title, metadata, tags or stack, body, code blocks, callouts, tables, images, responsive spacing, and dark/light theme.
- Keep the existing server-side Markdown renderer as the single Markdown-to-HTML implementation.
- Provide editor/preview/split modes, a resizable desktop split, explicit desktop/mobile preview widths, and proportional editor/preview scroll synchronization.
- Keep SmartHR UI as the component system. Reorganize the interface around one primary `Publish` action, one secondary `Save draft` action, a compact document-status indicator, and metadata/settings that do not compete with the writing surface.
- Add debounced local autosave after editing pauses, while retaining explicit `Save draft` and `Ctrl`/`Cmd` + `S` actions. Show `Unsaved`, `Saving`, `Saved at …`, `Conflict`, and `Publish failed` states.
- Add a local-only `.drafts/` root directory, ignored by Git, with mirrored content structure and assets:
  - `.drafts/posts/<post-id>/index.{ja,en}.md`
  - `.drafts/posts/<post-id>/assets/`
  - `.drafts/works/<slug>/index.{ja,en}.md`
  - `.drafts/works/<slug>/assets/`
- Treat existing public content as the base revision. Opening an item prefers its saved draft when present; saving creates or updates only the draft copy. New items exist only as drafts until publishing.
- Merge published content and local drafts in the sidebar and label each item as `Draft`, `Published`, or `Published · draft changes`.
- On publish, validate the complete locale pair, promote only the selected draft and its assets into `src/content/`, run standard verification, commit and push only that content directory, and remove the local draft only after a successful push. Never merge.
- Serve draft assets at the same final `/content-assets/<posts|works>/<id>/<file>` URL while the editor server is running, preferring the draft asset over the public asset. This avoids rewriting Markdown at publish time while keeping draft files out of production builds.
- Replace the single image action with two explicit SmartHR UI actions backed by separate native file inputs:
  - `Choose photos`: `accept="image/*"`, `multiple`, no `capture`, allowing the OS photo library/file picker.
  - `Take photo`: `accept="image/*"`, `capture="environment"`, requesting the rear camera where supported.
- Retain desktop drag-and-drop and clipboard paste. Insert every uploaded image at the current caret with a useful default alt text, show per-file progress/errors, and keep the current 10 MB validation and safe filename collision behavior.
- Keep the editor and preview entries development-only and absent from the production build.
- Update the architecture decision, contributor documentation, metadata documentation, tests, and verification coverage.

## Non-goals

- A hosted editor, authentication system, cloud draft storage, cross-device draft sync, or multi-user collaboration.
- Replacing Markdown with a block or rich-text document format.
- Copying the visual identity or proprietary assets of Zenn, Qiita, Medium, Ghost, or WordPress.
- Image cropping, annotation, gallery layout, remote stock-photo search, or video/audio capture.
- Scheduling, limited-share URLs, review comments, revision history, or automatic translation.
- Guaranteeing direct camera launch on every browser; HTML Media Capture is a user-agent hint.
- Supporting image formats the current site cannot render consistently across target browsers. Unsupported selections receive an actionable error without writing a file.

## Assumptions

- `Private save` means a durable local draft that is not present in `src/content/`, the production bundle, Git status, commits, or pushes until `Publish` is explicitly confirmed.
- `.drafts/` is permanent local authoring data rather than temporary build output. It must be added at the repository root because it mirrors publishable content and assets, and it must be added to `.gitignore` to prevent accidental disclosure in this public repository.
- Local drafts are not backed up or synchronized. The UI and documentation will make that boundary explicit.
- Published items may have unpublished draft revisions without changing what the public site or ordinary `npm run dev` renders.
- Native file inputs are necessary to invoke OS-owned photo-library and camera surfaces; SmartHR UI buttons remain the visible controls.
- On iOS and Android, the exact chooser and camera presentation is controlled by the browser and operating system. A separate non-capture input preserves photo-library choice, while the capture input requests the environment-facing camera.
- The public site remains the source of truth for preview presentation. Editor-specific CSS may size or frame the preview but must not restyle article content.
- Blog and Works previews should both match their corresponding public detail pages.

## Steps

1. Record the local draft-store and isolated exact-preview decisions, including the new root `.drafts/` directory, Git exclusion, security boundary, and publish lifecycle.
2. Extract or share presentational Blog/Works detail components so the public routes and preview frame use the same markup and CSS without duplicating styles.
3. Add a separate development-only preview entry and token-protected route. Connect it to the editor with same-origin `postMessage`, validated message shapes, and the existing server-rendered safe HTML.
4. Implement full Blog/Works preview data mapping, public theme parity, desktop/mobile frame widths, responsive behavior, copy-code interaction, and proportional scroll synchronization.
5. Add the `.drafts/` model and APIs for merged listing, copy-on-write opening, draft creation, revision-safe autosave, draft asset resolution, and draft cleanup after successful publish.
6. Change publish orchestration to promote exactly one draft into the public content directory, preserve unrelated/staged work, validate both locales, run verification, commit/push the selected item, and retain the draft on every failure.
7. Rework the SmartHR UI information architecture: focused title/body canvas, compact status, metadata/settings panel, one primary publish action, secondary draft save, responsive sidebar/drawer, and clear empty/error/offline states.
8. Add separate photo-library and camera controls using native file inputs behind SmartHR UI buttons. Retain paste/drop, multi-select insertion, asset validation, progress, and accessible alt-text defaults.
9. Add unit, component, API, integration, responsive, accessibility, and production-isolation tests. Update `.project/` documentation and keep verification configuration aligned if new commands are introduced.
10. Run repository verification, production-bundle inspection, and manual browser checks on desktop plus phone-sized touch emulation. When a physical phone is available, verify the native photo-library and camera chooser behavior over the trusted LAN.

## Verification

- `npm run format`
- `python3 scripts/verify.py`
- Verify `npm run build` contains neither editor nor preview entries, APIs, draft files, nor editor-only CSS/JS.
- Compare a representative Blog article and Work between the public route and editor preview at desktop and mobile widths, including title, metadata, headings, lists, links, tables, callouts, code highlighting/copy controls, and uploaded images.
- Verify light/dark theme parity and that public-style imports cannot leak into or override SmartHR UI controls.
- Verify editor/preview/split switching, split resizing, scroll synchronization, keyboard navigation, focus visibility, reduced motion, and no horizontal overflow.
- Verify `Choose photos` opens a non-capture image picker and supports multiple files; verify `Take photo` exposes the environment-camera capture hint and processes the resulting file.
- Verify image selection, camera result, drag/drop, and paste all write only to the selected draft asset directory before publish and render through the stable final asset URL.
- Verify autosave and explicit draft save survive reload, keep public Markdown byte-identical, do not appear in a normal production build, and do not appear in Git status.
- Verify new drafts, published content, and published content with draft changes are listed and opened correctly.
- Verify stale revisions and concurrent writes fail without overwriting a newer draft.
- Verify publishing promotes only the selected item, includes its assets, removes the draft only after a successful push, and retains the draft after validation, verification, Git, or push failure.
- Verify missing/incorrect editor tokens, path traversal, malformed preview messages, unsupported image bytes, oversized images, and draft asset traversal are rejected.

## Open Issues

- None. The user approved the local-only `.drafts/` boundary and implementation plan.
