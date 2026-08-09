# Decision

## Title

Use a writing-first hierarchy and SmartHR semantic visual tokens for the local editor

## Date

2026-08-09

## Status

Accepted

## Decision

Keep SmartHR UI as the editor's component system while restructuring the visible
interface around the document. Remove editor branding and ornamental empty-state
content, keep Publish as the single Primary action, group secondary document
management in an overflow menu, and place one persistent grouped formatting
toolbar above the complete write/preview workspace.

Use SmartHR product color, spacing, radius, and shadow semantics. Default to
border-led flat surfaces; reserve color for action/state and shadows for actual
overlapping layers. The public-site preview remains visually isolated and unchanged.

## Context

The first editor implementation exposed the required publishing features, but the
title, modes, metadata, history, formatting, images, save state, and publish actions
had similar visual weight. Its custom mint accents, rounded containers, decorative
empty state, and branded heading did not support a private single-purpose editor.
At 390 px, header content could also displace the content-list control.

Research across Medium, Ghost, Notion, WordPress, Confluence, Substack, Zenn, and
Qiita consistently favored a dominant writing canvas, progressive disclosure of
secondary controls, calm autosave feedback, and a distinct publish review step.
Confluence's user feedback also showed that a purely floating toolbar can become
unpredictable, so this editor retains a persistent toolbar as previously requested.

## Alternatives

- Copy Medium's floating selection toolbar and line-level insertion controls.
- Keep all document and formatting actions as bordered buttons in the main flow.
- Replace SmartHR UI or apply another product's component library and palette.
- Convert the Markdown editor to a WYSIWYG/block editor.

## Reason

The chosen hierarchy keeps every current Markdown feature discoverable without
horizontal toolbar scrolling while reducing competing chrome. SmartHR's own
semantic rules match the existing component behavior and avoid mixing unrelated
visual systems. It also fixes the compact layout without changing the content,
draft, preview, or publishing models.

## Consequences

- Desktop formatting controls occupy one shared row above both panes.
- Mobile formatting controls use a grouped grid with normal touch targets.
- History and discard/revert move under `Other`; Outline remains directly visible.
- Save detail moves from the compact top bar to the document context row.
- The editor-specific CSS uses named semantic tokens and very limited elevation.
- Formatting remains Markdown-based and visible rather than contextual WYSIWYG.

## Revisit Conditions

- User testing shows that persistent formatting controls still take too much space.
- Additional document actions make the single overflow group difficult to scan.
- SmartHR UI introduces official editor, toolbar, or application-shell components.
- The repository adopts a block-based content model instead of Markdown files.
