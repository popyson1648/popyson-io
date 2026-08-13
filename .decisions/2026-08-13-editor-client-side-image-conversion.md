# Decision

## Title

Convert and shrink uploaded images in the browser, before the Content API

## Date

2026-08-13

## Status

Accepted

## Decision

The editor prepares every picked image in the browser before uploading it:
HEIC is decoded to JPEG, and anything longer than 1920px on its longest edge or
larger than 10MB is redrawn through a canvas until it fits.

`src/editor/imagePreparation.js` owns this. HEIC decoding uses `heic-to`, a
WebAssembly build of libheif, loaded through a dynamic `import()` so it stays
out of the initial editor download.

## Context

The Content API accepts GIF, JPEG, PNG and WebP up to 10MB and verifies the
magic bytes, answering 415 otherwise (`IMAGE_SIGNATURES` in
`workers/content-api/src/repository.ts`).

A phone photo fails both halves of that contract: iOS writes HEIC, and a current
camera clears 10MB without trying. The editor is reachable from a phone over
Tailscale and has a camera capture button, so phone photos are an ordinary
input, not an edge case.

Uploads travel as base64 inside a JSON body, so an unshrunk file costs about a
third more bytes on the wire than the file itself.

## Alternatives

- **Convert on the server with sharp.** sharp is already a dependency, but its
  prebuilt binaries cannot decode HEIC. HEVC support needs a libvips compiled
  against libheif, libde265 and x265, which upstream deliberately keeps out of
  released binaries over patent licensing. It would also mean uploading the full
  file before shrinking it.
- **Widen the Content API to accept HEIC.** It would have to grow a signature
  check per format and then still serve images browsers cannot render.
- **Re-encode to WebP rather than JPEG.** WebP is smaller, but WebKit cannot
  encode WebP from a canvas, and `toBlob` silently falls back to PNG for an
  unsupported type — so an iPhone would produce a *larger* file than the input.
- **Cap the longest edge at 2560px.** The widest content column is 860px
  (`src/app.css`), so 1920 already covers a 2x display with room to spare.

## Reason

Preparing in the browser is the only place that fixes both problems at once
without a build-from-source dependency, and it shrinks the payload before it is
sent rather than after.

JPEG is the one photo format every canvas implementation can encode, which is
what makes the result predictable on the phone this feature exists for.

## Consequences

- The editor offers HEIC in its file picker even though the API rejects it;
  `UPLOAD_IMAGE_TYPES` in `imagePreparation.js` is the set that must match the
  Worker, and `tests/check_editor_image_types.test.mjs` holds the two together.
- `heic-to` is LGPL-3.0 and adds a lazily-loaded 3MB chunk, downloaded only when
  a HEIC is actually picked.
- Animated GIFs are passed through untouched and an oversized one is refused,
  because a canvas round trip would keep only the first frame.
- PNG and WebP sources keep their format when the result fits, so transparency
  survives; JPEG is the fallback.
- Re-encoding is lossy, so an image already inside both limits is left alone.

## Revisit Conditions

- The Content API grows AVIF support, which would beat JPEG on size and is
  already decodable by sharp.
- WebKit ships canvas WebP encoding, removing the reason to prefer JPEG.
- The site layout widens past 960px, which would make 1920px only a 2x cover.
