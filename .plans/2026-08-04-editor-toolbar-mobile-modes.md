# Plan

## Goal

Make every Markdown and image tool reachable without horizontal scrolling, and
remove the non-functional split-mode choice from phone layouts.

## Scope

- Divide the toolbar into clear groups for headings, inline formatting, block
  elements, and images.
- Allow groups and controls to wrap across multiple rows at every width instead
  of using a horizontally scrolling strip.
- Preserve SmartHR UI buttons, accessible toolbar/group labels, and all existing
  formatting, photo-library, camera, paste, and drop behavior.
- Detect phone-width layouts in the editor component, omit `Split` from the mode
  options there, and automatically switch an existing split selection to
  `Write` when the viewport becomes narrow.
- Keep `Write` and `Preview` available on phones; retain all three modes and the
  resizable split on larger screens.
- Add component coverage for the grouped toolbar and responsive mode behavior,
  then verify desktop and 390 px layouts manually.
- Capture cold-load performance traces for the editor and representative public
  pages before changing performance-sensitive code. Inspect Core Web Vitals,
  render blocking, network dependency chains, bundle composition, and runtime
  work.
- Apply only evidence-backed optimizations with measurable impact, then repeat
  the same traces and report before/after values. Keep the editor out of the
  production bundle and prevent public-site performance regressions.

## Non-goals

- Changing Markdown syntax or formatting commands.
- Replacing SmartHR UI components.
- Adding a simultaneous editor/preview layout on phones.
- Redesigning the desktop split pane or public-site preview.
- Broad visual changes or speculative dependency replacements that are not
  supported by the measurements.

## Assumptions

- “複数団体” means arranging toolbar actions into multiple semantic groups and
  rows.
- The final sentence refers to phones: the `Split` button should be absent on
  phone-width layouts, not removed from desktop.
- The existing 760 px responsive breakpoint remains the boundary between phone
  and larger layouts.

## Steps

1. Refactor toolbar command definitions into heading, inline, block, and image
   groups and render accessible group containers.
2. Replace horizontal toolbar scrolling with wrapping group and button layouts,
   including compact phone spacing.
3. Add a responsive media-query state, remove the phone `Split` option, and
   normalize split mode to write mode when entering the phone layout.
4. Update component tests and contributor documentation where the responsive
   behavior is described.
5. Measure editor and public-page cold loads with Chrome performance traces;
   inspect Core Web Vitals, network requests, bundle output, and code paths.
6. Implement measured performance improvements, repeat the same traces, and
   retain changes only when they improve the target without regressions.
7. Run formatting, lint, type checking, component tests, full repository
   verification, and desktop/mobile browser checks.

## Verification

- Confirm all toolbar actions are visible without horizontal toolbar scrolling
  at desktop and 390 px widths.
- Confirm toolbar groups expose accessible labels and every existing action still
  runs.
- Confirm phones show only `Write` and `Preview`, including after resizing from a
  desktop split session.
- Confirm desktop retains `Write`, `Split`, `Preview`, and the resize handle.
- Record comparable before/after load metrics and verify production bundle size
  plus Lighthouse do not regress.
- Run `python3 scripts/verify.py`.

## Open Issues

- None. The user approved the toolbar and mobile-mode plan and explicitly added
  measurement-driven performance optimization.
