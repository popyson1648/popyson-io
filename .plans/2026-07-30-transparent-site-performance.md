# Plan

## Goal

Reduce cold-load and repeat-visit time without changing appearance, content, controls, navigation semantics, accessibility, or perceived interaction behavior.

## Scope

- Measure the production build on the About, Blog, and representative Article routes.
- Reduce oversized thumbnail transfer cost while retaining the original images.
- Reduce JavaScript that is unnecessary for the current route.
- Remove avoidable initial forced layout work.
- Shorten the render-blocking font dependency chain without changing the fonts.
- Add long-lived browser caching for fingerprinted build assets on Cloudflare Pages.
- Make performance verification represent compressed production delivery.

Baseline captured on 2026-07-30:

| Route / environment | Performance | FCP | LCP | TBT | CLS | Transfer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` via the repository Lighthouse server | 64 | 4.20 s | 9.98 s | 112 ms | 0.0256 | 1.29 MB |
| `/blog` via compressed Vite preview | 72 | 2.25 s | 48.02 s | 104 ms | 0.0022 | 9.05 MB |
| representative article via compressed Vite preview | 73 | 2.25 s | 9.20 s | 18 ms | 0.0007 | 1.10 MB |

Additional findings:

- The four Blog thumbnails are 1254x1254 PNG files totaling about 8.1 MB, but render at 84–96 CSS pixels.
- Lighthouse estimates 7.9 MiB and 41.4 s of Blog LCP savings from correct image delivery.
- The production JavaScript bundle is 492.9 KB raw / 132.3 KB gzip; Lighthouse reports 32–39% unused JavaScript by route.
- Rendered article bodies contribute 132.6 KB of raw generated client data.
- TanStack Table contributes a general-purpose table engine to a four-item list that only needs filtering and sorting.
- The Blog trace records 29 ms of forced reflow during initial toolbar layout.
- Pages request 39–57 font files, and the external Google Fonts stylesheet is a render-blocking dependency with about 900 ms of simulated savings.
- Production already returns Brotli, but fingerprinted `/assets/*` responses currently have only a four-hour browser TTL.
- Unthrottled local traces are already fast (132–135 ms LCP and 0 CLS), so the work must focus on constrained network/CPU conditions and repeat visits.

## Non-goals

- No visual redesign, typography substitution, content removal, animation removal, or control simplification.
- No change from SPA navigation to full-page navigation.
- No lossy optimization unless perceptual comparison proves that rendered output is indistinguishable at every supported density.
- No speculative service worker or backend.
- No deletion of original thumbnail files or change to their stable URLs.
- No deployment or merge without explicit approval.

## Assumptions

- The current `perf/transparent-site-speedup` branch is based on the latest UI-fix branch intentionally.
- Cloudflare Pages remains the production host and continues to provide Brotli compression.
- Modern browsers in Vite's supported target can use WebP and responsive image candidates.
- A candidate change is rejected if it produces a visible screenshot difference, changes accessible structure, or delays a user action perceptibly.
- Lighthouse lab numbers vary; comparisons will use repeated runs and medians, while byte-size budgets remain deterministic.

## Steps

1. Make the measurement harness production-representative.
   - Run Lighthouse against a compressed preview server rather than the uncompressed Python static server.
   - Audit `/`, `/blog`, and one representative article at mobile settings.
   - Record deterministic bundle, image, request-count, and transfer-size budgets.
   - Keep transient reports under `.tmp/`.

2. Deliver correctly sized Blog and related-article thumbnails.
   - Keep every original 1254px PNG unchanged.
   - Generate 192px and 384px lossless WebP display derivatives as part of the existing thumbnail workflow.
   - Use `picture`/`srcset`/`sizes` so the browser selects the smallest density-appropriate derivative; retain the existing PNG as the fallback.
   - Verify source dimensions, intrinsic aspect ratio, lazy-loading behavior, and direct original URLs.
   - Compare rendered thumbnails against the baseline at mobile/desktop and 1x/2x/4x density; reject the format or size if a visible difference appears.

3. Remove unnecessary JavaScript without changing Blog behavior.
   - Replace TanStack Table usage with memoized native filtering and stable sorting that exactly preserves current tag, title, body, date, and kana behavior.
   - Add focused tests for every filter/sort direction and combined filters before removing the dependency.
   - Split route-only Blog/Article code and generated article markup from the About/Works/Reading bootstrap only if prerendered HTML can remain visible during hydration and navigation can be prefetched without a loading flash or delayed click.
   - Keep route splitting only when it materially reduces the initial gzip bundle and passes interaction and visual regression checks.

4. Eliminate avoidable layout work.
   - Skip the Blog toolbar width transition setup on its initial settled render.
   - Preserve the current enter/exit durations and geometry for actual open, close, filter, locale, font-ready, and resize transitions.
   - Separate layout reads from writes where possible and confirm the initial `ForcedReflow` insight is cleared or materially reduced.

5. Shorten the font critical path without changing typography.
   - Snapshot and minify the current modern-browser Google Fonts CSS locally while retaining the exact Alexandria, LINE Seed JP, DM Mono files, weights, unicode ranges, and `font-display` behavior.
   - Remove only the now-unused `fonts.googleapis.com` request/preconnect; retain the `fonts.gstatic.com` preconnect.
   - Verify computed font faces, text geometry, CLS, Japanese/English pages, code blocks, and screenshots before keeping the change.
   - Do not replace fonts or asynchronously apply them after first paint.

6. Improve repeat-visit caching on Cloudflare Pages.
   - Add a `public/_headers` rule only for fingerprinted `/assets/*`.
   - Set `Cache-Control: public, max-age=31556952, immutable`.
   - Leave HTML, Pagefind indexes, original thumbnails, and other stable-name content on their current revalidation behavior.
   - Verify `_headers` reaches `dist/` and does not match non-fingerprinted content.

7. Keep project workflow and documentation consistent.
   - Update generation tests, integration tests, performance checks, `package.json`, lockfile, `.project/` documentation, and `.project/verification.toml` where their commands or guarantees change.
   - Add a decision record if route-aware hydration or generated image derivatives introduce a lasting architecture rule.

8. Perform final regression review.
   - Review the complete diff for correctness, cache safety, accessibility, maintainability, and future content behavior.
   - Remove any optimization whose gain is negligible or whose equivalence cannot be demonstrated.

## Verification

- Run `python3 scripts/verify.py`.
- Build with `npm run build`.
- Run three mobile Lighthouse passes for `/`, `/blog`, and a representative article; compare medians with the baseline.
- Repeat Chrome DevTools traces for `/` and `/blog`, including LCP breakdown, network dependency tree, image delivery, DOM size, and forced reflow insights.
- Verify all asset requests and response headers in the network panel.
- Exercise Blog search, all filters, both sort keys/directions, article navigation, related links, language switching, theme switching, code copy, and back/forward navigation.
- Compare baseline and optimized screenshots for:
  - Japanese and English;
  - light and dark themes;
  - mobile and desktop viewports;
  - About, Blog, Article, Works, Reading, and RSS routes;
  - closed/open Blog toolbar states.
- Verify accessibility snapshots and the existing static accessibility checks.
- Required outcome:
  - no accepted visual or behavioral regression;
  - Blog initial transfer reduced by at least 75% from 9.05 MB;
  - Blog median LCP reduced by at least 50%;
  - no route regresses median FCP, TBT, or CLS by more than 5%;
  - initial JavaScript gzip size decreases, unless route splitting is rejected by the equivalence gate;
  - fingerprinted production assets receive the intended immutable cache header.

## Open Issues

- A production RUM dataset is not currently available, so lab measurements are the comparison source.
- Route-level splitting is intentionally conditional: preserving already-prerendered content and immediate SPA navigation is more important than a marginal bundle reduction.
- The exact lossless thumbnail derivative sizes may be adjusted after 1x/2x/4x visual and byte-size comparison.

## Results

- Blog transfer fell from 9.05 MB to a 1.07 MB median (88% reduction).
- Blog median LCP fell from 48.02 s to 3.76 s (92% reduction); median FCP,
  TBT, and CLS were 2.10 s, 16 ms, and 0.0021.
- The client JavaScript bundle fell from 492.89 KB / 132.34 KB gzip to
  444.00 KB / 119.42 KB gzip.
- The same representative article at the baseline commit and optimized branch
  measured 6.53 MB versus 1.02 MB. Its CLS medians were 0.0631 and 0.0623, so
  the observed article variation is not a regression from this task.
- The Blog initial trace at a 412px, DPR 2 viewport with Fast 4G and 4x CPU
  throttling measured 581 ms LCP and 0 CLS. It requested only 192px WebP
  thumbnails; the canonical PNG URLs remained valid fallbacks.
- Local font CSS was measured and rejected: it added a 77 KB render-blocking
  stylesheet with about 91% unused CSS and made representative scores worse.
  The original font request and typography remain unchanged.
- Route splitting was not accepted. Removing the table engine produced a
  deterministic 10% gzip reduction without adding a loading boundary or
  changing prerendered-content replacement and SPA navigation behavior.
- A later, separately approved thumbnail-regeneration task replaced the four
  canonical PNG contents with shadowless 1024px artwork while retaining their
  stable URLs. The responsive variants were regenerated from those new
  canonical files, so the delivery optimization and its verification remain in
  effect.

## Research References

- [Optimize Largest Contentful Paint](https://web.dev/articles/optimize-lcp)
- [Chrome Performance Insights](https://developer.chrome.com/docs/performance/insights)
- [Forced reflow insight](https://developer.chrome.com/docs/performance/insights/forced-reflow)
- [React route/code splitting guidance](https://react.dev/learn/build-a-react-app-from-scratch#code-splitting)
- [Vite dynamic imports and lazy chunks](https://vite.dev/guide/features.html#glob-import)
- [Properly size images](https://developer.chrome.com/docs/lighthouse/performance/uses-responsive-images/)
- [Cloudflare Pages custom headers](https://developers.cloudflare.com/pages/configuration/headers/)
- [Cloudflare cache-control behavior](https://developers.cloudflare.com/cache/concepts/cache-control/)
