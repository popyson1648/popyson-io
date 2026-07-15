# Plan

## Goal

Bring the dark theme into the light theme's blue-and-lime design system while keeping the interface genuinely dark and readable across the variable black/lime background.

## Scope

- Rebalance dark-theme color tokens for background layers, blue ink hierarchy, borders, controls, and chrome.
- Preserve the saturated brand blue and lime as intentional identity colors instead of dimming every role uniformly.
- Tune the dark background's black and low-luminance lime endpoints without changing its geometry or proportions.
- Add automated contrast checks for dark-theme foreground/background pairs.
- Verify representative routes and interaction states at desktop and mobile sizes.

## Non-goals

- Do not change the light-theme palette or make dark mode as bright as light mode.
- Do not change typography, spacing, layout, gradient geometry, or background color proportions.
- Do not redesign components or add decorative surfaces/cards.
- Do not merge the branch.

## Assumptions

- The light theme is the canonical expression of the design system.
- `#4960ff` remains the static saturated blue for solid fills, paired with `#fdfff7` text.
- `#d4ff0a` remains the saturated lime for small accents and interaction markers.
- The large dark-theme lime field remains a separate low-luminance lime so the theme stays dark and blue text remains readable.
- Normal text must reach at least 4.5:1 against both dark background endpoints; meaningful borders, controls, and focus indicators must reach at least 3:1 against adjacent colors.

## Steps

1. Record the current dark token roles and contrast ratios against both the black and low-luminance lime background endpoints.
2. Define a role-based dark palette:
   - distinct neutral background and raised-surface layers;
   - a clearer blue text hierarchy that remains recognizably blue;
   - stronger border and focus roles;
   - static saturated blue fills with a verified on-fill color;
   - saturated lime reserved for small identity and interaction accents;
   - a dark lime background endpoint that preserves contrast.
3. Update `src/content/theme.toml` and recompute the dark background color matrix in `src/app.jsx` when its endpoint changes.
4. Make only minimal CSS role corrections where a component currently uses the wrong semantic token, including section markers and interaction states.
5. Add a Vitest contrast audit that parses the theme tokens and asserts the required dark foreground/background pairs.
6. Run repository verification and visually inspect About, Blog, article, Works, and Reading List in both themes at desktop and mobile widths.

## Verification

- `python3 scripts/verify.py`
- Automated WCAG contrast assertions for text, controls, focus, filled states, and both dark background endpoints.
- Playwright screenshots at 1440x1000 and 390x844 for representative routes and open/selected/focus states.
- Final light/dark comparison to confirm the light theme is unchanged and the dark theme still reads as dark.

## Research Basis

- WCAG 2.2 SC 1.4.3: normal text requires 4.5:1 and large text requires 3:1.
  https://www.w3.org/TR/WCAG22/#contrast-minimum
- WCAG 2.2 SC 1.4.11: meaningful UI and state indicators require 3:1 against adjacent colors.
  https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast
- Adobe Spectrum: theme-specific foreground colors should be contrast-derived from each background, while static brand colors are appropriate for filled backgrounds with a verified on-color.
  https://spectrum.adobe.com/page/color-system/
  https://spectrum.adobe.com/page/using-color/
- IBM Carbon: dark themes use role-based tokens and progressively lighter layers; token roles remain stable while values change by theme.
  https://carbondesignsystem.com/elements/color/overview/
- Atlassian Design System: light and dark themes map the same semantic tokens to theme-specific values and require WCAG AA contrast.
  https://atlassian.design/foundations/color-new/

## Open Issues

- Final hex values will be selected by contrast calculation and visual comparison during implementation; they will not be chosen by brightness alone.
