# Decision

## Title

Thumbnails are constructed from exact geometric primitives

## Date

2026-08-15

## Status

Accepted

## Decision

`src/content/prompts/thumbnail-generation.md` asks for a mark built with
compass and straightedge: every form an exact primitive, every curve an arc of
constant radius, every edge straight at a right angle or a forty-five degree
diagonal. `src/content/prompts/thumbnail-concept.md` asks for a subject that
resolves into circles, rectangles, and triangles, has body, wears a plain
surface, and is one whole thing rather than a set or a container.

## Context

The prompts asked for "a single centered abstract object" with a "simple, bold
silhouette", and nothing else bounded the drawing. What came back for an
article about several agents was an amoeba: a central mass with seven arms,
each ending in a circle, with smaller buds between them. The owner read it as
too complex and unpleasant, and named the quality that was missing — shapes
that are almost round rather than round.

The two thumbnails already on the site are what the house style looks like when
it works: a balance scale, and three linked rounded rectangles. Few large
forms, flat ink, generous ground.

## Alternatives

- **Listing the shapes to avoid** — scallops, spikes, tendrils, fringes. The
  OpenAI cookbook's exclusion examples are contaminants (watermark, extra text)
  rather than shape vocabulary, and its guidance for marks is positive: strong
  shape, balanced negative space, scalability across sizes.
- **Capping the part count.** A number the model cannot check, and it says
  nothing about the quality of each form.
- **Reviewing each thumbnail by hand.** Publication runs unattended.

## Reason

The owner's own reference is the method: Hokusai's `略画早指南` (1812, 1814)
teaches drawing with ruler and compass over squares and circles, and geometric
graphic design is built the same way — Herbert Bayer worked with ruler and
compass alone, and an icon grid is concentric circles, a square grid, and
diagonals. Naming the construction, rather than the shapes to avoid, is what
the image model can follow: it produces a true circle instead of a rounded
blob, and detail has nowhere to accumulate.

The cookbook's order — background, subject, key details, constraints — and its
vocabulary for marks are used verbatim, since they are what the model is tuned
for.

## Consequences

- Subjects narrow to objects geometry can build. A hand, an animal, or a plant
  is out of reach, which the concept prompt now says.
- The concept examples in the prompt carry weight, and a careless one steers
  every thumbnail. Four were measured and removed: a baton thins to nothing, a
  dial wears tick marks, a toolbox fills with tools, and a compass is drawn as
  a compass rose — a ring of radiating points, which is the shape this change
  set out to stop.
- The concept step answers differently from one run to the next, so a single
  generation says little about what the pipeline will publish. Sampling it
  several times over a few summaries costs a handful of text requests and shows
  the spread before an image is drawn.
- Thumbnails from before this change stay as they were generated.

## Revisit Conditions

The image model starts holding shape discipline without being asked, or the
site's visual language moves away from flat geometric marks.
