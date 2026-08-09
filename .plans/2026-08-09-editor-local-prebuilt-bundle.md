# Plan

## Goal

Replace remote Vite development-module delivery with a locally generated,
production-optimized editor bundle while keeping the editor private to the
existing Tailscale Serve endpoint.

## Scope

- Add an `editor/` directory containing the dedicated Vite build configuration
  and a Git-ignored `editor/dist/` output directory.
- Make `npm run editor` build the editor locally, then serve the optimized files
  and repository-backed APIs from `127.0.0.1:4173` through the existing
  Tailscale Serve HTTPS listener.
- Add `npm run editor:build` for an explicit local build and
  `npm run editor:dev` for HMR-based editor development.
- Reuse the existing Tailscale DNS, user-identity, loopback, and Origin checks.
- Serve draft assets and editor APIs in both optimized and development modes.
- Keep the public `npm run build`, root `dist/`, and Cloudflare deployment free
  of editor files and routes.
- Measure the optimized editor's request count and load metrics against the
  recorded 56-request, 365 ms local LCP development baseline.

## Non-goals

- Publishing the editor through GitHub Pages, Cloudflare, or another public
  host.
- Committing `editor/dist/` to Git.
- Changing the editor UI, content model, draft model, or publish behavior.
- Removing Tailscale Serve or weakening API authorization.

## Assumptions

- A short build step before the server becomes ready is acceptable because the
  author bookmarks the URL only after `npm run editor` reports readiness.
- Correctness is preferable to build-cache invalidation complexity, so normal
  starts rebuild the local bundle; browser navigation uses the optimized files.
- Editor source remains under `src/editor/`; the new `editor/` directory owns
  only the dedicated build configuration and local output.

## Steps

1. Add the dedicated editor Vite configuration and Git exclusion.
2. Extend API and draft-asset middleware to work with Vite preview servers.
3. Change the editor server to build and preview optimized output by default,
   retaining an explicit development mode.
4. Update npm commands, project documentation, architecture decisions, and
   startup/security tests.
5. Verify local and Tailscale API behavior, production isolation, stop behavior,
   responsive UI, and the complete repository verification suite.
6. Record a cold reload trace and compare request count, LCP, CLS, and critical
   request-chain latency with the development baseline.

## Verification

- `npm run editor:build`
- `npm run editor -- --no-tailscale`, then check `/editor`,
  `/editor-preview`, `/api/editor/content`, and a representative draft asset.
- `npm run editor:dev -- --no-tailscale` and confirm HMR mode remains usable.
- `npm run editor:stop` in both modes.
- `npm run build` and inspect `dist/` for editor entries and APIs.
- `python3 scripts/verify.py`
- Chrome DevTools performance trace and network-request comparison over the
  stable Tailscale HTTPS URL.

## Open Issues

- Approved on 2026-08-09. The local bundle is generated but not committed or
  deployed publicly.
