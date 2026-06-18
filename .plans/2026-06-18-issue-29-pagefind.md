# Plan

## Goal

Replace the current `softmatcha2Search.js` client-side search engine with Pagefind while keeping the existing blog search combobox UI and locale-specific search behavior.

## Scope

- Add Pagefind to the build workflow and generate `dist/pagefind/` after prerendering.
- Generate Pagefind custom records for title, tags, summary, and body content per locale.
- Connect the existing blog search combobox to the Pagefind JavaScript API.
- Keep recent-post suggestions for the empty query from local post metadata.
- Remove `softmatcha2Search.js` from the client bundle.
- Add a smoke check that verifies Japanese and English Pagefind searches against the built index.
- Update verification config or scripts only if the new smoke check needs to become part of the standard verification path.

## Non-goals

- Redesign the search UI.
- Replace the blog filter implementation.
- Rework article-list metadata generation beyond what Pagefind needs.
- Add hosted or server-side search infrastructure.

## Assumptions

- Pagefind will be installed as a project dependency so the build is reproducible in CI.
- The build order should be `vite build`, then prerender HTML routes, then generate the Pagefind index under `dist/pagefind/`.
- Locale-specific search should be implemented by Pagefind filters or metadata derived from the current route language.
- Empty-query results should continue to show recent posts from `window.BlogData.POSTS`, because Pagefind search is query-driven.

## Steps

1. Install Pagefind and update the build script so `dist/pagefind/` is generated after prerendering.
2. Add a Pagefind build script that writes per-locale article records, including locale, title, tags, summary, and body data.
3. Replace the `softmatcha2Search.js` import and index usage in `src/blog.jsx` with a small Pagefind API adapter that:
   - lazy-loads `/pagefind/pagefind.js`;
   - filters results by current language;
   - maps Pagefind result URLs back to existing post records;
   - keeps keyboard navigation and ARIA state unchanged.
4. Preserve snippets using Pagefind excerpts when available, while keeping local recent-post suggestions for empty queries.
5. Remove `src/softmatcha2Search.js` when no longer referenced.
6. Add a smoke test script for built Pagefind search in Japanese and English, and wire it into repository verification.
7. Run `python3 scripts/verify.py`; fix any regressions.
8. Commit, push, open a PR for issue #29, wait for both Gemini Code Assistant and Copilot reviews, address actionable feedback, rerun verification, then merge only when the PR is sufficiently reviewed and green.

## Verification

- `python3 scripts/verify.py`
- Build output inspection that confirms `dist/pagefind/` exists.
- Smoke search assertions for Japanese and English query results.
- Bundle/source inspection that confirms `softmatcha2Search.js` is no longer imported or emitted.

## Open Issues

- None at planning time.
