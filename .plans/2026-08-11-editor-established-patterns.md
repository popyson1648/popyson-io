# Plan

## Goal

Align the editor with interaction patterns already established by widely used writing and publishing tools, while preserving the meaning and capabilities of the current workflows.

## Scope

- Benchmark the shell against Notion, WordPress Gutenberg, Ghost, Substack, GitHub Markdown, Google Docs, and VS Code Markdown.
- Remove the custom colored-dot publication/save indicator and duplicate persistent save-state presentation.
- Consolidate global actions in the top bar: navigation, preview, settings, save, publish, and overflow actions.
- Keep the title as a padded, borderless document title rather than a form-like boxed field.
- Present write/split/preview as editor-view tabs adjacent to the editing workspace, following GitHub and Markdown-editor conventions.
- Move publication metadata out of the inline accordion into a conventional settings side panel opened from the top bar.
- Move the outline out of the inline card into a conventional dismissible side panel.
- Retain the collapsible content sidebar, searchable content list, status filter, locale switch, responsive mobile drawer, and resizable split preview.
- Update component, style, accessibility, and rendered responsive regression tests.

## Non-goals

- Changing content files, API contracts, draft/publish semantics, permissions, or preview rendering.
- Replacing the Markdown editor engine.
- Copying any product's visual identity, branding, or proprietary assets.

## Assumptions

- The user's second sentence means that patterns used by established editors should be adopted actively; it is treated as a correction of the contradictory wording.
- A pattern is eligible when it has a clear analogue in at least one established editor and does not conflict with a stronger pattern shared by several benchmarks.
- Product-specific controls such as locale switching may remain when expressed through a standard tab or menu pattern.

## Steps

1. Define a control-to-reference matrix and remove UI that has no benchmark analogue.
2. Refactor the top bar and eliminate the colored status dot and duplicate save status.
3. Convert publication settings and document outline to dismissible side panels.
4. Reorganize title, locale, and editor-view controls into a quieter document header and workspace tab bar.
5. Preserve responsive containment at iPad landscape, desktop, 200% zoom, and mobile widths.
6. Update tests for control locations, panel behavior, accessible names, and overflow constraints.
7. Run the repository verification suite and visually inspect representative viewports in Chrome.
8. Review the final diff against the benchmark matrix before requesting merge approval.

## Verification

- `python3 scripts/verify.py`
- Rendered Chrome checks at 1024px, 1440px, 512px, and a 200% text/full-page zoom equivalent.
- Keyboard and screen-reader semantics for the sidebar, settings panel, outline panel, view tabs, save, and publish actions.
- Confirm zero horizontal page overflow and that all primary actions remain reachable.

## Open Issues

- Confirm that the contradictory sentence was a typo; otherwise the requested design rule is impossible to apply consistently.
