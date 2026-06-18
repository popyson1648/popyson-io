# Decision

## Title

Render blog article bodies at build time

## Date

2026-06-18

## Status

Accepted

## Decision

Blog post Markdown is rendered in Node during Vite build/dev content loading.
The generated article body shape is `{ ja: { html, text }, en: { html, text }, headings }`.
The browser renders the prepared HTML and only owns article interactions such as TOC navigation and code-copy buttons.

`scripts/prerender.mjs` also injects article title/body HTML into each article route's initial `#root`.

## Context

Article pages previously rendered Markdown and Shiki highlighting in the browser.
That kept deterministic work in the client bundle and left prerendered article pages with an empty body for crawlers that do not execute JavaScript.

## Alternatives

- Keep browser-side `react-markdown` and lazy Shiki highlighting.
- Fully server-render the React article shell.
- Pre-render only metadata and rely on the SPA for body content.

## Reason

Build-time rendering removes the Markdown/Shiki stack from the client bundle, lets Shiki use the Node/oniguruma path during generation, and makes article body content visible in static HTML.
Keeping React responsible only for the shell and interactions limits the migration scope.

## Consequences

- Markdown rendering behavior must be verified through `scripts/check_markdown_rendering.mjs`.
- Any future Markdown extension belongs in `scripts/articleHtml.mjs`, not in client React.
- Code-copy button markup is static HTML; runtime behavior is attached by delegated handling in `src/blog.jsx`.

## Revisit Conditions

Revisit if the site adopts full React SSR or if article rendering needs request-time personalization.
