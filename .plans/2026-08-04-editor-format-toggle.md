# Plan

## Goal

Make repeat formatting actions remove the existing Markdown formatting instead
of nesting another copy of the same markers.

## Scope

- Convert bold, italic, strikethrough, and inline-code actions into toggles.
- Support both selection shapes produced by normal editing:
  - the selected text sits between markers, such as `**selected**`;
  - the selection includes the markers, such as `**selected**`.
- Preserve the inner text selection after applying or removing formatting so a
  repeated toolbar click or keyboard shortcut operates on the same text.
- Make heading, quote, list, and task prefixes toggle for selected lines rather
  than accumulate duplicate prefixes.
- Make the link action remove an existing Markdown link wrapper when its label is
  selected, while preserving the label text.
- Keep code-block, table, callout, and image actions as insertion actions.
- Add unit and component regression coverage for toolbar clicks and keyboard
  shortcuts.

## Non-goals

- Parsing arbitrary nested Markdown with a full syntax tree.
- Converting between different active formats in one click.
- Adding active/pressed toolbar styling based on the caret position.

## Assumptions

- “もう一度押す” includes clicking the same toolbar action or using the same
  keyboard shortcut while the editor-preserved selection remains active.
- Removing formatting keeps only the human-readable selected text and updates
  the selection bounds to that text.

## Steps

1. Add reusable inline-wrapper, link-wrapper, and line-prefix toggle helpers.
2. Route repeatable Markdown commands through those helpers without changing
   insertion-only commands.
3. Add unit cases for applying/removing each marker shape and preventing
   duplicate prefixes.
4. Add a component regression test that applies and removes bold through the
   toolbar while preserving selection.
5. Run focused tests, full repository verification, and a browser interaction
   check in the running editor.

## Verification

- Select plain text, click Bold twice, and confirm the original Markdown and
  selection are restored.
- Repeat for italic, strikethrough, inline code, link, headings, quote, list, and
  task actions.
- Confirm `Ctrl`/`Cmd` + `B` and `Ctrl`/`Cmd` + `I` toggle as well.
- Confirm nested but different formatting, such as bold inside a link, is not
  removed accidentally.
- Run `python3 scripts/verify.py`.

## Open Issues

- Superseded by `2026-08-04-editor-full-ux-audit.md`, which expands the work from
  formatting toggles to the complete authoring and publication workflow.
