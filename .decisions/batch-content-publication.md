# Decision

## Title

Publish all saved content changes as one immutable batch

## Date

2026-08-15

## Status

Accepted

## Decision

The editor has one global publication action. Its preflight compares every
saved item with the active release, then one job pins the complete change set
in `publish_job_items`. CI applies that set to one base release and activates
all published-revision pointers with the release in one D1 batch.

## Context

Per-item publication caused authors to repeat a deployment for each Blog,
Works, or About change and could expose intermediate combinations of content.

## Alternatives

- Keep per-item publication as the primary editor workflow.
- Create one independent deployment job per pending item.
- Read current revisions during CI instead of pinning them at job creation.

## Reason

One pinned batch gives the author a reviewable change set, one deployment, and
an atomic public result. Immutable membership also makes retries deterministic.

## Consequences

- A stale preflight is rejected and must be refreshed.
- Later saves belong to a later batch.
- Private or deleted items are included only when the active release still
  contains them.
- Legacy single-item jobs remain readable and retryable during rollout.
- Migration `0003_batch_publication.sql` must be applied before the new Worker.

## Revisit Conditions

Revisit if selective publication or multi-author approval becomes a product
requirement.
