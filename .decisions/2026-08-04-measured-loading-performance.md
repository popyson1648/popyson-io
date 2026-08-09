# Decision

## Title

Split the Blog route and make web fonts optional on constrained connections

## Date

2026-08-04

## Status

Accepted

## Decision

The browser application loads the Blog/search implementation and rendered
article bodies through a separate route chunk. About and unrelated entry routes
do not download that code. Direct Blog and article visits warm the lazy chunk
before React replaces their prerendered HTML, while client-side navigation uses
React Suspense.

Google Fonts requests use `font-display: optional`, and their stylesheet loads
asynchronously after the first render. A `noscript` fallback preserves the fonts
when JavaScript is disabled. The configured Alexandria, LINE Seed JP, and DM
Mono families remain preferred on fast connections. On a constrained
connection, the browser may keep the system fallback rather than swap fonts
late and extend Largest Contentful Paint.

## Context

A production Lighthouse baseline scored 0.65. It reported 176 KB of unused
JavaScript on the About entry route and 39 font requests totaling about 627 KB.
The editor itself measured a 294 ms LCP and zero layout shift, so its SmartHR UI
dependency graph was not a meaningful optimization target.

## Alternatives

- Eagerly ship Blog/search code and all rendered article bodies on every route.
- Remove the selected web fonts or replace Japanese typography with a system
  font on every connection.
- Remove an intentional Blog filter animation whose measured reflow had zero
  estimated LCP or FCP savings.

## Reason

Route splitting reduced the initial JavaScript from 493 KB to 426 KB and unused
JavaScript from 176 KB to 107 KB without changing the active page. Optional font
display preserved the design preference while avoiding a slow-connection font
swap. Across repeated optimized runs, the measured Lighthouse score was
0.69–0.70, FCP improved from the 4.85 s baseline to 3.90–4.05 s, and LCP
improved from 6.35 s to 5.63 s. After removing the font stylesheet from the
render-blocking path, a fresh production audit scored 0.81 with a 3.6 s FCP and
3.8 s LCP. Accessibility, Best Practices, and SEO remained at 1.00.

## Consequences

- Opening Blog for the first time during client navigation downloads an
  additional route chunk of about 68 KB (18.5 KB gzip).
- Constrained connections may display the configured fallback fonts for the
  lifetime of the page.
- Blog prerendering continues to import `blog.jsx` synchronously and is separate
  from the browser-only lazy boundary.

## Revisit Conditions

- Revisit if real-user monitoring shows route-chunk latency on Blog navigation.
- Revisit font delivery if the project adopts licensed self-hosted subsets or a
  system-font design.
