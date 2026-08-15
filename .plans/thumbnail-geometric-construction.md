# Plan

## Goal

Generate article thumbnails that read as flat geometric marks rather than
fussy organic blobs.

## Scope

- `src/content/prompts/thumbnail-generation.md`
- `src/content/prompts/thumbnail-concept.md`
- `.decisions/thumbnail-geometric-construction.md`

## Non-goals

- The image model, size, or quality in `src/content/metadata.toml`.
- Regenerating thumbnails already published.

## Assumptions

- The prompts are the only lever: publication generates thumbnails unattended.

## Steps

1. Rewrite the image prompt in the cookbook's order — background, subject, key
   details, constraints — using its vocabulary for marks.
2. Ask for compass-and-straightedge construction from exact primitives.
3. Hold the concept to a subject geometry can build: body, plain surface, one
   whole thing, no arrangement in the phrase.

## Verification

- Generate for the article that prompted this and read the result at full size
  and at 96px, the size of a list thumbnail.
- `python3 scripts/verify.py --mode standard`

## Open Issues

None.
