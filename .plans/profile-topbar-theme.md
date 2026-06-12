# Plan

## Goal

Address six owner-reported polish issues on the About page, the top bar, and theming:
remove the blog-list ordinal numbers, keep the centered top bar a constant width across
languages, fix the email link icon, add X / Wantedly / LinkedIn links, rename "App" to a
word that means "things built", and make the theme switch actually change the appearance.

## Scope

- `src/blog.jsx`, `src/app.css`: drop the `.post-index-no` ordinal and its grid gutter.
- `src/app.css`: fix `.lang-btn` to a constant width so the `width: max-content` top bar
  does not resize between "EN" and "日本語".
- `src/components.jsx`: add `mail`, `xcom`, `linkedin`, `wantedly` line icons.
- `src/pages.jsx`: map the new social labels and email to the right icons in `linkIcon`.
- `src/data.js`: add X / LinkedIn / Wantedly placeholder links (`href: "#"`).
- `src/i18n.js`, `src/app.jsx`: rename nav/page "App"/"Application" to Works / 制作物.
- `src/styles.css`, `src/app.jsx`: implement a real dark theme (deep navy paper + cream ink)
  and update the default dark accent.

## Non-goals

- Redesigning the decorative riso circles (handled separately).
- Changing the route path `/app` or the font family.

## Assumptions

- Nav labels are identical across languages, so only the language-toggle label changes width.
- The dark theme can reuse the existing token system; only `[data-theme="dark"]` values change.
- Placeholder social URLs (`#`) are acceptable until real profiles exist.

## Steps

1. Remove `post-index-no` markup and CSS; collapse `.post-index-card` to a single column.
2. Pin `.topbar .lang-btn` to a fixed 58px box. The file has ~17 stacked `.topbar .lang-btn`
   rules, so the winning declaration is appended at end-of-file with `!important`.
3. Add envelope + brand icons; route them in `linkIcon`; add the three placeholder links.
4. Rename App → Works (nav, both langs) and Application → 制作物 / Works (page title).
5. Replace the dark token block with a navy/cream palette; switch circle and bg-noise blend
   to `screen` under `[data-theme="dark"]`; set `TWEAK_DEFAULTS.darkAccent` to `#6f82ff`.

## Verification

- `python3 scripts/verify.py` — lint / build / accessibility / performance all pass.
- Chrome DevTools MCP:
  - Measured `.topbar` width: identical (402.6px) for "EN" and "日本語" (delta 0).
  - Live theme menu toggle: data-theme + `.grain-bg` background switch between
    `#12141d` (dark) and `#fdfff7` (light).
  - Desktop (1280) and mobile (390), light + dark: blog list has no numbers, About shows
    envelope email + GitHub/X/LinkedIn/Wantedly/RSS, nav reads "Works", dark is legible.

## Open Issues

- On the dark paper, the lime circle (screen blend) is bright enough that cream text over it
  drops in contrast (first blog summary / bio first line). Acceptable for now because the
  circles are slated for a separate redesign; revisit when that lands.
- Social URLs are placeholders (`#`); replace with real profiles before publishing.
