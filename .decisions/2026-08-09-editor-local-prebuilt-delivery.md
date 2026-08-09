# Decision

## Title

Serve a locally built editor bundle instead of development modules

## Date

2026-08-09

## Status

Accepted

## Decision

`npm run editor` builds the editor with a dedicated Vite production build and
serves the resulting files from `editor/dist/` through the existing local API
server and Tailscale Serve endpoint. The output directory is local-only and
excluded from Git. `npm run editor:dev` retains Vite development mode for work
on the editor itself.

The public site continues to build into the root `dist/` directory. Its build
configuration, deployment input, pages, and runtime do not include
`editor/dist/`.

## Context

The development server delivered 56 resources and several dependent module
request stages during an editor reload. That module graph amplified mobile
Tailscale latency, especially while a peer used a DERP relay or a high-latency
direct connection. The editor is an authoring application, so browser HMR is
not needed during normal writing sessions.

## Alternatives

- Warm Vite development transforms while keeping browser module delivery.
- Commit generated editor assets to Git.
- Publish the editor frontend on a public static host.
- Keep the current development server for all authoring sessions.

## Reason

A production bundle reduces browser request stages and removes on-demand source
transforms. Local generation keeps source and output consistent without adding
generated files to commits. A separate build output preserves the public site's
existing deployment boundary and keeps the editor available only through
Tailscale.

## Consequences

- Normal editor startup includes a local build before reporting readiness.
- Editor source changes require a restart in normal mode or `editor:dev` while
  developing the editor.
- Article, draft, image, preview, and publish operations remain dynamic and do
  not rebuild the editor bundle.
- `editor/dist/` can be removed and regenerated at any time; it is not a source
  or backup directory.

## Revisit Conditions

- Revisit if the editor becomes a separately deployed application.
- Revisit if normal startup build time becomes material enough to justify a
  verified source-fingerprint cache.
