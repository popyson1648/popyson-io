# Plan

## Goal

Make every component background transparent, leaving only the site/page background visible.

## Scope

- Update component CSS in `src/app.css`.
- Update the floating tweak panel CSS in `src/tweaks-panel.jsx`.
- Remove the previously added top fade overlay because it is not the site background.
- Keep true site background layers such as `body`, `.grain-bg`, `.bg-noise`, and decorative grain circles.
- Keep tiny semantic marks that are not component containers, such as selection color, list bullets, message accent bars, and SVG/icon color swatches where needed.

## Non-goals

- Do not change layout, copy, routing, data, or component structure.
- Do not remove borders, spacing, text colors, or focus behavior unless required by background transparency.
- Do not modify unrelated dirty worktree changes.

## Assumptions

- “Component background” includes topbar, filter UI, cards, menus, modal panels/overlays, buttons, chips, reading list rows, article TOC, code blocks, mobile article nav, and tweak panel controls.
- The site background means the page/body/grain background only.

## Steps

1. Remove `.app::before` top fade overlay.
2. Change component container backgrounds and hover/active fills in `src/app.css` to `transparent`.
3. Change tweak panel/control background fills in `src/tweaks-panel.jsx` to `transparent` where they are component UI.
4. Scan CSS for remaining component background fills and intentionally leave only site/decorative backgrounds.
5. Run repository verification.

## Verification

- Run targeted `rg` scans for remaining non-transparent component background declarations.
- Run `python3 scripts/verify.py --mode edit`.
- Attempt local preview only if the environment allows binding a server port.

## Open Issues

- Browser preview has previously failed in this sandbox with `listen EPERM`, so final visual verification may be limited to static inspection and build verification.
