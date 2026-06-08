# Plan

## Goal

Add an on-page experimental control bar for tuning risograph noise and edge distortion, fix missing grain on the background and two decorative circles, and reduce excessive text distortion.

## Scope

- Add a temporary-looking but usable tuning bar at the top of the site.
- Drive background color, base/accent circle colors, circle opacity, circle noise opacity, background noise opacity, noise frequency, edge distortion, and edge roughness from React state.
- Generate the SVG turbulence data URL and rough-edge filter from the current control values.
- Replace the current gradient-only background decoration with actual circle layers containing color and noise overlays.
- Remove the rough-edge displacement filter from normal text and keep text treatment subtle.
- Preserve the existing no-fill component direction, floating TOC, and message-box fix.

## Non-goals

- Do not redesign the whole site layout.
- Do not add Prism/code-output panels from the sample.
- Do not commit, merge, or create a PR.

## Assumptions

- The provided playground is the implementation reference for generating noise data URLs and dynamic SVG filters.
- The requested colors remain `#4960ff`, `#d4ff0a`, and `#fdfff7` as defaults.
- The control bar is allowed to be visible on all pages while this is experimental.

## Steps

1. Extend app state with risograph tuning defaults and write those values to CSS custom properties.
2. Add the dynamic SVG filter container and a top-of-site control bar.
3. Replace the pseudo-element gradient background with DOM-based grainy circles plus the global background noise layer.
4. Update CSS so the circles and background use the generated noise URL, and text uses only subtle ink offset/noise without strong displacement.
5. Verify with `python3 scripts/verify.py` and browser checks for desktop/mobile visual state.

## Verification

- Run `python3 scripts/verify.py`.
- Use browser inspection to confirm:
  - body/background is `#fdfff7`
  - background noise layer uses a generated `feTurbulence` data URL
  - both decorative circles have color and noise overlay layers
  - text no longer uses the strong displacement filter
  - control sliders update CSS variables and filter ID
  - layout remains usable on desktop and mobile

## Open Issues

- Final values may still need visual tuning after the user tries the experimental bar.
