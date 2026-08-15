# Decision

## Title

Tags, summaries, and thumbnail concepts are written by gpt-5.6-luna

## Date

2026-08-15

## Status

Accepted

## Decision

`[tag_generation]` and `[summary_generation]` in `src/content/metadata.toml`
name `provider = "openai"` with `model = "gpt-5.6-luna"`. Requests go to the
Responses API with a strict JSON schema and `reasoning.effort = "none"`.
`scripts/generate_metadata.mjs` dispatches each request to the provider its
section names, so a field can move back to Gemini by editing one line.

## Context

`gemini-2.5-flash` answered these requests and shuts down on 2026-10-16, so a
move was due. Its free tier also allows 20 requests per day per model, and one
publication spends five or six of them — three articles a day, before any
retry.

Reasoning is turned off in the request, so the answers are short and the cost
is almost entirely input: roughly 24,000 input tokens and 600 output tokens per
publication.

## Alternatives

Prices are per 1M tokens, with the cost of one publication beside them.

| Model | Input | Output | Per publication |
| --- | --- | --- | --- |
| gpt-5-nano | $0.05 | $0.40 | $0.0014 |
| **gpt-5.6-luna** | **$0.20** | **$1.20** | **$0.0055** |
| gemini-3.1-flash-lite | $0.25 | $1.50 | $0.0069 |
| gemini-2.5-flash | $0.30 | $2.50 | $0.0087 |
| gemini-3.7-flash | $0.75 | $3.75 | $0.0200 |

- **gpt-5-nano** is four times cheaper again, and the summary is the text a
  reader meets on every card and in every search result.
- **gemini-3.1-flash-lite** would be a one-line change, at 25% more than Luna.
- **gemini-3.7-flash** is the newest Flash and the most expensive of these, and
  its promotional rate doubles on 2027-01-01.

## Reason

At fifty articles a year every candidate costs under a dollar, so price ranks
them without deciding between them. Luna is the cheapest model of its class,
and it is reached with the key the thumbnail generator already uses, so the
repository holds one AI credential rather than two.

`thinkingBudget: 0` is how the Gemini 2.5 request turns thinking off. Whether
the Gemini 3 models accept it is unverified, and on a model billing output at
$3.75 an unnoticed thinking budget is the difference between an estimate and a
surprise. `reasoning.effort = "none"` is documented for Luna.

## Consequences

- `GEMINI_API_KEY` stays wired into the publication workflow, unused until a
  section names Gemini again.
- Strict structured output requires a closed schema, so the OpenAI client fills
  in `required` and `additionalProperties: false` rather than each schema
  carrying them.
- Summary and tag wording changes. The length budget in
  [summary-length-budget](summary-length-budget.md) still holds them to the
  width of a card.

## Revisit Conditions

Luna is deprecated, its price moves, or a generated summary reads worse than
what Gemini wrote.
