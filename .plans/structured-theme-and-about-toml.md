# Plan

## Goal

Manage the color theme (light + dark) and the About page content from dedicated
structured TOML files, generated into the app at build time.

## Scope

- `src/content/theme.toml`: light/dark color tokens (single source of truth).
- `src/content/about.toml`: bilingual About content (PERSON).
- `vite.config.js`: `tomlContent()` plugin — `virtual:theme.css` from theme.toml
  and `*.toml` → ES module imports; `this.addWatchFile()` for dev HMR.
- `src/main.jsx`: import `virtual:theme.css`.
- `src/styles.css`: remove the inline color blocks (keep non-color `:root` tokens).
- `src/data.js`: source `PERSON` from `about.toml`.
- `src/app.jsx`: comment noting `theme.toml` accents are canonical vs the Tweaks override.
- `package.json`: add `smol-toml` (devDependency).
- Docs: `.decisions/structured-theme-and-about-content.md`, this plan,
  `.project/structure.md`.

## Non-goals

- Moving non-color tokens (typography/radius/noise) out of `styles.css`.
- Changing any visible design, copy, or routing/metadata.
- Replacing the Tweaks runtime accent override.

## Assumptions

- The site is statically prerendered, so colors must be CSS at build time.
- `meta.js`/`prerender.mjs` do not use `PERSON` (verified), so `about.toml` is
  browser-only.
- `TWEAK_DEFAULTS` EDITMODE markers in `app.jsx` must stay intact.

## Steps

1. Add `smol-toml` devDependency.
2. Create `src/content/theme.toml` and `src/content/about.toml`.
3. Add the `tomlContent()` Vite plugin and register it.
4. Wire `main.jsx`, trim `styles.css`, repoint `data.js`, annotate `app.jsx`.
5. Write decision + plan docs and update `.project/structure.md`.

## Verification

- `npm run lint` — clean.
- `npm run build` — succeeds; built CSS contains `[data-theme=light]` and
  `[data-theme=dark]` blocks with the expected accents and preserved `color-mix`.
- `npm run dev` + browser: light/dark themes render correctly; About renders in
  ja and en; resolved CSS vars match theme.toml; editing theme.toml triggers an
  HMR reload (Vite dispatches "page reload src/content/theme.toml").
- `python3 scripts/verify.py` — lint / build / accessibility / Lighthouse pass.

## Open Issues

- (Resolved) The Tweaks panel's `lightAccent` / `darkAccent` duplicated the
  `theme.toml` accents. The panel was removed as a follow-up so `theme.toml` is the
  single source — see `.plans/remove-tweaks-panel.md` and
  `.decisions/remove-tweaks-panel.md`.
