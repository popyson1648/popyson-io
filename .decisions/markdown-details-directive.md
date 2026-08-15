# Decision

## Title

Render collapsible Markdown blocks with a details directive and native HTML

## Date

2026-08-15

## Status

Accepted

## Decision

Authors write collapsible content as a `:::details` container directive. The
build-time renderer converts it to a native `<details>` element containing a
`<summary>` and a wrapped body. The directive accepts a label or `title`
attribute and an optional `open` attribute.

## Context

Article Markdown rejects raw HTML, so authors cannot safely add native details
elements themselves. Published pages and editor previews already share the
same build-time Markdown renderer.

## Alternatives

- Allow raw `<details>` HTML in Markdown.
- Implement disclosure behavior with a custom element and client-side script.
- Keep collapsible content unsupported.

## Reason

The directive keeps raw HTML disabled and fits the existing callout syntax.
Native details elements provide keyboard interaction and expose the body when
JavaScript is unavailable, without adding a client-side runtime.

## Consequences

- The renderer supplies a locale-specific default summary when the author
  omits a title.
- Article CSS owns the disclosure marker and spacing.
- Rendering tests cover closed and initially open blocks.

## Revisit Conditions

Revisit this choice if the site needs animated disclosure state, nested
interactive controls, or behavior that native details elements cannot provide.
