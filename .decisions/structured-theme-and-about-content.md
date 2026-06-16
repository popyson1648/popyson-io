# Decision

## Title

Manage color theme and About content as TOML, generated at build time

## Date

2026-06-16

## Status

Accepted

## Decision

- **Color tokens move to `src/content/theme.toml`.** The light/dark color custom
  properties (`--bg`, `--text`, `--accent`, `--line*`, `--msg-*`, …) that used to
  be hand-written in `src/styles.css` are now defined under `[light]` / `[dark]`
  tables. Values are raw CSS strings, so `color-mix(in srgb, …)` expressions are
  preserved verbatim. Non-color tokens (type scale, radius, noise, blur surfaces)
  stay in `src/styles.css :root`.
- **A Vite plugin (`tomlContent()` in `vite.config.js`) generates the theme CSS.**
  `theme.toml` is read at dev/build time and emitted as
  `:root, [data-theme="light"] { … }` + `[data-theme="dark"] { … }` through the
  virtual module `virtual:theme.css`, imported in `src/main.jsx`. Generating CSS
  (rather than setting vars from JS at runtime) keeps colors in the bundled and
  prerendered output, so there is no flash of unstyled color on the static site.
  The plugin uses `this.addWatchFile()` so editing `theme.toml` triggers HMR in dev.
- **About content moves to `src/content/about.toml`.** The bilingual `PERSON`
  object (name/role/initials/location/tagline/bio/career/activities/links) is now
  TOML. The same plugin transforms `*.toml` imports into ES modules, so
  `src/data.js` does `import aboutData from "./content/about.toml"` and exposes
  `aboutData.person` as `window.BlogData.PERSON` — the shape consumed by
  `src/pages.jsx` is unchanged. Blog `TAGS` stay in `data.js` (not About content).
- **`smol-toml`** is added as a devDependency for parsing (build/dev only; the
  browser bundle receives `about.toml` as pre-parsed JSON).
- `theme.toml` is the **sole** source of the per-theme `--accent`. The Tweaks
  panel that used to override `--accent` from JS at runtime has been removed in
  the same change — see `.decisions/remove-tweaks-panel.md`.

## Context

The owner asked to manage the color theme (including the dark theme) and the
About page content from dedicated structured files, after researching best
practices. Colors were scattered as CSS custom properties in `styles.css` and the
profile lived as a JS object in `data.js` — neither was a clean editing surface.

## Alternatives

- **JSON** for tokens (W3C Design Tokens is JSON-based, zero-dep, native Vite
  import). Rejected: JSON cannot carry the rationale comments the color tokens
  rely on, and the repo already standardizes on TOML (`.project/verification.toml`).
- **YAML.** Rejected: `js-yaml` was only a transitive dep, and YAML's indentation
  / implicit-typing footguns are unnecessary for flat config.
- **Markdown + frontmatter** for About. Rejected: the bilingual, structured
  records (career/activities/links) would collapse into YAML frontmatter anyway,
  mixing two formats for little gain.
- **Runtime injection** of all color vars from JS (like the accent tweak).
  Rejected: would leave the prerendered static HTML uncolored until JS runs.

## Reason

TOML is consistent with the existing repo convention, supports comments, and is
unambiguous for flat config. Build-time CSS generation preserves the static /
prerendered behavior. One small plugin covers both the theme-CSS and the
`.toml`-import needs, keeping the change reviewable.

## Consequences

- Colors are edited in `src/content/theme.toml`; do not re-add color tokens to
  `src/styles.css`.
- A new build dependency (`smol-toml`) and a custom Vite plugin are now part of
  the build; `npm run build` and `npm run dev` both depend on them.
- `src/content/` is a new home for structured content files.
- `about.toml` is browser-only; `scripts/prerender.mjs` (via `meta.js`) does not
  read it, so route metadata is unaffected.

## Revisit Conditions

- More design tokens (typography, spacing) are moved to structured management
  (consider adopting the full W3C Design Tokens structure then).
- About content needs long-form prose that would read better as Markdown.
