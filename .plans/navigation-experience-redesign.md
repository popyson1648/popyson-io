# Plan

## Goal

Redesign the site navigation and preference controls so the experience is intentional instead of forcing every action into the current top bar. Keep the existing risograph/noise atmosphere.

## Scope

- Reconsider what belongs in the persistent top-level navigation.
- Move secondary controls such as theme, language, and RSS into a compact settings/preferences menu.
- Keep primary content navigation visible and predictable.
- Make the mobile experience fit without clipped items.
- Preserve the current visual mood: paper/noise texture, restrained linework, muted colors, and compact editorial feel.

## Non-goals

- Do not redesign the content model or routes.
- Do not change article/list data.
- Do not change the site background/noise system beyond what is needed for the navigation surface.
- Do not merge or clean unrelated existing worktree changes.

## Assumptions

- The primary destinations are top, About, Blog, App, and Reading List.
- Search is a primary utility because it supports content discovery.
- Theme, language, and RSS are secondary utilities. They should remain available but should not compete with navigation.
- On narrow screens, stable access and legibility are more important than showing every full label in the top bar.

## Research Notes

- Material Design top app bar guidance treats the top bar as a place for navigation, screen context, key actions, and overflow. It explicitly moves actions into overflow as width shrinks.
- Apple HIG tab bar guidance separates top-level navigation from actions, and recommends predictable persistent navigation for top-level sections.
- PatternFly overflow menu guidance uses overflow to declutter responsive toolbars.
- WCAG 2.2 adds focus-obscuring and target-size requirements that matter for sticky/floating navigation.
- Language switcher guidance recommends a clear control placed where users expect preferences, and labels should be understandable in their own language.

## Steps

1. Replace the current "all controls in topbar" model with:
   - left/center: primary nav links
   - right: search and one preferences button
   - preferences menu: language toggle, theme choices, RSS
2. Remove the recent mobile-only hidden-label workaround where it becomes unnecessary.
3. Style the preferences menu as a small, textured/blurred popover that matches the existing topbar/filter mood without introducing a new visual language.
4. Refine desktop and mobile topbar sizing so it is one stable row, centered, and never clips.
5. Verify accessibility:
   - controls have names
   - menu state is announced with `aria-expanded`
   - focus order remains logical
   - tap targets are not too small
6. Run repository verification and inspect the UI with browser screenshots at mobile and desktop widths.

## Verification

- Run `python3 scripts/verify.py`.
- Build and inspect with Playwright or equivalent browser automation at at least:
  - 320px mobile top page
  - 375px mobile Blog page
  - 1280px desktop top page
- Check that topbar content does not clip or overlap, and the preferences menu is reachable.

## Open Issues

- The exact label for the preferences button may need tuning after visual inspection.
- If the existing dirty worktree contains competing topbar CSS, the implementation will need carefully scoped overrides rather than broad cleanup.
