# Plan

## Goal

Let `::embed` take an X post URL and an Instagram post URL, and show each at
the height its content needs.

## Scope

- Two providers in `scripts/embedProviders.mjs` and their titles in
  `scripts/articleHtml.mjs`.
- `src/embedFrames.js`: the height each service reports, and the theme the X
  frame renders in.
- Starting heights in `src/app.css`.
- Tests, `.project/article-markdown.md`, `.project/structure.md`, README.

## Non-goals

- An editor toolbar button.
- Threads, Bluesky, Mastodon, or any other service.

## Assumptions

- `platform.twitter.com/embed/Tweet.html` and `instagram.com/<kind>/<code>/embed`
  stay embeddable. Neither sends `X-Frame-Options` or a `frame-ancestors`
  policy today, and both were rendered in a browser to confirm.

## Steps

1. Resolve an X post id from `/status/<id>`, `/statuses/<id>`, and
   `/i/web/status/<id>` on the x.com and twitter.com hosts, and an Instagram
   code from `/p/`, `/reel/`, `/reels/`, and `/tv/`.
2. Give each frame a starting height, since 16:9 belongs to video alone.
3. Listen for the height both services post, matching the frame by the window
   the message came from, and accept it from those two origins only.
4. Follow `data-theme` with a MutationObserver and rewrite the X frame's
   `theme` parameter, dropping the measured height so the reloaded frame can
   report its own.

## Verification

- `npx vitest run --project unit --project component`
- `python3 scripts/verify.py --mode standard`
- Open an article carrying both embeds in a browser, in both themes, and check
  the frames end up as tall as their posts.

## Open Issues

None.
