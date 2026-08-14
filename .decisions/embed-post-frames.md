# Decision

## Title

Post embeds size themselves from the height the service reports

## Date

2026-08-14

## Status

Accepted

## Decision

X and Instagram posts embed through `platform.twitter.com/embed/Tweet.html`
and `instagram.com/<kind>/<code>/embed/captioned/`. Each frame starts at a
height set in `src/app.css` and takes the height the service posts to the page,
which `src/embedFrames.js` listens for. The X frame carries a `theme`
parameter that follows the site's theme.

## Context

Both services document an embed as a `<blockquote>` plus a script tag. The
renderer drops raw HTML from article Markdown, so an author has only the
`::embed` directive and whatever iframe URL the site can build from a page URL.

Unlike a video, a post has no fixed shape: a one-line tweet and a captioned
Instagram carousel differ by hundreds of pixels, so a single aspect ratio
either clips the post or leaves a gap under it.

## Alternatives

- **A fixed aspect ratio per service.** No runtime code, but every post is
  either cut off or padded.
- **A scrolling frame at a fixed height.** Puts a second scrollbar inside the
  article.
- **oEmbed at build time.** X's endpoint was withdrawn from public access, and
  Instagram's now requires an app token. Both return markup with the same
  script tag the renderer drops.
- **Baking the theme in as light.** Simpler, at the cost of a white card on the
  dark page.

## Reason

Both services already measure themselves and post the number to the parent
window — X as `twttr.private.resize`, Instagram as `MEASURE`. Reading the
message the frame already sends costs one listener and makes every post exactly
as tall as it is. The height is only accepted from those two origins, and only
for the frame whose window sent it.

## Consequences

- `platform.twitter.com/embed/Tweet.html` is the frame X's widget script builds
  rather than a documented endpoint, so an X change can break the embed. The
  fallback is the ordinary link every unresolvable URL already gets.
- A visitor who switches themes reloads the X frames on the page.
- Instagram embeds show a login prompt for anything that is not public.

## Revisit Conditions

Either service publishes an embed endpoint with a stable contract, or stops
serving the frames used here.
