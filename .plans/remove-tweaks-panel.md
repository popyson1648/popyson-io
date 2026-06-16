# Plan

## Goal

Remove the unused runtime Tweaks panel and freeze its current defaults so the
visible design is unchanged, making `theme.toml` the single source of `--accent`.

## Scope

- Delete `src/tweaks-panel.jsx`.
- `src/app.jsx`: remove the tweaks-panel import, `TWEAK_DEFAULTS`, `useTweaks`,
  the corner-radius and `--accent` override effects, `tw` from `AppCtx`, and the
  `<TweaksPanel>` JSX.
- `src/styles.css`: set the frozen "rounded" radius in `:root` (`--r: 5px`,
  `--r-sm: 3px`).
- `src/pages.jsx`: collapse About to the two-column grid and Works to the card
  grid; delete the "stacked" / "rows" branches; remove `tw`.
- `scripts/check_accessibility_static.py`: stop reading `src/tweaks-panel.jsx`.

## Non-goals

- Any visible design change (layout, corners, colors stay as currently shipped).
- Removing now-dead `.twk*` CSS from `src/app.css` (harmless; left as-is).

## Assumptions

- Current shipped defaults are hero/list/cards/two-col/rounded with accents
  `#4960ff` (light) / `#6f82ff` (dark).
- `topLayout` / `blogLayout` are not read by any component (verified).

## Steps

1. Strip tweaks from `app.jsx`; freeze radius in `styles.css`.
2. Collapse layout branches in `pages.jsx`.
3. Fix the a11y script; delete `tweaks-panel.jsx`.

## Verification

- `grep` for `tweaks|Tweak|useTweaks|tw\.|cornerStyle|aboutLayout|appLayout` in
  `src/`,`scripts/` returns nothing.
- `npm run lint`, `check_accessibility_static.py`, `npm run build` pass.
- Browser: no Tweaks panel; About `.about-grid`, Works `.app-grid` with cards;
  `--accent` (#4960ff / #6f82ff) and `--r`/`--r-sm` (5px/3px) resolve from
  stylesheets with **no** inline `--accent`/`--r` on `<html>`.
- `python3 scripts/verify.py` — all phases pass.

## Open Issues

- None.
