# Decision

## Title

Treat About as one fixed editor content item

## Date

2026-08-10

## Status

Accepted

## Decision

The local editor exposes About as the fixed item `about`. Its localized profile and News TOML files, plus its `assets/` directory, are saved, versioned, validated, discarded, and published as one unit. Private state mirrors the public directory under `.drafts/about/`.

## Context

The public About page is composed from `about.{ja,en}.toml` and `news.{ja,en}.toml`, while the editor originally supported only directory-addressed Markdown posts and Works.

## Alternatives

- Edit the four TOML files as raw text.
- Model profile and News as separate editor items.
- Move About into the post or Work Markdown format.

## Reason

A fixed structured item matches the public page, prevents invalid file relationships, keeps locale-paired rows aligned, and lets the existing private-draft and publish workflow remain atomic.

## Consequences

- About cannot be created or deleted from the editor.
- Repeatable localized sections must retain matching Japanese and English item counts.
- About images use `/content-assets/about/about/<file>` and live in the About `assets/` directory.
- The preview uses the active structured draft values and the public site styles.

## Revisit Conditions

Revisit if About becomes multiple pages, if News receives an independent lifecycle, or if the public content format changes.
