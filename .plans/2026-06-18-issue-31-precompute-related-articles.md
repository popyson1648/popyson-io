# Plan

## Goal

Precompute related article IDs during content loading so article rendering can
reuse generated metadata instead of ranking related posts at runtime.

## Scope

- Add `relatedIds` to each post returned by `scripts/content_loader.mjs`.
- Preserve the current ranking: higher shared-tag count first, then newer date.
- Update `src/blog.jsx` to render related articles from `post.relatedIds`.
- Add focused loader coverage if the existing checks do not exercise this path.

## Non-goals

- Change the visual design or copy of the related articles section.
- Change blog list filtering, sorting, or search behavior.
- Change post frontmatter schema authored by humans.

## Assumptions

- `relatedIds` is generated metadata and should not be written into post
  frontmatter.
- Posts without candidates should keep rendering an empty related-list area.

## Steps

1. Inspect current content loading and article rendering behavior.
2. Implement build-time related ID generation in the content loader.
3. Replace runtime related ranking in `Article` with `relatedIds` lookup.
4. Add or update verification for related ordering and 0/1-post behavior.
5. Run `python3 scripts/verify.py` and review the diff.

## Verification

- `python3 scripts/verify.py`
- Focused content-loader check if added.

## Open Issues

- None.
