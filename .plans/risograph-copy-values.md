# Plan

## Goal

Show the current risograph tuning values under the text sliders and make them copyable.

## Scope

- Add a compact output area below the text control group.
- Display the current background, circle, and text tuning values in a readable JSON-like format.
- Add a copy button that writes the values to the clipboard.
- Keep the output inside the existing experimental control panel.

## Non-goals

- Do not persist values to local storage.
- Do not change the visual defaults unless needed for the output.
- Do not commit or merge automatically.

## Assumptions

- The copied payload should include all risograph values, not only text values, so the chosen overall look can be shared exactly.

## Steps

1. Add formatted value output and copy state to `RisographControls`.
2. Place the output below the text sliders.
3. Style the output and copy button for desktop and mobile.
4. Verify with `python3 scripts/verify.py`.
5. Verify in browser that the output updates after slider changes and copy works.

## Verification

- `python3 scripts/verify.py`
- Browser check for live value output and copy button behavior.

## Open Issues

- None before implementation.
