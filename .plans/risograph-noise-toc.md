# Plan

## Goal

Float the article contents menu, remove the visual trailing line in message boxes, add grain to components, and add risograph-style background decoration using the local gist implementation.

## Scope

- Article table of contents layout and behavior.
- Message box rendering and spacing.
- Global/component CSS for SVG turbulence grain and risograph-style decoration.
- Verification with the repository verification script.

## Non-goals

- Content rewrites.
- New JavaScript dependencies.
- Changes to unrelated routing, data, or tweak panel behavior.

## Assumptions

- The local gist under `.tmp/gist/1283b3bc8de9d0bbd9135e7b7ec17722/` is the intended source for the grain implementation.
- The reported message box issue is a visual trailing line/space caused by text whitespace or CSS spacing, not article content requiring semantic changes.

## Steps

1. Add reusable SVG noise CSS variables and grain layer rules based on the local gist.
2. Apply a risograph-style grain decoration to the page background.
3. Apply grain to major component surfaces while keeping text readable and controls usable.
4. Make the article contents menu float on desktop and mobile.
5. Trim message text and adjust message spacing.
6. Run repository verification and inspect the changed UI if needed.

## Verification

- Run `python3 scripts/verify.py`.
- Run or rely on the included build/lint phases from the verification script.

## Open Issues

- None.
