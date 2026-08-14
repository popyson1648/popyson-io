# Article Markdown

Post, work, and About bodies are rendered by `scripts/articleHtml.mjs` at build
time. GitHub Flavored Markdown is supported. Raw HTML is not: it is dropped, so
a service's copy-and-paste embed snippet never works. Use the directives below.

## Callouts

```markdown
:::note[Optional title]
Body text.
:::
```

Types: `note`, `tip`, `info`, `warning`, `danger`.

## Line blocks

```markdown
AAA
| BBB
```

- A leading `|` breaks the line before it, the way Pandoc and reStructuredText
  line blocks keep their division into lines. The break renders as `<br>`, so
  the two lines sit a line-height apart — the gap a wrapped line leaves, rather
  than the paragraph gap a blank line opens.
- The bar and the whitespace after it are dropped; the rest of the line is
  ordinary Markdown. `\|` writes a literal bar and leaves the lines joined.
- On a line already broken by two trailing spaces or a trailing backslash, the
  bar is dropped and that one break stands.
- Works inside paragraphs, blockquotes, list items, and callout bodies. Bars
  that open a block still read as a table, since a table cannot start in the
  middle of a paragraph.

## Embeds

```markdown
::embed{url="https://www.docswell.com/s/popyson1648/57NLRN-2026-08-07-222150"}

::embed{url="https://youtu.be/dQw4w9WgXcQ"}

::embed[Caption text]{url="https://youtu.be/dQw4w9WgXcQ"}
```

- Paste the page URL you would share; the renderer resolves the service's own
  iframe URL. A bare URL on its own line stays an ordinary link, so only the
  directive embeds.
- The optional label becomes a caption linking to the original page, and the
  iframe title. Without it the title is the service name.
- Supported services (`scripts/embedProviders.mjs`):
  - YouTube: `youtu.be/<id>`, `watch?v=<id>`, `shorts/<id>`, `live/<id>`,
    `embed/<id>`. A `t=` or `start=` value is kept. Frames are served from
    `youtube-nocookie.com`.
  - Docswell: `/s/<user>/<id>-<slug>` or `/slide/<id>`.
  - Speaker Deck: the `/player/<uuid>` URL from its embed code, since the talk
    URL does not contain the player id.
  - Vimeo: `vimeo.com/<id>`.
  - X: `x.com/<user>/status/<id>`, the same path on `twitter.com` and the
    `mobile.` hosts, `/i/web/status/<id>`, and `/statuses/<id>`. Frames come
    from `platform.twitter.com` with X's `dnt` flag set.
  - Instagram: `/p/<code>`, `/reel/<code>`, and `/tv/<code>`, with or without a
    leading `/<user>`. Public posts only; the frame shows a login prompt for
    anything else.
- Any other URL, or a URL that is not `http(s)`, renders as a plain link
  instead of an empty frame. Adding a service means adding one entry to
  `scripts/embedProviders.mjs`.

Embeds are excluded from the search index, and their frames are lazy loaded and
sized 16:9 by `.prose .embed-frame` in `src/app.css`.

A post is as tall as its own content, so X and Instagram get a starting height
from `.prose .embed[data-embed="…"]` instead and report their real one to the
page. `src/embedFrames.js` listens for that message and resizes the frame, and
points the X frame at the theme the visitor is reading in.
