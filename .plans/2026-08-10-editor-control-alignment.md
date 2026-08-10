# Plan

## Goal

Make text and icons optically centered inside center-aligned editor controls across phone, tablet, and desktop layouts.

## Scope

- Audit buttons, icon buttons, segmented controls, dropdown triggers, status labels, toolbar actions, and dialog actions in the local editor.
- Normalize control content layout, line height, and internal wrappers without replacing SmartHR UI components.
- Preserve deliberate left alignment in navigation items, form labels, inputs, article content, and outline/history rows.
- Add regression coverage for the shared alignment rules.
- Browser-check 320, 390, 744, 820, 1024, and 1440 px widths and capture representative screenshots.

## Non-goals

- Changing the editor's visual hierarchy, available actions, or responsive breakpoints.
- Centering text that is intentionally left-aligned for reading or data entry.
- Changing the public site's controls.

## Assumptions

- Centered controls should use one shared flex alignment contract rather than per-button offsets.
- Multi-line content and content-navigation buttons remain outside the centered-control contract.
- A measured content-center difference of at most one CSS pixel is acceptable.

## Steps

1. Measure control and direct content rectangles in a real browser at representative viewport widths.
2. Identify recurring SmartHR UI wrappers and editor overrides responsible for horizontal or vertical drift.
3. Add narrowly scoped shared alignment rules and remove conflicting offsets.
4. Add static/component regression assertions for the shared contract.
5. Rerun browser measurements and visually inspect phone, tablet, and desktop screenshots.
6. Run the complete repository verification workflow and review the final diff.

## Verification

- `python3 scripts/verify.py`
- Measure centered control content at 320, 390, 744, 820, 1024, and 1440 px.
- Confirm representative text and icon controls remain within one CSS pixel of both axes.
- Confirm intentionally left-aligned content is unchanged.
- Capture and inspect representative phone, tablet, and desktop screenshots.

## Open Issues

- None.
