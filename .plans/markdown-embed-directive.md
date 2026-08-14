# Plan

## Goal

Let article bodies embed slide decks and videos — starting with Docswell and
YouTube — from the URL the author already has.

## Scope

- `::embed{url="…"}` leaf directive in `scripts/articleHtml.mjs`.
- `scripts/embedProviders.mjs`: URL to iframe-URL resolution per service.
- Responsive 16:9 frame styling in `src/app.css`.
- Editor toolbar action that inserts the directive with the URL selected.
- Search plain text, tests, and `.project/` documentation.

## Non-goals

- Auto-expanding a bare URL into an embed. The author asks for an embed
  explicitly.
- Fetching oEmbed endpoints during the build. It would make builds depend on
  third-party availability.
- Raw HTML in Markdown, or provider scripts such as `docswell-embed.min.js`.
- X/Twitter, which cannot be embedded with an iframe alone.

## Assumptions

- Docswell's `/slide/<id>/embed` iframe (confirmed through its oEmbed response)
  is the supported script-free embed.
- A Docswell public URL `/s/<user>/<id>-<slug>` carries the slide id first.

## Steps

1. Add `scripts/embedProviders.mjs` with YouTube, Docswell, Speaker Deck, Vimeo.
2. Handle the `embed` leaf directive in `scripts/articleHtml.mjs`, before the
   directive fallback, and make that fallback skip directives already turned
   into markup.
3. Drop embed lines from `markdownToPlainText`.
4. Style `.prose .embed`, `.embed-frame`, and `.embed-caption`.
5. Add the `embed` command to the editor toolbar and `markdownEditing.js`.
6. Extend Markdown rendering, editor Markdown, and article style tests.
7. Document the syntax in `.project/article-markdown.md`; update
   `.project/structure.md`, `.project/README.md`, `.project/translation.md`.

## Verification

- `python3 scripts/verify.py`.
- Real Docswell and YouTube URLs rendered in the browser, light and dark.

## Open Issues

- None.
