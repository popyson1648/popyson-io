# Decision

## Title

Restore text/frame contrast independently of the decorative circles

## Date

2026-06-12

## Status

Accepted

## Decision

Stop letting the decorative riso circles drive ink contrast. The circles are slated for a
separate redesign, so text and frame legibility is tuned on its own merits:

- `--text-faint` strengthened from `color-mix(#4960ff 44%, #fdfff7)` to `62%`, and `--line`
  from `42%` to `52%` (both light and dark blocks in `src/styles.css`). This lifts washed-out
  chrome (placeholders, eyebrow labels, numerals) and firms up faint card/divider frames.
- Reading-supporting numerals promoted from `--text-faint` to `--text-meta` in `src/app.css`:
  `.tl-period` (about career years), `.acard-year`, `.kv .k`. These are data the reader must
  scan, not decoration.
- Blog index numerals redesigned: `.post-index-no` from 14px muted to a 26px semibold
  `--text-meta` editorial numeral (`src/app.css:735` + the size override near line 3202),
  anchoring each list entry instead of floating small beside the meta line.

## Context

After the Alexandria + LINE Seed JP switch (regular weight reads lighter than the previous
`M PLUS Rounded 1c`), the owner reported the site felt too faint: about career years almost
invisible, blog numbers small and awkwardly placed, some frames weak. The earlier circle work
had also lowered contrast on the assumption the circles must coexist with text. The owner
clarified the circles will be redesigned later and should not constrain text contrast now.

## Alternatives

- Keep compensating contrast around the circles. Rejected: the circles are changing, so the
  constraint is temporary and was hurting legibility everywhere.
- Bump body weight to 600. Rejected: 400 is correct for body; the issue was the faint token and
  specific roles, not body weight.

## Reason

Legibility is a property of the text on the cream paper, not of the decorative layer. Tuning the
ink scale directly fixes the reported faintness without waiting on the circle redesign.

## Consequences

- `--text-faint` is now a usable mid-tone; if a genuinely whisper-quiet tier is needed later,
  introduce a separate token rather than re-weakening this one.
- The blog list now leads with a strong numeral; keep the gutter (56px) when editing the list grid.
  (Superseded 2026-06-12: the blog ordinals were removed entirely and the list is now a single
  column — see `dark-theme-and-profile-polish.md`.)

## Revisit Conditions

- The circle redesign lands and changes the background contrast assumptions.
- A lighter de-emphasis tier is needed that `--text-faint` no longer provides.
