# Decision

## Title

The thumbnail subject is drawn from the Japanese title

## Date

2026-08-15

## Status

Accepted

## Decision

`resolveThumbnailConcept` reads the Japanese `title` and asks the model for one
drawable subject. The summary is no longer consulted, and the summary written
only to feed the image is gone.

## Context

The subject came from the resolved Japanese `[sumup]` summary. A post that
shows no summary — `mode = "none"` — had one generated from its body for this
purpose and thrown away, which is a request paid for and a paraphrase nobody
reads. Three of the five posts on the site carry no summary.

A summary is also a paraphrase of the whole article, and it flattens what makes
one article different from the next. The owner asked for the subject to come
from what is particular in the post, and named the title as where that lives.

## Alternatives

- **Title and summary together.** Measured as the most stable of the three for
  posts that have a summary, but it still pays for a summary the post does not
  show, and on one article the summary pulled the subject away from the title.
- **The raw title as the subject.** `{CONCEPT}` lands inside "a single centered
  object that represents …". A Japanese sentence there is drawn as a scene, or
  as lettering. Distilling the title into a noun phrase is what turns
  「…に LT枠で登壇しました」 into `a microphone`.

## Reason

Measured over the five published titles, four samples each:

| Title | Subjects |
| --- | --- |
| 償却計算量 | abacus ×3, hourglass |
| 結合度･凝集度 (TypeScript) | chain link ×4 |
| [読書ノート] 研究発表のためのスライドデザイン | presentation slide ×4 |
| Wezterm起動時にwslを自動的に起動させる | terminal ×4 |
| Codex Meetup Tokyo #2 に LT枠で登壇しました | microphone ×4 |

Steadier than the summary, and more particular: 償却計算量 drew a balance scale
from its summary, a shape general enough for half the blog, and an abacus from
its title.

## Consequences

- A post with no summary costs one request for its thumbnail rather than two.
- A post published without a Japanese title cannot be drawn, and says so.
- `[thumbnail].concept` still overrides everything, for a title that names
  nothing drawable.

## Revisit Conditions

Titles stop carrying the particular thing a post is about, or a subject drawn
from one reads worse than what the summary gave.
