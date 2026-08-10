# Plan

## Goal

Make the editor formatting toolbar compact and immediately usable on phones without horizontal scrolling or excessive vertical whitespace.

## Scope

- Replace the current labeled mobile toolbar grid with a dense wrapping button layout.
- Keep every editing, formatting, and image action visible at 320 px and wider.
- Reduce mobile toolbar padding, gaps, and visual button size while retaining accessible labels, pressed state, keyboard behavior, and visible focus.
- Add regression coverage for the mobile layout contract.
- Verify the rendered editor at 320, 390, and 430 px viewport widths and capture screenshots.

## Non-goals

- Changing available Markdown commands or their behavior.
- Redesigning the desktop toolbar.
- Changing the editor's navigation, metadata form, or preview layout.

## Assumptions

- Compact icon controls are appropriate because every action retains its accessible name and title.
- Three wrapped rows at 320 px and two rows at common wider phone widths are acceptable; horizontal toolbar scrolling is not.
- The existing SmartHR UI button components remain in use.

## Steps

1. Add a mobile layout class contract that allows toolbar groups to participate in one shared wrapping grid while visually hiding group labels.
2. Reduce mobile container padding, inter-control gaps, and button dimensions without affecting desktop sizing.
3. Add component or static regression assertions for wrapping, overflow, and compact dimensions.
4. Run repository verification and browser-check 320, 390, and 430 px viewports.
5. Review screenshots for toolbar height, clipping, control accessibility, and editor space before completion.

## Verification

- `python3 scripts/verify.py`
- Confirm the toolbar has no horizontal overflow at 320, 390, and 430 px.
- Confirm all toolbar actions remain visible and operable without horizontal scrolling.
- Confirm the mobile toolbar occupies no more than three compact rows at 320 px and two rows at 390/430 px.
- Capture screenshots for all three widths.

## Open Issues

- None.
