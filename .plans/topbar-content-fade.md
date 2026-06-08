# Plan

## Goal

Remove the visible background impression around the “Back to blog list” control and fade article content out as it scrolls under the top bar.

## Scope

- Adjust article/topbar CSS only.
- Keep the “Back to blog list” button itself transparent.
- Add a top-edge fade layer near the fixed top bar so scrolling content becomes visually hidden before it reaches the bar.

## Non-goals

- Do not redesign the article layout.
- Do not change routing, copy, or article data.
- Do not revisit component background policy beyond this overlap/fade issue.

## Assumptions

- The issue is caused by article content scrolling behind the fixed top bar area.
- A CSS-only fade overlay is sufficient and safer than changing article markup.

## Steps

1. Inspect the current topbar and article stacking/order styles.
2. Add a fixed, pointer-events-none top fade layer through CSS.
3. Keep `.article-back` visually unfilled and below the fade layer.
4. Run repository verification.

## Verification

- Run `python3 scripts/verify.py --mode edit`.
- Search the touched CSS for unintended backdrop blur or component background changes.

## Open Issues

- Browser preview may be unavailable in this sandbox if the local server cannot bind to a port.
