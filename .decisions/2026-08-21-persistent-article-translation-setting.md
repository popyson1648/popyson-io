# Decision

## Title

Persist optional translation per Blog article

## Date

2026-08-21

## Status

Accepted

## Decision

Each Blog article stores `translation_enabled` on `content_items`, independently
of its immutable revisions. New articles default to enabled. The editor exposes
the value as `英語に翻訳する` in that article's gear → publication settings.
Works and About always translate and do not expose the setting.

A publication job copies the saved value to `publish_job_items`, and a release
copies it to `release_items`. The pending-publication checksum includes the
value, so changing only this setting produces a pending update and a stale
preflight cannot publish the previous value. The batch publication dialog shows
the pinned choice but cannot edit it.

Existing Blog items and release items whose current revision has
`translation.en = "japanese-source"` are migrated to disabled. Other existing
rows keep the enabled default.

The publication fallback and public-site notice remain unchanged: a disabled
article uses its Japanese source on the English route, and that route shows the
small muted `This page is only available in Japanese.` notice above the title.

## Context

The first optional-translation implementation made the value a one-publication
choice in the batch confirmation dialog. Authors need to make this decision in
the context of one article and keep it across later edits and publications.

## Alternatives

- Keep the value on the publication job only. This requires reselecting it for
  every publication and puts an article setting in a batch operation.
- Store the value in revision metadata. Restoring an old revision would also
  restore an unrelated publication policy and could silently re-enable costly
  translation.
- Apply the setting to Works and About. There is no current product requirement
  for Japanese-only versions of those content kinds.

## Reason

`content_items` represents the author's current publication policy, while
revisions represent immutable document history. Pinning that policy into jobs
and releases preserves deterministic retries and records exactly what the
deployed site contains.

## Consequences

- The setting survives edits, revision restores, and reopening the editor.
- Changing only the setting requires a publication before the static site
  changes.
- The batch dialog is a final review of the saved state, not a second settings
  surface.
- D1 migration `0005_persistent_article_translation.sql` must run before the
  matching Worker is deployed.

## Revisit Conditions

- Works or About need optional translation.
- Translation policy needs more states than translated or Japanese-only.
- Articles need independent policy per published revision rather than a current
  authoring policy.
