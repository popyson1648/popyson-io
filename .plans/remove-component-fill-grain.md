# Plan

## Goal

Remove filled component surfaces across the site and apply the provided grain/noise implementation to the background, lines, text, and decorative parts.

## Scope

- Use `#4960ff` as the base ink color.
- Use `#d4ff0a` as the accent ink color.
- Use `#fdfff7` as the page background.
- Replace the current background grain with the provided high-frequency SVG turbulence implementation.
- Add rough/noisy visual treatment to text, borders/lines, icons, controls, and decorative parts where practical in CSS.
- Remove component fill backgrounds so cards, menus, buttons, inputs, tags, article boxes, and similar UI surfaces read as line/text-only elements on the paper background.
- Preserve the previous functional changes:
  - floating article table-of-contents menu
  - message box trailing whitespace fix
  - `.vite/**` ignored by ESLint

## Non-goals

- Do not change article/content data.
- Do not redesign layout structure beyond what is needed for the no-fill treatment.
- Do not merge or commit automatically.
- Do not remove pre-existing untracked `.vite/`.

## Assumptions

- The provided HTML/CSS snippet is the source of truth for the noise behavior.
- The SVG filter can be embedded once in React and referenced from CSS with `filter: url(#rough-edge-8-0-25)`.
- Text noise will be implemented with CSS text-shadow/background clipping or equivalent CSS treatment where browser support allows, without making text unreadable.
- Component fill removal means normal component backgrounds become transparent; active/hover states may use colored borders, text, underline, or subtle noise instead of solid fills.

## Steps

1. Inspect component classes that currently set `background` or `background-color`.
2. Add shared CSS variables for the provided paper/background colors and noise data URL.
3. Replace body background decoration with the provided paper color plus fixed grain layer.
4. Add the rough-edge SVG filter definition to the app shell so CSS can reference it.
5. Remove or neutralize component fill backgrounds while keeping borders, layout, and interactive states legible.
6. Apply grain/rough treatments to borders, text, icons, and decorative elements with scoped pseudo-elements and CSS variables.
7. Check desktop and mobile UI, including article TOC and menus.
8. Run `python3 scripts/verify.py`.

## Verification

- Run `python3 scripts/verify.py`.
- Use browser/UI verification for:
  - no filled component panels remain in common pages
  - background is `#fdfff7` with grain
  - base/accent colors appear as `#4960ff` and `#d4ff0a`
  - text/lines/decorative parts show grain/noise treatment
  - floating TOC still works on desktop and mobile

## Open Issues

- Exact visual strength of text noise may need one follow-up tuning pass after browser inspection.
