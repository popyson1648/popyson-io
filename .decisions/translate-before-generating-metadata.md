# Decision

## Title

The publication translates before it generates metadata, and the publish check never asks for English

## Date

2026-08-14

## Status

Accepted

## Decision

`.github/workflows/content-publish.yml` runs `Translate the Japanese source` before
`Generate post metadata`. The editor's publish check (`serializeEditorMarkdown` via
`validateCloudContent`) requires prose — a title and a body — from the Japanese locale only,
through a `requireText` option on the metadata and work schemas. Everything that reads finished
content, the site build and the candidate verification among them, keeps the default and stays
strict.

## Context

The author writes Japanese; English is written by the publication's translation step. That was
already true for About (PR #141), but Blog and Works still failed two ways.

`scripts/generate_metadata.mjs` reads both locales of a post and derives tags, a summary and a
thumbnail concept from the body it is given, per locale. It also parses front matter with
validation before doing anything. With metadata generation ahead of translation it read an
English file that was still empty and exited in ~0.3s on
`index.en.md: title: must be a non-empty string`. The workflow suppresses that step's output
because it may contain source text, so the run reported only "Metadata generation failed".

Before content moved to D1/R2, English was written by a push-triggered `translate-content`
workflow and metadata generation ran afterwards, over files that had prose in both locales.
The database publication path inherited the generator but not that order.

Separately, the editor's own publish check called the schemas with their defaults, so a post or
work with no hand-written English title could not clear the publish dialog at all.

## Alternatives

- Skip the English file in metadata generation, and have the translation step fill tags, summary
  and thumbnail. The pipeline would then depend on a prompt to satisfy a schema, and
  `metadata:generate --check` in the candidate verification would fail whenever it did not.
- Relax the schemas everywhere instead of behind `requireText`. A post with an empty English
  title would then build and ship a blank heading; the strictness is what catches a translation
  that silently did nothing.
- Generate metadata twice, before and after translation. Doubles the AI calls and the ways the
  two runs can disagree.

## Reason

Ordering translation first restores the invariant the generator was written against and needs no
new coupling between the two steps. Both locales end up with the same shape they had under the
old pipeline: per-locale tags and summary, one shared thumbnail, `generated = true` markers.

## Consequences

- The Japanese source reaching the translation step still holds unresolved metadata
  (`auto_tags`, `date = "auto"`, `[sumup] mode = "auto"`). The prompt tells the translator to
  copy those tables across untouched; the generator resolves them afterwards for both locales.
- The two boundary checks moved with their steps, so each still measures the checksums taken
  immediately before the step it guards.
- `tests/check_content_workflows.test.mjs` pins the order and the checksum placement.
- An English title may be empty in the editor. It is filled in by publication, so what the
  editor shows before the first publication is a blank English title — that is the same state
  About has shown since PR #141.

## Revisit Conditions

- Metadata generation stops deriving anything from the English body, at which point the English
  file no longer needs to exist when it runs.
- Translation moves out of the publication workflow.
