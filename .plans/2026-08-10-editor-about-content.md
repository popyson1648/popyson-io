# Edit and publish About content

## Goal

Make the fixed About page fully editable, previewable, privately saveable, and publishable from the local content editor.

## Scope

- Add About as a third fixed content kind in the editor.
- Edit localized profile fields, biography, activities, career, education, links, and news with structured controls.
- Store unpublished About changes and assets under `.drafts/about/`.
- Support About revisions, conflict detection, discard, and publishing through the existing editor workflow.
- Render an About preview with the public site's components and styles.
- Allow selecting or capturing an avatar image and store it in the prescribed About asset directory.
- Cover phone, tablet, and desktop layouts.

## Non-goals

- Creating or deleting the About page itself.
- Replacing SmartHR UI components.
- Changing the public About page design.
- Making the editor publicly reachable.

## Assumptions

- About is one fixed item with the id `about`.
- Both `about.{ja,en}.toml` and `news.{ja,en}.toml` belong to that item.
- About images are stored under `src/content/about/assets/` and emitted as `/content-assets/about/about/<file>`, matching the existing content-asset pipeline.
- The user has approved implementation and the established PR-based merge workflow.

## Steps

1. Extend the content model with a fixed About item, TOML serialization, private drafts, history, validation, asset handling, and publication scope.
2. Extend editor API routing and publishing preflight/jobs for About.
3. Add a structured About editor for all profile and news fields, including repeatable-row controls.
4. Add About avatar selection/capture and preview payloads.
5. Render the About preview with the same public components and styles.
6. Add model, API, component, bundle, and responsive regression tests.
7. Run full verification and browser checks at phone, iPad, and desktop widths.
8. Commit, push, open a pull request, confirm checks, and merge.

## Verification

- Unit tests for About TOML and draft lifecycle.
- Component tests for About editing, list operations, image selection, and locale switching.
- Integration tests for editor API and publish scope.
- Browser checks for private save, preview, and responsive layout.
- `python3 scripts/verify.py`.

## Open Issues

- None.
