# Plan

## Goal

Make the iPhone background match the desktop lime hue, paper white, and relative
luminance without risking the existing background implementation.

## Scope

- Use the current desktop rendering as the canonical visual reference.
- Remove the mobile yellow shift and excessive white/lime luminance.
- Keep the background within standard dynamic range so it does not appear
  brighter than the site's ordinary SDR thumbnail images.
- Perform the experiment on a dedicated branch and separate Git worktree.
- Leave every background change uncommitted for easy review and removal.

## Non-goals

- Change thumbnails, article rendering, top-bar/filter translucency, or other UI
  behavior.
- Commit, merge, or deploy the experimental background changes.
- Modify the main UI-fix branch.

## Assumptions

- The checked-in thumbnail PNGs are ordinary 8-bit RGB images without embedded
  ICC/HDR metadata.
- The current `contrast(170%) brightness(1000%)` noise crush is the likely
  source of device-dependent over-bright compositing.
- The dedicated branch is `experiment/mobile-background-sdr`.
- A separate worktree keeps these uncommitted changes out of the UI-fix branch.

## Steps

1. Create a clean worktree on `experiment/mobile-background-sdr` from the same
   base revision as the UI-fix branch.
2. Capture the current desktop background as the visual reference.
3. Replace the over-range brightness crush with a bounded sRGB channel
   threshold while preserving the current gradient, multiply blend, and grain.
4. Add `dynamic-range-limit: standard` as a progressive SDR cap.
5. Compare desktop and iPhone-sized screenshots and representative pixels.
6. Run the full repository verifier.
7. Leave the final diff uncommitted in the dedicated worktree.

## Verification

- Confirm representative desktop background pixels match the baseline.
- Confirm desktop and iPhone-sized screenshots retain the intended lime hue.
- Confirm neither implementation file contains `brightness(1000%)` as an
  active CSS filter.
- Verify light and dark themes in a browser.
- Run `python3 scripts/verify.py`.

## Open Issues

- Chromium cannot fully emulate physical iPhone Safari color management. A
  physical iPhone comparison remains the decisive check.
