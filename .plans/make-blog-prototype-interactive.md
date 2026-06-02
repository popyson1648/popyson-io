# Plan

## Goal

Make the static blog prototype in `.tmp/blog-prototype` interactive so the user can leave feedback directly on the page.
Refine the prototype layout and components using `https://wtrclred.io/` as visual reference.

## Scope

- Add the feedback client tags to `.tmp/blog-prototype/index.html`.
- Create or reuse the feedback inbox and history files under `.tmp/blog-prototype/feedback/`.
- Start the local feedback server for the prototype directory.
- Adjust the prototype visual system, layout, and blog/article components toward the reference site's quiet, spacious, text-first style.

## Non-goals

- Do not change the prototype design or content.
- Do not add production application code.
- Do not commit files under `.tmp/`.
- Do not copy the reference site's assets, exact logo, or text content.

## Assumptions

- `.tmp/blog-prototype/index.html` is the only HTML entry point.
- The interactive feedback layer only needs to run locally through the skill server.
- The reference should guide layout and component behavior, not become a pixel-perfect clone.

## Steps

1. Ensure `.tmp/` is excluded from Git status noise through `.git/info/exclude`.
2. Run the feedback injection script for `.tmp/blog-prototype`.
3. Start or reuse a local feedback server for `.tmp/blog-prototype`.
4. Verify the server reports the expected artifact directory and the page URL is available.
5. Apply a quieter paper-like color palette, smaller top navigation, and wider page whitespace.
6. Rework the blog list from boxed media cards toward a sparse three-column text index with small numeric markers and subtle metadata.
7. Rework the article page toward a narrow text column with a left-side table of contents on desktop, no hero placeholder, quiet metadata/tags, and unboxed related links.
8. On responsive/mobile article views, follow Zenn's pattern: show a small `目次` button near the upper-right of the article header/sticky row, and open the table of contents only when that button is pressed.
9. Simplify shared components so tags, filters, profile links, and controls use minimal outlines only where needed.
10. Verify desktop and mobile screenshots for layout, readability, and absence of overlap.

## Verification

- Confirm the feedback tags are present in `index.html`.
- Confirm `feedback/inbox.jsonl` and `feedback/history.json` exist.
- Confirm the local server `/info` endpoint points to `.tmp/blog-prototype`.
- Inspect `wtrclred.io` desktop/mobile and article pages as visual reference.
- Inspect Zenn's mobile article table-of-contents behavior and mirror the interaction pattern without copying implementation details.
- Use Playwright screenshots of the local blog list and article pages after changes.
- Check for console errors on the local pages.

## Open Issues

- None.
