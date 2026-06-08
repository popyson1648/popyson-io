# Plan

## Goal

Correct the navigation utility placement so language switching is discoverable and RSS appears where users expect subscription links.

## Scope

- Move language switching out of the preferences menu into the persistent topbar.
- Keep theme inside preferences because it is a display preference, not navigation.
- Move RSS out of preferences.
- Place RSS in a subscription-oriented location:
  - visible in the footer as a stable global feed link
  - optionally visible on Blog as a small feed/subscription affordance near the blog context
- Keep the existing atmosphere and the recent simplified topbar structure.
- Preserve mobile fit and accessibility.

## Non-goals

- Do not redesign all page layouts.
- Do not change feed generation or RSS content.
- Do not introduce social links or a new global footer system beyond the RSS placement needed here.

## Research Notes

- Language switcher guidance recommends visibility without hover, commonly in or near the header or footer, because users must discover it before they can read the site comfortably.
- RSS discovery guidance commonly points to:
  - `<link rel="alternate" type="application/rss+xml">` autodiscovery in the document head
  - common feed paths such as `/rss` or `/feed`
  - visible footer/sidebar/blog-context links when the site chooses to expose RSS in the UI
- RSS is a subscription/follow action, not a display preference. It should not live inside a settings/preferences menu.

## Steps

1. Update `TopBar` to show:
   - primary nav
   - search
   - language switcher
   - preferences button for theme only
2. Remove RSS from the preferences menu.
3. Keep RSS in the footer, and inspect whether the Blog page already has a context area suitable for a visible RSS link.
4. Adjust topbar CSS so the added language button still fits at 320px without clipping.
5. Verify keyboard/accessibility names and ARIA state.
6. Run `python3 scripts/verify.py`.
7. Use browser inspection at 320px, 375px Blog, and 1280px.

## Verification

- `python3 scripts/verify.py`
- Browser geometry check for:
  - 320px top page
  - 375px Blog page
  - 1280px desktop
- Confirm no horizontal overflow and that language is visible outside the preferences menu.

## Open Issues

- If the topbar becomes too dense at 320px, the first fallback is tighter spacing, not hiding language.
- Whether to add a Blog-local RSS link depends on the current Blog layout and available space.
