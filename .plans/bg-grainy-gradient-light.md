# Plan

## Goal

Apply the grainy lime-gradient background prototype (`.tmp/background-ex/bg-candidate2-v5.html`)
to the site background in light mode. The prototype's white regions must use the
current background color (`--bg`), so the result looks like the non-white (lime)
regions are layered on top of the existing background.

## Scope

- `src/app.jsx`: add the two gradient layers inside the existing `.grain-bg` fixed container.
- `src/app.css`: port the prototype's `__noise` (crushed noise) and `__color`
  (multiply color stack) rules; swap the prototype whites for `var(--bg)` and the
  prototype lime `#d4ff0a` for `var(--accent-alt)` in the color stack.
- Light mode only; hide the gradient layers under `[data-theme="dark"]`.

## Non-goals

- Dark-mode variant of the gradient (later task).
- Changing the existing paper-grain layer (`.bg-noise`) or `RISOGRAPH_DEFAULTS`.
- Theme.toml changes.

## Assumptions

- Layer order: base `var(--bg)` → gradient (noise × color) → existing `.bg-noise`
  paper grain multiplied on top, so white regions render exactly like the current
  background and the lime regions get the same paper grain.
- The prototype's noise layer keeps literal white/lime values (the crush filter
  depends on their luminance); only the color layer is theme-driven.

## Steps

1. Add `.bg-gradient` wrapper + `.bg-gradient-noise` / `.bg-gradient-color` divs in `app.jsx`.
2. Port prototype CSS into `app.css` next to `.grain-bg`, with theme-var color swaps.
3. Verify in browser (light mode, desktop + mobile widths), then `python3 scripts/verify.py`.

## Verification

- Chrome DevTools MCP screenshots: light mode desktop (1280px) and mobile (390px);
  confirm white regions match the current bg (incl. paper grain) and the lime
  transition band shows the coarse dither without hard ellipse edges.
- `python3 scripts/verify.py`.

## Open Issues

- Dark-mode treatment of the gradient is deliberately deferred.
