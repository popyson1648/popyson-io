# Decision

## Title

Keep editor drafts local and render previews in an isolated public-style frame

## Date

2026-08-04

## Status

Accepted

## Decision

The content editor stores private work under the Git-ignored `.drafts/` root,
mirroring the published `posts/` and `works/` structure. Saving and autosaving
write only this local tree. Existing published content is copied to the draft
tree on the first write. Publishing validates both locales and promotes only the
selected draft to `src/content/`; the draft is removed only after the commit is
pushed successfully.

The editor renders Blog and Works preview pages in a separate development-only
iframe entry. That entry imports the public theme tokens, typography, and app
styles and follows the public detail-page DOM class contract. The iframe isolates
those global styles from SmartHR UI. Its content and proportional scroll position
are synchronized with the editor by validated same-origin messages.

## Context

Authors need incomplete and unpublished work to survive browser reloads without
appearing in the deployed site, Git status, commits, or pushes. They also need a
preview faithful enough to make layout decisions on desktop and phone widths.
Importing public global CSS into the SmartHR UI document would cause style
collisions, while maintaining a second article stylesheet would drift.

## Alternatives

- Save drafts directly under `src/content/` and rely on Git discipline.
- Store drafts only in browser storage.
- Reimplement the public article appearance with editor-specific CSS.
- Load editor code conditionally from the public application entry.

## Reason

The local mirrored tree provides durable filesystem saves while enforcing a
clear publication boundary. Stable asset URLs avoid Markdown rewriting during
promotion. The iframe reuses the public visual system without allowing its global
rules to alter SmartHR UI, and separate HTML entries keep all editor code out of
the production bundle.

## Consequences

- Drafts are local to one checkout and are not backed up or synchronized.
- Deleting `.drafts/` permanently discards unpublished work unless recovered by
  an operating-system backup or trash mechanism.
- Camera launch remains controlled by the browser and operating system; the
  capture input can only request the environment-facing camera.
- Preview markup must remain aligned with public Blog and Works detail markup
  when those public pages change.
- Production builds must continue to use only `index.html` as their Vite entry.

## Revisit Conditions

- Revisit when authoring requires cloud backup, collaboration, review links, or
  editing across devices.
- Revisit the iframe boundary if the public detail pages move to a reusable
  component package with fully scoped styles.
