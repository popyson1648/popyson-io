# Editor performance and loading UX

## Goal

Reduce the editor's cold-load cost on slower mobile devices and make opening content provide immediate, accessible feedback.

## Scope

- Split the Markdown editor and CodeMirror dependencies from the initial editor bundle.
- Load the editor code in parallel with the selected content.
- Add content-opening state, accessible progress feedback, and duplicate-request protection.
- Preserve the existing SmartHR UI components, responsive layout, and local-only serving model.
- Measure the optimized build before and after the change on desktop, tablet, and throttled mobile profiles.
- Commit, push, open a pull request, and merge after required checks pass.

## Non-goals

- Redesigning the editor or replacing SmartHR UI.
- Changing publishing, image storage, authentication, or Tailscale Serve behavior.
- Optimizing CSS that profiling shows has no meaningful effect on LCP.
- Exposing the editor from the public site.

## Assumptions

- The existing branch changes for toolbar density and control alignment remain in scope.
- Content is edited only after a list item is selected, so CodeMirror is not required for the initial empty shell.
- The user has approved automatic merge after CI passes for this task.

## Steps

1. Add an explicit lazy module loader for `MarkdownEditor` and an accessible workspace fallback.
2. Start loading the editor module when content selection begins, in parallel with the content API request.
3. Track the item being opened, prevent duplicate or overlapping reads, and expose progress in the content list and live status text.
4. Add focused tests for code splitting, loading state, and the existing responsive styling guarantees.
5. Build and profile cold loading on desktop, iPad-sized, and throttled mobile viewports; compare bundle size and LCP with the baseline.
6. Run `python3 scripts/verify.py`, review the final diff, then commit and push the branch.
7. Open a pull request, confirm required checks, and merge it.

## Verification

- Editor unit, integration, and component tests.
- Production editor build and bundle inspection.
- Chrome DevTools performance traces with no throttling and Slow 4G / 4x CPU throttling.
- Responsive checks at phone, iPad, desktop, including keyboard and accessibility state.
- Full repository verification with `python3 scripts/verify.py`.

## Open Issues

- None.
