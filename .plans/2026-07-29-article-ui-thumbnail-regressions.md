# Plan

## Goal

Correct the reported article, thumbnail, and mobile rendering regressions while
preserving the site's overall visual system.

## Scope

- Keep thumbnail backgrounds at `#F1F3EA`; make the foreground colorful with
  at most three foreground colors whose hues may vary but whose tone remains
  harmonious; and regenerate the three green thumbnails created after the
  background prompt changed.
- Render Markdown unordered lists authored with `-`, `+`, or `*` as proper list
  items with a normal bullet marker instead of a literal-looking dash.
- Set fenced code blocks to `16px` and inline-code backgrounds to `#FBFDF4`.
- Render each related article's resolved thumbnail instead of the placeholder.
- Add an accessible bottom-right scroll-to-top button on article routes after
  the reader has scrolled down.
- Restore the frosted/translucent treatment for the top bar and Blog filter UI
  on mobile, including the WebKit-prefixed backdrop filter.
- Build the article table of contents from every heading level. Treat the first
  heading as a root regardless of whether it is `#`, `##`, or another level,
  and nest later headings under the nearest preceding shallower heading.
- Add or update automated coverage and relevant project documentation.

## Non-goals

- Redesign the overall theme, article typography, or Blog filtering behavior.
- Change article prose or metadata other than the regenerated thumbnail files.
- Regenerate the older blue thumbnail that predates the background prompt
  change.
- Merge the branch.

## Assumptions

- A proper unordered-list marker means the three CommonMark source markers are
  equivalent and render as the same visible bullet.
- The affected generated thumbnails are:
  - `20260729-9263f92d.png`
  - `20260729-94519dc2.png`
  - `20260729-e00e3f8b.png`
- The existing `#F1F3EA` thumbnail background remains required and does not
  count toward the foreground's three-color limit.
- Foreground colors are not restricted to the site's blue. The generated object
  should use multiple colors where appropriate, while keeping their saturation,
  brightness, and overall print tone visually consistent.
- Heading order and levels match between the Japanese and English versions of
  an article, while localized heading IDs remain locale-specific.

## Steps

1. Update the thumbnail-generation prompt to preserve the exact background and
   require a colorful, harmonious foreground using at most three foreground
   colors, with a test that protects the palette rules.
2. Regenerate only the three affected thumbnails through the existing metadata
   provider flow, preserving their paths and resolved front matter.
3. Extend heading extraction and rendered heading IDs from the current
   `h2`-only behavior to `h1` through `h6`, retain depth and localized IDs, and
   render a nested TOC based on the nearest preceding shallower heading.
4. Correct article presentation:
   - use native-looking unordered-list bullets for `-`, `+`, and `*`;
   - set fenced code to `16px`;
   - set inline-code background to `#FBFDF4`;
   - render related thumbnails with fixed dimensions and a fallback only when
     no thumbnail exists.
5. Add the article-only scroll-to-top control with a scroll threshold, smooth
   scrolling, reduced-motion handling, an accessible label, and a fixed
   bottom-right position that respects mobile safe-area insets.
6. Reconcile the final CSS cascade for mobile frosted controls: remove late
   rules that cancel required top-bar and filter translucency, and keep both
   standard and WebKit backdrop-filter declarations.
7. Update tests for Markdown list inputs, all heading levels and nesting data,
   localized heading anchors, related images, code sizing, inline-code color,
   and the scroll-to-top control.
8. Review the final diff for unrelated changes and run repository verification.

## Verification

- Run targeted Vitest suites for Markdown rendering, content loading, and
  article components.
- Run `python3 scripts/verify.py`.
- Build and inspect Japanese and English article routes.
- In browser verification at desktop and iPhone-sized viewports:
  - confirm top bar and Blog filter translucency;
  - confirm `-`, `+`, and `*` fixtures render as bullets;
  - confirm fenced code computes to `16px` and inline code to `#FBFDF4`;
  - confirm related thumbnail image requests succeed;
  - confirm the scroll-to-top button appears after scrolling, works, and is
    keyboard accessible;
  - confirm TOC nesting and navigation for articles starting at `#`, `##`, and
    `###`.
- Inspect regenerated thumbnail pixels and visually confirm the fixed
  `#F1F3EA` background with a colorful foreground of no more than three
  harmoniously toned colors.

## Open Issues

- Mobile background color/luminance work is intentionally excluded and tracked
  in `2026-07-29-mobile-background-sdr-experiment.md`.
