# Decision

## Title

Generate Responsive Thumbnail Variants from Canonical PNGs

## Date

2026-07-30

## Status

Accepted

## Decision

Keep `public/thumbnails/<post-id>.png` as the canonical image and generate
lossless WebP display variants at 192 and 384 pixels wide. Blog list and related
article images advertise those variants through `srcset` while retaining the
canonical PNG as `src`.

`npm run metadata:generate` runs the variant generator after metadata generation.
Repository verification regenerates the expected bytes in memory and fails when
a committed variant is missing or stale.

## Context

At the time of this decision, the canonical thumbnails were 1254 by 1254 pixels
and totaled about 8.1 MB. The largest rendered thumbnail is 96 CSS pixels wide,
so browsers were transferring and decoding far more image data than those views
can display. Lighthouse attributed most of the Blog route's transfer size and
LCP delay to these images.

A later approved regeneration replaced the canonical contents with shadowless
1024 by 1024 artwork while keeping the same stable paths. The 192- and 384-pixel
variant contract is unchanged.

## Alternatives

- Replace the canonical PNGs: rejected because those files are metadata output
  and may be reused for larger or non-HTML surfaces.
- Use a runtime image service: rejected because the site is static and its
  generated assets should remain deterministic and reviewable.
- Generate only one display size: rejected because 1x and high-density displays
  need different intrinsic widths.
- Use lossy compression: rejected because this task must not introduce visible
  quality changes.

## Reason

Committed, lossless display variants remove unnecessary transfer and decode work
without changing layout, semantics, interaction, or canonical content. The
source PNG fallback preserves compatibility, and deterministic verification
prevents variants from drifting when a source image changes.

## Consequences

- Each canonical thumbnail adds two generated WebP files.
- `sharp` is a development dependency used by generation and verification.
- New or replaced canonical images must be followed by
  `npm run thumbnail:variants`; the metadata workflow does this automatically.
- Thumbnail markup must keep `sizes` aligned with its CSS display width.

## Revisit Conditions

Revisit the widths or format if thumbnail display sizes change, if additional
pixel-density targets become material, or if Cloudflare image transformation
replaces committed static variants.
