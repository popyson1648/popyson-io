# Plan

## Goal

Add About as a first-class content type in the existing local web editor, with
the same private-draft, exact-preview, history, image, and publish-safety model
already used for Blog and Works.

## Scope

- Make `https://wsl-ubuntu.tail29f20.ts.net:4173/editor` the stable bookmarked
  editor URL through Tailscale Serve. Bind Vite only to `127.0.0.1`, keep the
  existing Serve configuration on port 443 intact, and add a dedicated HTTPS
  listener on port 4173.
- Accept Serve-proxied API requests only when the TCP peer is loopback, the HTTP
  host is the detected Tailscale DNS name, the injected Tailscale login matches
  the WSL node owner, and state-changing requests are same-origin. Retain local
  `localhost` access for recovery. Do not generate application tokens.
- Add an About tab and one About entry to the content library.
- Edit the Japanese and English profile fields: name, role, location, tagline,
  biography paragraphs, activities, career, education, and links.
- Edit localized News entries, including add, remove, reorder, date, title,
  description, and optional link.
- Select or photograph an avatar from the OS picker. Store it in the About
  draft assets directory and publish it under `/content-assets/about/`.
- Keep About changes under `.drafts/about/` until explicit publication.
- Provide autosave, manual checkpoints, rolling history, restore, conflict
  detection, discard/revert, validation, and `main`-only publication.
- Render About preview with the same `AboutPage` component and public CSS used
  by the production site, rather than maintaining duplicate preview markup.
- Publish the four About TOML files and About assets as one isolated commit.
- Treat the Japanese and English repeatable rows as one persistence unit: reject existing or submitted parity mismatches before editing or saving, then atomically replace all four TOML files so a partial locale write cannot drift the pairs.

## Non-goals

- Editing the Works cards shown in About; they remain derived from Works.
- Editing page-section labels such as "Career" and "News"; they remain in the
  site localization table.
- Adding authentication or exposing the editor from the production site.

## Assumptions

- "Aboutを編集" includes both the profile and the News section because both
  are authored under `src/content/about/` and rendered on the About page.
- Japanese and English array rows remain paired by position. Loading and saving
  validate equal row counts before the shared-row UI is exposed, and a mismatch
  is a blocking validation error rather than data the editor silently repairs.
- Saving writes the Japanese and English profile and News TOML files to temporary
  siblings first, validates the complete set, and replaces the four live files
  as one operation with rollback if any replacement fails.
- Existing About TOML comments may be normalized when the structured data is
  first saved; the semantic data and public output remain unchanged.

## Steps

1. Add the stable Tailscale Serve URL, loopback-only Vite binding, Tailscale
   identity and Origin authorization, strict editor port, documentation, and
   security tests.
2. Add an About draft model for the four TOML files, revisions, strict locale-row
   parity validation on load and save, checkpoints, restore, discard, asset
   conversion, atomic paired-locale saves, and atomic promotion.
3. Extend the editor API, content list, asset serving/build emission, and
   publish command with the fixed About identifier and isolated content scope.
4. Add structured SmartHR UI forms for profile, paired repeatable sections,
   links, and News, including accessible add/remove/reorder controls.
5. Refactor the public About page into a reusable data-driven view and render
   that exact view in the editor preview iframe.
6. Add avatar selection/camera flow, save-state messaging, readiness errors,
   history, discard, and publish preflight to the About editor.
7. Update project documentation and add model, API/publish, component,
   responsive, preview-parity, and regression tests.

## Verification

- Test TOML round trips, rejection of pre-existing and submitted locale-row
  parity mismatches, rollback after each possible partial four-file save,
  invalid dates/URLs, revision conflicts, history restoration, discard, and
  failed promotion rollback.
- Test loopback address and host handling, Tailscale host/login enforcement,
  same-origin mutation enforcement, token removal, and strict-port behavior.
- Test About-only Git scope and ensure Blog/Works/public site behavior does not
  regress.
- Browser-check desktop and 320/390/768/900 px layouts, keyboard reordering,
  avatar album/camera selection, exact preview, and publish preflight.
- Run `python3 scripts/verify.py` and confirm the production build still omits
  the editor entry and APIs.

## Open Issues

- Revised and approved on 2026-08-08. Implement the Tailscale Serve URL before
  the About content-type work so subsequent browser verification uses the final
  access model.
