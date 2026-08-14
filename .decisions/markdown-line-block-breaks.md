# Decision

## Title

A leading `|` marks a tight line break in article Markdown

## Date

2026-08-14

## Status

Accepted

## Decision

`scripts/articleHtml.mjs` renders a `<br>` before any paragraph line that starts
with `|`, dropping the bar and one space after it. The marker is read from the
source line, so `\|` writes a literal bar and leaves the lines joined.

## Context

Markdown offers two spacings between two lines: a soft break, which collapses
into a space, and a blank line, which opens a paragraph gap. An author who
wants two lines stacked at line-height — the gap a wrapped line leaves — has
only the hard break, written as two trailing spaces or a trailing backslash.
Both sit at the end of the line above, and trailing spaces are invisible in an
editor.

## Alternatives

- **Trailing two spaces or `\`.** Already supported, and kept. The marker asked
  for belongs at the start of the line it breaks before, which neither offers.
- **A `:br` text directive.** Matches the callout and embed syntax already in
  use, but reads as a tag rather than a mark, and costs three characters on
  every line of a stanza.
- **`>` at line start.** Taken by blockquotes.

## Reason

The leading vertical bar is the line block of Pandoc and reStructuredText,
where it means exactly this: the division into lines is preserved. It is one
character, visible in the editor, and free inside a paragraph — a GFM table
cannot start in the middle of one, so a bar there is text today and a marker
now.

## Consequences

- A paragraph line meant to read as a literal bar needs `\|`.
- A table written directly under a paragraph line, without the blank line that
  starts a block, renders as broken lines rather than a table.
- The English translation prompt in `.project/translation.md` has to keep the
  bar, or the break disappears from the translated article.

## Revisit Conditions

Authors write bars at the start of paragraph lines for some other purpose, or a
Markdown extension the site adopts claims the same position.
