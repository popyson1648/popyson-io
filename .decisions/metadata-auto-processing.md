# Decision

## Title

Article Metadata Auto-Processing Foundation

## Date

2026-06-18

## Status

Accepted

## Decision

Article Markdown front matter is validated by a shared schema in
`scripts/metadataSchema.mjs`.

The content loader and the standalone frontmatter check both use that schema.
The generator resolves metadata and writes it back to Markdown:

- `date = "auto"` resolves from the git commit that first added the Markdown file.
- `auto_tags` calls Gemini structured-output generation and appends the requested number of usable non-duplicate tags.
- `[sumup] mode = "auto"` calls Gemini structured-output generation and becomes `mode = "text"` with `generated = true`.
- `[thumbnail] mode = "none"` resolves to the default path in `src/content/metadata.toml`.
- `[thumbnail] mode = "file"` keeps its explicit `path`.

The loader also validates metadata at build time and keeps defensive fallbacks
for unresolved deterministic values, but CI requires `scripts/generate_metadata.mjs
--check` so committed content is already generated. The check is static and does
not call the AI provider.

Gemini uses the documented REST `generateContent` endpoint with the API key from
`GEMINI_API_KEY`, prompt files as `systemInstruction`, fixed low-variance
generation settings, and JSON structured output. Literal key values must never
be committed. GitHub Actions receives the key only for workflows that
intentionally generate metadata.

## Context

Issue #39 defines a richer metadata model where humans can provide explicit
values and automated processing can fill gaps later.

The current site already consumes `post.summary`, `post.tags`, `post.date`, and
related fields from `scripts/content_loader.mjs`. Keeping that output contract
stable limits the blast radius while replacing the legacy `summary = "..."`
front matter with `[sumup]`.

## Alternatives

- Keep generated values only in build memory.
- Defer the AI tag and summary engine.
- Keep validation only in the loader.

## Reason

Writing generated values back keeps content files reviewable and makes normal
builds deterministic after generation.

The generator uses a thin provider interface so tests can inject mock responses
without calling Gemini.

Prompt previews and static metadata quality checks make the AI step reviewable:
prompts can be inspected without network calls, and generated tags/summaries are
checked for length, markup, duplicates, and basic locale shape before build.

CI does not call Gemini during normal verification. This avoids cost, rate-limit,
secret-availability, and nondeterminism risk while still requiring generated
values to be committed.

Using one schema module prevents the lint script and loader from diverging.

## Consequences

CI must checkout full git history so `date = "auto"` can resolve first-add commit
dates when generation checks evaluate unresolved files.

Normal CI does not require `GEMINI_API_KEY`. A separate generation workflow may
need that Actions secret if it intentionally resolves `auto_tags` or `[sumup]
mode = "auto"` metadata.

The app receives `post.thumbnail`, but the UI does not render thumbnails yet.

## Revisit Conditions

Revisit this decision if generated metadata needs multi-pass evaluation,
regeneration scoring, or a different provider.
