# Decision

## Title

Use a static SoftMatcha2-style search adapter

## Date

2026-06-03

## Status

Accepted

## Decision

Use a local static search adapter named `src/softmatcha2Search.js` for the Vite frontend.

## Context

SoftMatcha2 is a Python/Rust CLI and indexing tool for large local corpora. This project is a static Vite frontend with no backend search service.

## Alternatives

- Add a backend process that builds and queries a SoftMatcha2 index.
- Replace the site search with a browser npm search library.
- Keep a static frontend search adapter that uses exact and fuzzy phrase scoring.

## Reason

The requested site can remain static, and the current corpus is small enough to search in the browser. A backend SoftMatcha2 service would add hosting and deployment requirements outside the current app.

## Consequences

- Search behavior follows SoftMatcha2-style exact and soft phrase scoring, but it is not the upstream SoftMatcha2 CLI binary.
- The app stays static and deployable through the Vite build.

## Revisit Conditions

- Add a real backend search service when the corpus becomes large enough to require indexed search.
- Replace the adapter if SoftMatcha2 ships a browser-compatible package.
