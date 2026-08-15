# Decision

## Title

Generate localized article OGP images during prerendering

## Date

2026-08-15

## Status

Accepted

## Decision

Generate one 1200x630 PNG per article and locale during `scripts/prerender.mjs`.
Use Satori for measured text layout and Sharp for PNG encoding. Use the site's
Alexandria and LINE Seed JP fonts, then choose the largest font size up to 74 px
that preserves the title safe area. Center the trimmed rendered text block on
both axes inside the speech bubble. Include a title hash in each public filename
and reference that image from article Open Graph and Twitter metadata.
Non-article routes retain the shared fallback image.

## Context

The site already prerenders route-specific metadata but every route uses the
same provisional image. The approved Figma source defines a blog card with two
title treatments. Build and CI hosts cannot be assumed to have the site's
Japanese font installed.

## Alternatives

- Keep the shared fallback image for all routes.
- Commit generated PNGs alongside source content.
- Generate images dynamically from a server endpoint.
- Select a font size from character count without measuring rendered output.

## Reason

Build-time rendering keeps the static deployment model, produces crawler-ready
files, and avoids runtime infrastructure. Explicit font data makes output
repeatable across developer machines and CI. Measuring the rendered title
handles Japanese and Latin widths more reliably than a character threshold.
Hashed filenames prevent a renamed article from reusing a stale cached image.

## Consequences

- Production builds render two images per article.
- The repository vendors the OFL-licensed LINE Seed JP bold face and depends on
  Satori plus Fontsource's static Alexandria files.
- Article `og:image` and `twitter:image` URLs change when their localized title
  changes.
- A title that cannot fit the safe area even at the minimum supported size
  fails the build instead of producing an overflowing card.

## Revisit Conditions

- Rendering time becomes material for a substantially larger article archive.
- Additional per-route card designs or a different sizing range are approved.
- The site's typography changes away from Alexandria or LINE Seed JP.
