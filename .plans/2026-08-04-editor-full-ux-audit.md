# Plan

## Goal

Bring the local Blog/Works editor up to the interaction quality and operational
safety expected from mature publishing products, across the complete workflow
from starting a draft through confirmed production publication.

## Research Baseline

- Developer publishing: Qiita, Zenn, Hashnode, and GitHub's Markdown editor.
- Creator publishing: note, Medium, Substack, and Ghost.
- General blog CMS: WordPress and Hatena Blog.
- Accessibility behavior: WAI-ARIA toolbar, toggle-button, dialog, and
  adjustable-separator patterns.
- Repository-specific behavior: the current editor UI, draft model, image API,
  publish script, deployment workflow, desktop layout, 768 px boundary, and
  320/390 px phone layouts.

## Findings That Must Be Addressed

### P0: correctness and publication safety

- Formatting commands currently add markers repeatedly and have already
  produced malformed Markdown in a saved draft.
- Heading, quote, list, task, and link commands also accumulate syntax instead
  of transforming or removing the active format.
- A multi-image upload can write some assets and then fail before inserting any
  Markdown, leaving successful files orphaned and invisible to the author.
- Publishing promotes the draft into `src/content` before verification. A
  failed verification therefore leaves the public-content working tree changed.
- "Publish succeeded" currently means that Git push succeeded. The site deploy
  runs only for `main`, so pushing another branch does not publish the site, and
  a successful push does not prove that the deployment completed.
- At widths from 761 through 900 px the UI still offers and selects Split mode,
  while CSS hides the preview pane. This is another non-functional mode state.

### P1: core authoring and recovery UX

- The plain controlled textarea does not provide a dependable shared history
  for typed and toolbar-generated edits, active syntax context, editor search,
  bracket handling, or command transactions. Use a Markdown-aware editor
  engine while retaining SmartHR UI for application controls.
- Formatting controls do not expose active/pressed state. Links insert a URL
  placeholder but leave the label selected, and pasting a URL over selected
  text does not create a link.
- There is no undo/redo UI, shortcut reference, preview shortcut, or keyboard
  route from the writing surface to the formatting toolbar.
- The toolbar has fifteen Tab stops rather than one managed toolbar stop, and
  its toggle controls have no `aria-pressed` state.
- The mobile toolbar occupies about 288 px at 390 px width. It avoids horizontal
  scrolling but pushes the writing surface down excessively. It needs compact,
  multi-row, non-scrolling controls with a clear primary/insert-action split.
- Mobile hides the persistent save state, and its empty-state copy incorrectly
  refers to a list on the left.
- The mobile content drawer has no modal semantics, focus containment, Escape
  handling, or inert background. Focusable page actions remain reachable behind
  it.
- The split resize control lacks separator/slider value semantics even though it
  supports arrow keys.
- Save conflicts only report "reload before saving". There is no safe compare,
  reload, local-copy, or recovery action.
- Autosave overwrites the only draft version. There is no rolling history or
  restoration UI, despite accidental formatting and overwrite being realistic
  failure modes.
- There is no explicit discard/revert/delete-draft flow, nor a clear notice that
  `.drafts/` is local-only and is not a backup.
- Required metadata is hidden inside a collapsed panel and is validated only at
  the publish boundary. Errors are global messages instead of field-level
  guidance and a publish-readiness summary.
- The publish confirmation omits target branch, production effect, changed
  files/diff, locale readiness, final title/URL, validation status, and a
  phase-specific progress/result display.
- Image selection accepts every `image/*` client-side while the server accepts
  only PNG, JPEG, GIF, and WebP. Photos selected from an OS album can therefore
  fail late for HEIC or other formats.
- Uploaded images get a filename-derived alt value without an immediate alt-text
  editing step. There is no per-file result, retry/cancel, asset browser, or
  intentional cleanup workflow.
- A single global message channel is shared by preview, save, upload, conflict,
  and publish operations, allowing unrelated asynchronous results to replace one
  another.

### P2: valuable publishing capabilities

- Draft/published/scheduled/deleted views, search, status filters, and recoverable
  trash for a content library that will grow.
- A document outline with heading navigation, structural warnings, and reading
  metrics for long articles.
- Slash-command or contextual insertion for blocks, code-language selection,
  URL embeds, and fast insertion without a permanently oversized toolbar.
- Tag suggestions and deduplication using tags already present in the repository.
- Full-window preview and, if useful for review outside the authoring device, a
  deliberately scoped temporary preview link. The local-only security model must
  not be weakened silently.
- Scheduling only if the site's deploy/content model gains a supported scheduled
  publication mechanism. A date field alone must not pretend to schedule a deploy.
- Draft templates or duplication for recurring article/work structures.

## Features Not Planned for This Local Single-Author Editor

- Real-time collaboration, editorial roles, comments, approval workflows, and
  shared cursors.
- Newsletter delivery, subscriber segmentation, paywalls, monetization, and
  audience analytics.
- AI writing or automatic rewriting controls.
- Social-network distribution controls.

These were included in the product survey but do not serve the repository's
local, single-author publishing workflow.

## Proposed Implementation Scope

1. Make publication transactional, branch/deploy aware, phase-specific, and
   truthful about whether production is actually live.
2. Replace the plain textarea with a Markdown-aware editing engine, keeping
   SmartHR UI for the surrounding application. Implement one undoable command
   model for typing, toolbar actions, paste, and image insertion.
3. Rebuild formatting and link behavior as context-aware transforms with active
   states, repeat-to-remove behavior, URL paste, shortcuts, and regression tests.
4. Rework image upload as a validated per-file queue. Insert every successful
   upload deterministically, surface partial failure, support album/camera formats
   intentionally, and provide alt-text and asset-management affordances.
5. Add rolling local draft history, restore/compare/conflict recovery,
   discard/revert/delete actions, and explicit local-only backup messaging.
6. Promote title and essential readiness fields into the primary writing flow;
   add field-level validation, tag assistance, and a complete publish preflight.
7. Rebuild responsive behavior from shared breakpoints. Keep desktop split,
   remove Split anywhere it cannot render, compact the non-scrolling mobile
   toolbar, retain visible save state, and implement an accessible mobile drawer.
8. Add content-library search/status management, outline navigation, shortcut
   help, toolbar focus management, and accessible resize semantics.

## Verification

- Unit-test all editing transformations in both apply and remove directions,
  nested selections, paste-as-link, selection preservation, and undo/redo.
- API-test all-or-partial image results, supported/unsupported album formats,
  collision handling, retry, and cleanup rules.
- Fault-inject save conflicts, failed validation, failed verification, failed
  commit, failed push, and failed deployment; confirm no false success and no
  unintended public-tree mutation.
- Browser-test 320, 390, 768, 900, and desktop widths, portrait and landscape,
  touch and keyboard navigation, drawer focus, toolbar focus, image library and
  camera inputs, and exact Blog/Works preview parity.
- Verify draft history restore and conflict recovery without losing either the
  local edit or newer disk content.
- Run `python3 scripts/verify.py`, focused component/API suites, automated
  accessibility checks, and manual WAI-ARIA interaction checks.

## Open Issues

- Approved and implemented on 2026-08-05, including rolling local history in
  the first hardening pass.
- The editor can confirm a successful push to `main`, but the repository does
  not expose a deployment-status API. It therefore reports deployment as
  pending and never claims that production is already live.
- Scheduling remains intentionally unavailable until the content/deployment
  model has a real scheduled-publication mechanism.
