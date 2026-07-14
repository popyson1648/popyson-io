# Decision

## Title

Remove the background riso circles

## Date

2026-07-10

## Status

Accepted

## Decision

Delete the two decorative riso circles (lime `--accent-alt` top-left, blue `--accent` bottom-right) from the app background, including their markup, styling, and noise/displacement machinery. The paper grain (`.bg-noise`) stays.

## Context

The circles sat behind content on every page. They repeatedly caused legibility concerns (text passing over the lime circle), needed special-casing per theme (multiply vs. screen blends), and were already disabled provisionally once during the dark-theme color work.

## Alternatives

- Keep them hidden with CSS (`display: none`) — leaves dead markup and styling to maintain.
- Redesign them (reposition, recolor, contain to margins) — no concrete design direction exists; can be done later from scratch if wanted.

## Reason

Removing dead visual machinery is cheaper than maintaining it, and the background reads cleaner in both themes without the circles. A future decorative treatment can start fresh rather than inherit this implementation.

## Consequences

- `RISOGRAPH_DEFAULTS` keeps only background and (inert) text noise knobs.
- The dark-theme blend special case now applies only to `.bg-noise`.

## Revisit Conditions

If a new decorative background treatment is designed for the site identity.
