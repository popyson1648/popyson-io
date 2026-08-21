# Decision

## Title

Store optional translation on the publication job and preserve a Japanese-source marker

## Date

2026-08-21

## Status

Superseded by `2026-08-21-persistent-article-translation-setting.md`

## Decision

The batch publication dialog offers a translation checkbox for every public
addition or update. It is enabled whenever the dialog opens. The selected value
is pinned on `publish_job_items`, participates in the request idempotency key,
and is returned in the immutable job snapshot.

An enabled item is the only kind sent to an AI translation provider. For a
disabled item, publication deterministically uses the Japanese source in the
English source slot. Blog metadata is resolved once from the Japanese file and
then synchronized to the English file. The candidate revision metadata records
`translation.en = "japanese-source"`; materialized releases expose that state in
a generated `src/content/publication.json` manifest.

The public Blog article view reads that marker. On the English route only, it
renders `This page is only available in Japanese.` immediately above the title,
using the existing caption size and muted text color. Japanese routes and
translated articles render no notice.

## Context

The publication workflow previously translated every public item in a batch.
Large posts could keep the workflow busy even when the author did not need an
English version. The static site still requires both locale source slots, so
omitting the English file would break loading, metadata generation, prerendering,
and route parity.

## Alternatives

- Persist a translation preference on the content item. This would make a
  one-publication choice unexpectedly affect later revisions.
- Remove untranslated items from English routes. This requires a broader
  locale-aware content model, navigation, sitemap, search, and hreflang change.
- Infer untranslated content by comparing the Japanese and English files. This
  can mislabel intentionally identical content and loses the author's explicit
  publication choice.
- Leave the old English source untouched. A new Japanese-only article may not
  have a usable English source, and an update could show stale content.

## Reason

Pinning the choice with the publication job preserves retry determinism without
changing authoring revisions. Copying Japanese into the required English slot
keeps the existing static build contract. An explicit revision marker carries
the decision through later release downloads without relying on source-text
heuristics. The small English-only notice communicates the fallback while
remaining consistent with the site's current visual language.

## Consequences

- Reopening the publication dialog resets every eligible item to translation
  enabled.
- Mixed batches translate only their enabled items; an all-disabled batch skips
  both translation providers.
- English routes remain valid for untranslated items but display Japanese title,
  metadata, and body content with the availability notice.
- Release snapshots contain a generated publication manifest in addition to the
  locale source files.
- Older publication requests and legacy single-item jobs default to translation
  enabled.

## Revisit Conditions

- The product needs untranslated content hidden completely from English routes.
- Translation preference should persist across revisions rather than publication
  attempts.
- The site content model no longer requires both locale source slots.
