# Plan

## Goal

Remove the two decorative riso circles (lime + blue) from the page background entirely.

## Scope

- `src/app.jsx`: `.grain-circle` markup, circle noise/filter generation, circle-related CSS vars and `RISOGRAPH_DEFAULTS` keys.
- `src/app.css`: `.grain-circle*`, `.grain-color`, `.grain-noise` rules and the dark-theme circle override.
- `src/styles.css`: now-consumerless fallback vars (`--circle-noise-url`, `--grain-light`, `--grain-dark`).

## Non-goals

- Background paper grain (`.bg-noise`) — stays as-is.
- Text noise vars — untouched (already inert).

## Assumptions

- The circles have been a recurring legibility concern and were provisionally disabled once before; the decision now is to delete them rather than keep dead styling. See `.decisions/remove-background-riso-circles.md`.

## Steps

1. Delete the circle DOM, the circle SVG displacement filter, the `circle*` defaults, and the circle CSS-var wiring in `app.jsx`.
2. Delete the circle rules in `app.css`; keep the dark-theme `.bg-noise` screen-blend override.
3. Drop the dead fallback vars in `styles.css`.

## Verification

- `python3 scripts/verify.py` (all phases).
- Built `dist/` served via `vite preview`; dark and light screenshots confirm no circles and unchanged grain/topbar.

## Open Issues

None.
