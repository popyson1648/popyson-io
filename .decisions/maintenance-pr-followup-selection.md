# Decision

## Title

Rotate actionable maintenance pull requests and bypass Claude for green ones

## Date

2026-07-22

## Status

Accepted

## Decision

Scheduled maintenance follow-up runs prioritize pull requests with failed
checks, requested changes, or merge conflicts. They rotate through that pool by
workflow run number. Only when the actionable pool is empty may a run select a
completed green pull request that does not already have an `LGTM` comment.
Green pull requests receive the comment without invoking Claude.

Review-triggered runs continue to process the pull request from the event.
Every run still handles at most one pull request and never merges it.

## Context

Selecting only the most recently updated pull request allowed a green pull
request with an `LGTM` comment to remain the newest candidate. Older pull
requests with failed checks were never selected. The workflow also invoked
Claude on the green pull request every hour, so a model-side error prevented the
job from reaching its otherwise unnecessary final step.

## Alternatives

- Always select the oldest actionable pull request. An unchanged, unfixable
  failure could still starve every later pull request.
- Process every matching pull request in a matrix. This would increase
  concurrent writes, model usage, and the chance of duplicate fixes.
- Mark processed pull requests with comments or labels. This would add review
  noise and require more state-management rules.

## Reason

Rotation guarantees that unchanged failures do not block the rest of the
queue, while retaining the existing one-pull-request-per-run safety boundary.
Skipping Claude for quiet green pull requests avoids unnecessary cost and
removes model availability from the `LGTM` path.

## Consequences

- An actionable pull request may wait for its turn when several are open.
- Workflow run number becomes the deterministic rotation input.
- Green pull requests with existing `LGTM` comments no longer consume scheduled
  runs.
- Check classification must account for both check-run conclusions and legacy
  status-context states.

## Revisit Conditions

- The number of simultaneous maintenance pull requests regularly exceeds what
  hourly rotation can clear.
- GitHub changes the check or status fields returned by `gh pr list`.
- The repository adopts a safe queue or matrix mechanism for concurrent fixes.
