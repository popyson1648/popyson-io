# Plan

## Goal

Improve the project UI/UX and accessibility based on a source-level audit of the current React/Vite app.

## Scope

- Navigation, search modal, filter/sort popovers, article table of contents, application cards, reading list, RSS page, and shared visual system.
- Accessibility semantics, keyboard support, focus management, responsive behavior, readability, and perceived performance.
- Verification workflow for accessibility and UI regressions.

## Non-goals

- Replace the current visual direction or rewrite the app architecture.
- Add new product features beyond what is necessary to make existing flows usable and accessible.
- Merge changes automatically.

## Assumptions

- The current blue/lime risograph-style visual language should be preserved where it does not block readability or operability.
- This audit was performed without live browser rendering because the local preview server could not listen in this environment and `file:` navigation was blocked.
- `npm run build` is available and passes, but it currently emits a large chunk warning.
- A dedicated branch could not be created in this environment because `.git` is read-only.

## Steps

1. Fix interactive semantics and keyboard access.
   - Convert clickable non-interactive elements to native controls or links, especially `made-card` in `src/pages.jsx` and the filter menu back control in `src/blog.jsx`.
   - Add clear accessible names to icon-only buttons such as code copy, RSS copy, reading external link, theme buttons, and filter removal.
   - Mark active navigation and segmented states with `aria-current`, `aria-pressed`, or radio semantics where appropriate.
   - Review static chips rendered as disabled-looking buttons and make them non-focusable semantic text when they are not actions.

2. Harden modal and popover behavior.
   - Give the search dialog a labelled title or `aria-label`, trap focus while open, restore focus to the opener on close, and make the `ESC` close affordance a real button.
   - Add `aria-controls`/`aria-expanded` to dropdown trigger buttons and expose popover panels with suitable menu/listbox/dialog semantics.
   - Keep keyboard navigation predictable for filter menus, tag selection, sort controls, and mobile article TOC.

3. Improve responsive navigation and small-screen ergonomics.
   - Rework the fixed topbar at small widths so horizontal overflow is discoverable and does not hide core actions.
   - Ensure touch targets meet practical minimum sizes, especially the 22-24px topbar theme/search/RSS controls and 12px article/mobile controls.
   - Verify mobile article TOC placement and closing behavior so it does not cover content or leave focus behind hidden content.

4. Improve readability and visual affordance.
   - Audit contrast for `--text-faint`, metadata, nav items, tags, controls, and focus outlines against the paper background in both configured themes.
   - Reintroduce sufficient visible affordance for active/hover/selected states after the final transparent/no-fill CSS pass.
   - Keep focus outlines visible when controls have transparent backgrounds and no borders.
   - Respect `prefers-reduced-motion` for modal, menu, and overlay animations in addition to route fade.

5. Improve content structure and UX clarity.
   - Replace the hardcoded top-page Japanese heading with localized content or a brand/title that works in both languages.
   - Add meaningful labels or real image assets for application and related-post thumbnails, or keep placeholders fully decorative and remove visible placeholder text from user-facing UI.
   - Make RSS copy feedback screen-reader friendly with an `aria-live` status.
   - Consider a skip link to main content because the app uses a fixed top navigation.

6. Reduce initial payload and perceived performance risk.
   - Lazy-load Shiki and language/theme assets only when an article code block is rendered.
   - Consider route-level or feature-level dynamic imports for blog/article-heavy code.
   - Re-run build and Lighthouse after changes to confirm the large chunk warning and performance metrics improve.

7. Add accessibility verification.
   - Enable an accessibility verification phase in `.project/verification.toml` once a repeatable command is added.
   - Add automated checks with axe or Lighthouse accessibility in CI/local verification.
   - Add Playwright smoke checks for keyboard navigation through topbar, search, filters, article TOC, reading checkboxes, and RSS copy.

## Verification

- Run `python3 scripts/verify.py --mode edit` for lint/build coverage after implementation.
- Run `npm run build` and confirm no new build warnings beyond any intentionally accepted bundle warning.
- Run accessibility automation for key routes once added: `#/`, `#/blog`, one article route, `#/app`, `#/reading`, and `#/rss`.
- Manually verify keyboard-only operation: tab order, focus trap/restoration, Escape closing, arrow/Enter behavior, and visible focus.
- Manually verify desktop, tablet, and mobile widths for topbar, search modal, filter menus, article TOC, card grids, and reading list.

## Open Issues

- Live UI inspection was blocked in the current environment: `vite preview` failed with `listen EPERM`, and Playwright could not open `file://` URLs.
- Branch creation was blocked because `.git` is mounted read-only, so the repository branch policy could not be satisfied here.
- User approval was given and the source-level improvements were implemented.

## Implementation Notes

- Replaced non-semantic interactive elements with native buttons where applicable.
- Added accessible names, current/pressed/expanded states, search dialog focus management, copy live status, and a skip link.
- Added reduced-motion handling for modal/menu animations and strengthened transparent-control affordances.
- Lazy-loaded Shiki syntax highlighting assets from code blocks to reduce the initial application chunk.
- Added `scripts/check_accessibility_static.py` and enabled the accessibility phase in `.project/verification.toml`.
- Raised small public UI text to at least 12px, kept article body text at 16px across desktop and mobile, and added a static minimum font-size check.
- Set the performance phase to skip edit-mode verification because it requires the local preview server, which is blocked in this environment.
