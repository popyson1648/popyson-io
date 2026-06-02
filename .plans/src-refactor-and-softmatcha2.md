# Plan

## Goal

Move frontend source files from the project root into `src/`, and decide whether search should keep the current browser adapter or use the upstream Python SoftMatcha2 implementation through build-time indexing or a backend.

## Scope

- Create `src/` for application source files.
- Move React entry, components, pages, blog UI, tweak panel, search adapter, CSS, and site data modules into `src/`.
- Update imports in moved files.
- Update `index.html` to load `/src/main.jsx`.
- Keep tool/config files at the root where the tools expect them:
  - `package.json`
  - `package-lock.json`
  - `vite.config.js`
  - `eslint.config.js`
  - `lighthouserc.cjs`
- Evaluate the SoftMatcha2 options and record the implementation decision if it changes.

## Non-goals

- Do not redesign the UI.
- Do not merge the branch.
- Do not introduce a backend unless explicitly approved.
- Do not attempt a full Python-to-browser port of SoftMatcha2.

## Assumptions

- This site should remain statically deployable unless the user explicitly wants a backend search service.
- The blog corpus is currently small enough that browser search is acceptable for runtime performance.
- `src/` is a new root-level directory, but it is directly required for source organization.

## Steps

1. [x] Move app source files into `src/`.
2. [x] Update all relative imports after the move.
3. [x] Update Vite entry path in `index.html`.
4. [x] Check ESLint/build behavior after the move.
5. [x] Decide SoftMatcha2 direction:
   - Recommended: build-time Python indexing if the requirement is to use upstream SoftMatcha2 while keeping the site static.
   - Backend search only if the corpus becomes large or search must query private/dynamic data.
   - Accepted: current JS adapter because static simplicity matters more than using upstream SoftMatcha2 for the current small corpus.
6. [x] If build-time indexing is approved, add Python index generation and browser-side JSON querying in a follow-up change.
   - Not approved for this change; no backend or build-time index generation was added.
7. [x] Run `python3 scripts/verify.py`, including Lighthouse.

## Verification

- `npm run lint`
- `npm run build`
- `python3 scripts/verify.py`
- Browser smoke check if the import move changes runtime behavior.

## Open Issues

- User approval was provided by the request to work on this plan.
- SoftMatcha2 direction is recorded in `.decisions/softmatcha2-static-search-adapter.md`.
