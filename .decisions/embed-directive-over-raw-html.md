# Decision

## Title

Embeds come from an `::embed` directive, not raw HTML or auto-expanded URLs

## Date

2026-08-14

## Status

Accepted

## Decision

Article bodies embed third-party content through a `::embed{url="…"}` leaf
directive. `scripts/embedProviders.mjs` maps a URL the author can copy to the
iframe URL the service documents — usually the shareable page URL, though
Speaker Deck only exposes its player id in the embed code, so it takes that
`/player/<id>` URL. Unknown or non-`http(s)` URLs render as ordinary links.
Raw HTML stays disabled, and a bare URL keeps rendering as a link.

## Context

Services hand out `<script>`-based embed snippets. The renderer parses Markdown
without `allowDangerousHtml`, so such a snippet silently disappears from the
page. Docswell and YouTube both publish a script-free iframe URL that can be
derived from the public page URL.

## Alternatives

- Enable raw HTML for article bodies. Rejected: it hands every future post the
  ability to inject scripts, for one formatting feature.
- Expand any bare URL on its own line into an embed. Rejected: the author loses
  the ability to simply link to a video, and a paste becomes a layout decision.
- One directive per service (`::youtube`, `::docswell`). Rejected: every new
  service would add syntax the author has to learn.
- Resolve embeds through oEmbed at build time. Rejected: builds would depend on
  third-party endpoints being reachable.

## Reason

A directive keeps the intent explicit and the output under the site's control:
frames are lazy loaded, sized 16:9, titled for screen readers, and served from
`youtube-nocookie.com`. One syntax covers every service, and a service is added
by appending an entry to a table.

## Consequences

- Authors write `::embed{url="…"}`; the editor toolbar inserts it.
- A mistyped or unsupported URL degrades to a link, never an empty frame.
- Translation must preserve the directive and its `url`.

## Revisit Conditions

- A service worth embedding offers no iframe URL derivable from its page URL.
- Embeds become common enough that per-service defaults (aspect ratio, caption
  behavior) need to differ.
