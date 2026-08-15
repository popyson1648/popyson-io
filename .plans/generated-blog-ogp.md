# Plan

## Goal

Generate a Figma-matched 1200x630 Open Graph image for every blog article and
locale during the production build, using the site's real fonts and selecting
the largest title size that preserves the approved safe area.

## Scope

- Add deterministic build-time PNG generation for Japanese and English blog
  article titles.
- Match the approved Figma speech bubble, avatar, background, and site label,
  using its two title examples as sizing anchors.
- Use LINE Seed JP for Japanese glyphs and Alexandria for Latin glyphs.
- Point article Open Graph and Twitter metadata at the generated image while
  retaining the shared fallback image for non-article routes.
- Add tests and update contributor-facing project documentation.

## Non-goals

- Generating unique images for non-article routes.
- Changing article titles, routing, or the visible blog UI.
- Editing the source Figma file.

## Assumptions

- Generated images are build artifacts under `dist/`, not committed content.
- The existing `public/avator.jpg` is the source for the character artwork.
- Titles use at most 74 px and shrink from there based on measured output.
- The rendered text block is centered horizontally and vertically inside the
  speech bubble while preserving its safe margins.
- Japanese and English article routes receive separate localized images.

## Steps

1. Add a reusable OGP renderer with explicit font loading, deterministic
   maximum-fit sizing, and measured text-block centering.
2. Run the renderer from the production build after content is loaded and
   before prerendered metadata is written.
3. Extend the shared head model so article routes reference their localized
   generated image paths.
4. Add unit and integration coverage for path selection, escaping, title-size
   selection, PNG dimensions, and prerendered metadata.
5. Update project structure documentation and verification configuration only
   where commands or workflows change.
6. Run the repository verification command and visually inspect representative
   short- and long-title outputs against the Figma frames.

## Verification

- `python3 scripts/verify.py`
- Confirm generated PNGs are 1200x630.
- Confirm Japanese and English article HTML use the corresponding absolute OGP
  URL for both Open Graph and Twitter metadata.
- Visually compare one pattern-1 and one pattern-2 image with the Figma source.

## Open Issues

- None. Article-only generation and the existing fallback for other routes were
  approved before implementation.
