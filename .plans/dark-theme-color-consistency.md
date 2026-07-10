# Plan

## Goal

Make dark mode use the color tokens defined in `src/content/theme.toml`, and align the dark background/topbar treatment with the light theme's visual design.

## Scope

- Audit the effective CSS rules for the page background, grain layers, topbar, menus, and related frosted/no-blur surface tokens.
- Keep color values in `src/content/theme.toml` as the single source of truth for theme colors.
- Move theme-dependent surface styling to CSS custom properties that are derived from `theme.toml` tokens instead of hard-coded light assumptions.
- Adjust dark-specific grain/blend/background behavior only where needed to preserve the same design language as light mode.
- Verify both light and dark themes in desktop and mobile layouts.

## Non-goals

- Redesign the site.
- Change routing, content loading, or theme persistence behavior.
- Refactor unrelated accumulated CSS unless it directly affects the dark/light theme mismatch.

## Assumptions

- The current intended visual language is the late-stage fixed, rectangular topbar with transparent controls and a subtle surface treatment.
- `src/content/theme.toml` should remain the only place for actual theme colors; `src/styles.css` and `src/app.css` may define non-color behavior and compose colors through `var(--*)` tokens.
- Existing unrelated untracked files such as `.claude/` should remain untouched.

## Steps

1. Inspect the generated theme CSS usage and the late-winning CSS rules that affect background and topbar rendering.
2. Update theme tokens as needed so dark mode has matching semantic colors for background, subtle surfaces, lines, text, accents, and on-accent contrast.
3. Update CSS surface variables and topbar/background rules so both themes use the same structural design while resolving colors from `theme.toml`.
4. Remove or override hard-coded light-only visual assumptions that make dark mode diverge.
5. Run repository verification with `python3 scripts/verify.py`.
6. Run UI verification for light and dark modes on desktop and mobile, including screenshots or DOM/CSS checks as appropriate.

## Verification

- `python3 scripts/verify.py`
- Local browser check of light and dark theme rendering.
- Desktop and mobile viewport checks for topbar/background consistency.

## Open Issues

- None.
