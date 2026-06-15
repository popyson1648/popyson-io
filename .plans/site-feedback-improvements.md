# Plan

Site feedback batch: reading list, default landing, site name, RSS, About links.

## Goal

Resolve the non-OGP site feedback in one branch:
reading-list overflow + filter redesign, About as the default landing page,
site name `popyson.com`, a working RSS feed, and proper About social links.
(OGP full support is planned separately in `.plans/ogp-full-prerender.md`.)

## Scope

- Reading list horizontal overflow: add `overflow-wrap: anywhere` to
  `.ritem-title` (`src/app.css`) so long bare-URL titles wrap instead of
  exceeding the viewport (the cause of the "infinite zoom-out").
- Reading list filter (`.seg-filter`): a pill container with a vertical bar
  between the two segments and a top-bar style underline (accent-alt) on the
  active segment instead of a filled background; sized like the blog controls.
  Edited in the late authoritative block in `src/app.css`.
- Default landing page: `src/app.jsx` routes empty/unknown to About; remove
  the `TopPage` route + import.
- Site name: `brand` -> `popyson.com` in `src/i18n.js` (ja/en); `index.html`
  `<title>` and RSS autodiscovery title -> `popyson.com`.
- RSS: split `src/posts.js` out of `src/data.js`; add a Vite plugin in
  `vite.config.js` to emit `dist/feed.xml`; fix autodiscovery to `/feed.xml`;
  `RssPage` shows `https://popyson.com/feed.xml`.
- About links: replace GitHub/X/LinkedIn/Wantedly icons with Simple Icons
  (CC0) glyphs in `src/components.jsx`; set real URLs in `src/data.js`;
  external links open in a new tab.

## Non-goals

- OGP / Twitter card implementation (separate branch/plan).
- Persona/demo content changes.

## Assumptions

- Canonical domain `https://popyson.com`.
- `--accent-alt` is defined (used by the top bar active underline).

## Steps

Implemented in the order above, then verified.

## Verification

- `npm run lint` (clean) and `npm run build` (emits `dist/feed.xml`).
- `npm run preview` + Chrome DevTools MCP:
  - default load redirects to `#/about`;
  - reading list filter shows pill + vertical bar + active underline (light
    and dark); long URL titles wrap (no horizontal overflow at 300px);
  - `/feed.xml` returns valid RSS (6 items); RssPage shows the real URL;
  - About links resolve to the real URLs and open in a new tab;
  - footer/title read `popyson.com`.
- `python3 scripts/verify.py`.

## Cleanup / decisions

- Removed the now-unused `TopPage` / `RecentList` components, their `top_*`
  i18n strings, and the `.top-simple` / `.top-link-cloud` CSS.
- RSS item links are written in path form (`/blog/<id>`) on the premise of the
  path-routing migration (`.plans/ogp-full-prerender.md`), implemented next on
  its own branch — a single consistent decision instead of hash-then-path.
