# Plan

## Goal

Implement the requested blog UI and tooling changes: topbar/mobile fixes, RSS placement, Notion-like filter/sort, syntax-highlighted code blocks, SoftMatcha2-based search if feasible, TanStack-backed list state, Vite setup, and Lighthouse verification.

## Scope

- Convert the current CDN/Babel React prototype into a Vite + React project.
- Add required root-level Node/Vite files because they are the standard locations for package management, development, build, and performance tooling:
  - `package.json`
  - package lockfile
  - `vite.config.js`
  - source entry files if needed by Vite
- Keep the visible app behavior and routing hash-based unless Vite requires a small entry adjustment.
- Update topbar behavior:
  - remove site title/brand text from the topbar
  - add a `top` button
  - keep page navigation visible at mobile size as page-name buttons
  - show the search icon at mobile size
  - move RSS from the top page link list to an icon-only topbar edge control
- Restyle message boxes so they have no background fill and use a plain rectangular side bar.
- Replace current code block rendering with a syntax highlighting library, likely Shiki, because it is a high-quality TextMate/VS Code grammar based highlighter.
- Use TanStack Table for blog post filtering/sorting state and row derivation.
- Rework filter/sort controls to closely match Notion-style popovers and pills in layout, density, labels, and interaction.
- Investigate SoftMatcha2 integration. SoftMatcha2 appears to be a Python/Rust CLI/index tool rather than a browser package, so implementation will be one of:
  - build-time/static index/search adapter if it can run locally in this project without unreasonable setup
  - a documented fallback if SoftMatcha2 cannot practically run in a static Vite frontend
- Update verification to include Lighthouse.

## Non-goals

- Do not merge automatically.
- Do not redesign unrelated pages beyond what is needed for consistency.
- Do not introduce backend hosting unless SoftMatcha2 proves impossible without one and the user approves that direction separately.

## Assumptions

- `vite+つかって` means use Vite with React for local development/build.
- `tanstack にして` means use TanStack Table for the blog list filtering/sorting model.
- `softmacha2` refers to `softmatcha2`.
- The repository may need dependency installation over the network.

## Steps

1. Create and work on a dedicated branch.
2. Add Vite + React package setup and convert script loading/imports from globals to modules.
3. Add TanStack Table and refactor `BlogList` to use column filters and sorting.
4. Restyle and adjust topbar, mobile navigation/search visibility, RSS icon placement, top button, and top page link list.
5. Restyle message boxes and code blocks; integrate Shiki for highlighted HTML output.
6. Investigate and implement the most practical SoftMatcha2-backed search path, or report the concrete blocker if it cannot fit a static frontend.
7. Update `.project/verification.toml`, local checks, and CI as needed for build/lint/Lighthouse.
8. Run `python3 scripts/verify.py`, plus focused UI checks at desktop and mobile sizes.
9. Review the diff for regressions and fix any issues found.

## Verification

- `python3 scripts/verify.py`
- Vite production build
- Lighthouse against the built app or local preview
- Browser/UI checks for:
  - mobile topbar page buttons
  - mobile search icon
  - RSS icon-only topbar control
  - Notion-like filter/sort interaction
  - syntax highlighted code blocks
  - article message box styling

## Open Issues

- SoftMatcha2 may not be feasible as an in-browser dependency because its official repository is Python/Rust CLI based and has no published browser package or release artifact. This needs a small integration spike before final implementation.
