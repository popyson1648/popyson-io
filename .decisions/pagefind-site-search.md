# Decision

## Title

Use Pagefind for static site search

## Date

2026-06-18

## Status

Accepted

## Decision

Use Pagefind as the blog search engine. Generate per-locale article custom records after route prerendering and connect the existing blog combobox to the generated Pagefind JavaScript API.

## Context

The previous browser search used a local `softmatcha2Search.js` adapter over bundled post text. Article bodies are now rendered during the build, so a static post-build index can use the same title, summary, tag, and body source data that is deployed.

## Alternatives

- Keep the local browser search adapter.
- Use a hosted search service.
- Build a custom post-build indexer.

## Reason

Pagefind keeps search static, removes custom scoring code from the client bundle, and supports language-specific indexes for the Japanese and English route trees.

## Consequences

- `npm run build` must run Pagefind after prerendering.
- `scripts/build_pagefind.mjs` must keep Pagefind content, metadata, and filters aligned with the blog UI.
- Verification includes a smoke test against the built Japanese and English Pagefind indexes.

## Revisit Conditions

- Search quality is insufficient for the content corpus.
- The site needs cross-page search features Pagefind cannot provide.
- Build or deployed asset size becomes unacceptable.
