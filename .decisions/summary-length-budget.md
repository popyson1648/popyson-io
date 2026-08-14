# Decision

## Title

A generated summary is asked for less than the length it is allowed

## Date

2026-08-14

## Status

Accepted

## Decision

`scripts/generate_metadata.mjs` asks the model for 80% of
`summary_generation.max_chars`, and on an answer that still overruns the limit
it asks again for 65%, then 50%. The limit itself is unchanged, and a summary
that overruns all three attempts fails with its measured length.

## Context

An article card has room for 180 characters, and the generator passed that
number to the model and validated the answer against it. A Japanese summary
came back around 130 characters and passed. The English summary of the same
article came back at 185, 185, and 187 characters across three runs — the same
content needs roughly twice the characters in English — and the publication
stopped there.

The failure reached the author as "metadata generation failed" with no reason,
because the workflow suppresses the generator's output. Every post published
after translation moved ahead of generation hit it.

## Alternatives

- **Tell the model its last answer was too long.** Measured: it answered 195
  characters, longer than before. A model writes to a length it feels, and
  cannot count the characters it produced.
- **Raise the limit for English.** The limit is the width of a card, which does
  not change with the language in it.
- **Truncate to the limit.** Ends the summary mid-sentence.

## Reason

A model overshoots whatever number it is given by a few percent, consistently
enough to plan around: asked for 144, it answered 153, 170, 127, and 127 across
locales — all inside 180. Lowering the number asked for is also the only lever
measured to shorten a second answer, which is what makes the retry worth having.

## Consequences

- Summaries run shorter than the limit rather than up against it.
- A stubborn article costs up to three summary requests instead of one.
- The limit stays a single number in `src/content/metadata.toml`, read by both
  the prompt and the validation.

## Revisit Conditions

The models used start honoring a character count directly, or the card gains
room for a longer summary.
