# Plan

## Goal

Improve the top bar theme control and replace the current Blog filter/sort controls with a more coherent, production-quality control surface.

## Scope

- Top bar theme control:
  - Show one compact theme button in the top bar.
  - Open a small menu with light, dark, and system theme options.
  - Keep the icons visible in the menu and preserve accessible labels/states.
- Blog controls:
  - Replace isolated icon-only filter/sort buttons with a clearer toolbar.
  - Keep controls compact, but make the current sort and active filter state understandable.
  - Keep RSS outside the filter UI.
  - Preserve current filtering and sorting behavior.
- Styling:
  - Keep the current site atmosphere.
  - Avoid bulky card-like UI.
  - Maintain touch target size and keyboard/screen-reader affordances.

## Non-goals

- Do not redesign article cards or article pages.
- Do not change the underlying blog data or search index behavior.
- Do not merge or clean up unrelated dirty files.

## Assumptions

- The current always-visible three-button theme group is too wide for the top bar.
- A single theme trigger with a popover is acceptable because the selected theme remains visible through the current icon.
- Blog filter/sort controls should be compact but not cryptic; visible labels for the main actions are preferable to icon-only controls.

## Steps

1. Update `TopBar` to replace the three visible theme buttons with a compact dropdown trigger that shows the active theme icon.
2. Update Blog filter/sort markup into a unified toolbar with clear action labels, active filter chips, sort summary, and count.
3. Adjust CSS for desktop and mobile so the toolbar wraps cleanly and does not look like disconnected icon buttons.
4. Verify with `python3 scripts/verify.py`.
5. Review the resulting diff for regressions and report any remaining UI verification limitations.

## Verification

- Run `python3 scripts/verify.py`.
- Inspect changed markup/CSS for accessibility semantics, keyboard access, labels, and mobile wrapping.

## Open Issues

- Browser screenshot verification depends on local browser tooling availability.
