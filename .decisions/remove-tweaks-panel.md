# Decision

## Title

Remove the runtime Tweaks panel; freeze the current layout/style defaults

## Date

2026-06-16

## Status

Accepted

## Decision

Delete the Tweaks panel feature entirely and bake its current default behavior
into the app so the site looks exactly as before:

- Remove `src/tweaks-panel.jsx` and all of its consumers: the `TWEAK_DEFAULTS`
  block, `useTweaks`, the `TweaksPanel`/`TweakRadio`/`TweakColor`/`TweakSection`
  imports and JSX in `src/app.jsx`, and `tw` from the `AppCtx` value.
- Drop the two tweak-driven `useEffect`s in `src/app.jsx`:
  - the corner-radius override — instead set the frozen "rounded" values directly
    in `src/styles.css :root` (`--r: 5px`, `--r-sm: 3px`);
  - the per-theme `--accent` override — `--accent` now comes solely from the
    generated `virtual:theme.css` (i.e. `src/content/theme.toml`).
- Collapse the layout branches in `src/pages.jsx` to the shipped defaults:
  About is the two-column grid (`aboutLayout` "two-col"); Works is the card grid
  (`appLayout` "cards"). The unused "stacked" / "rows" branches are deleted.
  `topLayout` / `blogLayout` were never read by any component and are gone.
- Update `scripts/check_accessibility_static.py` to stop reading
  `src/tweaks-panel.jsx` (removed the tweak-panel font-size check and its inclusion
  in the `font_sizes_below` scan).

## Context

The owner confirmed the Tweaks panel is no longer used and asked to delete it.
It had also been the runtime layer that overrode `--accent` from JS, which is the
exact "two sources of accent truth" concern raised when the color theme moved to
`src/content/theme.toml` ([[structured-theme-and-about-content]]). Removing it
resolves that concern: `theme.toml` becomes the single source.

## Alternatives

- Keep the panel but seed its defaults from `theme.toml`. Rejected: the owner does
  not want the panel at all, and its `EDITMODE` on-disk-rewrite markers make a
  computed default impossible without reworking the edit-mode host protocol.
- Keep the alternate layout branches (stacked / rows) as dead code behind a fixed
  flag. Rejected: dead code; the site only ever shipped the defaults.

## Reason

The feature is unused, and removing it both simplifies the app shell and makes the
color theme single-sourced. Freezing the existing defaults keeps the visible design
identical.

## Consequences

- No runtime layout/corner/accent switching remains; such changes are now made in
  source (`theme.toml` for accent, `styles.css` for radius, `pages.jsx` for layout).
- `--accent` and `--r`/`--r-sm` are no longer set as inline styles on `<html>`;
  they resolve purely from stylesheets (also removes a small pre-JS flash).
- Any `.twk*` / tweak-panel CSS left in `src/app.css` is now dead but harmless.

## Revisit Conditions

- A runtime theming/customization UI is wanted again (rebuild on top of `theme.toml`
  as the source rather than a parallel JS default).
