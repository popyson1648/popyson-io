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
- Any other URL, or a URL that is not `http(s)`, renders as a plain link
  instead of an empty frame. Adding a service means adding one entry to
  `scripts/embedProviders.mjs`.

Embeds are excluded from the search index, and their frames are lazy loaded and
sized 16:9 by `.prose .embed-frame` in `src/app.css`.
