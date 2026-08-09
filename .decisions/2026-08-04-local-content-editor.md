# Decision

## Title

Run the content editor as a token-protected local Vite server

## Date

2026-08-04

## Status

Superseded by `2026-08-08-editor-tailscale-serve-auth.md` for access control and
startup URL behavior. The draft, asset, preview, and publication decisions
remain accepted.

## Decision

The Blog and Works editor is a development-only `/editor` route started with
`npm run editor`. Its file, image, preview, and publish APIs exist only in that
server process. A random token is generated for each run and required by every
editor API request. The server binds to the local network by default for phone
access; an author can explicitly request a loopback-only host.

Private saves remain Markdown with TOML front matter under the Git-ignored
`.drafts/` tree. Uploaded body images remain beside their draft entry under
`assets/`. The editor server prefers draft assets at
`/content-assets/<kind>/<id>/<file>`, while production emits only published
assets from `src/content/`, so preview and production use one stable URL.

Publishing validates both locale files, promotes the selected draft to
`src/content/`, verifies the repository, then commits and pushes only the
currently open content directory. It removes the private draft only after a
successful push. It never merges, stages unrelated paths, or enables a backend
in the deployed site.

## Context

The site is statically deployed, while authoring needs controlled writes to the
checked-out repository and access from both desktop and phone browsers. Browser
APIs alone cannot write the repository or run its existing verification and Git
publishing workflow.

## Alternatives

- Add a hosted database and authenticated administration application.
- Store images under `public/` independently from their content entry.
- Let the editor invoke the existing kind-wide publish command unchanged.

## Reason

The local server preserves the repository as the source of truth and leaves the
public deployment static. Per-run tokens reduce accidental LAN exposure.
Entry-local assets move, review, and publish with their Markdown. Restricting
publish to one entry makes the Git effect match the item visible in the UI.

## Consequences

- LAN access is enabled by default and requires a URL carrying the run token;
  run with `--host 127.0.0.1` when only the current computer should connect.
- The Vite build owns an additional deterministic asset-copy step.
- `.drafts/` is local authoring state. It is neither versioned nor backed up and
  must not be treated as cross-device storage.
- Publishing can fail because of validation, verification, staged unrelated
  files, branch/remote configuration, or push errors; the editor reports these
  without merging or widening the staged scope.
- The editor uses a separate `editor.html` Vite entry served only by the editor
  command. The normal production build keeps `index.html` as its sole entry and
  does not ship the editor frontend or write API.
- A separate `editor-preview.html` entry imports the public site's CSS and uses
  the same detail-page class contract inside an iframe. This keeps public styles
  isolated from SmartHR UI and keeps the preview out of production builds.

## Revisit Conditions

- Revisit if authoring must be hosted, shared by multiple users, or separated
  from a local Git checkout.
- Revisit the asset URL mapping if content moves to another storage system.
