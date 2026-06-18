# Decision

## Title

Generalize PR follow-up into a reusable workflow shared by security and Dependabot PRs

## Date

2026-06-17

## Status

Accepted

## Decision

Extract the security remediation PR follow-up logic into a single
`workflow_call` reusable workflow (`.github/workflows/_pr-followup.yml`) and
drive it from two thin caller workflows: `security-pr-followup.yml` and
`dependabot-pr-followup.yml`. A `selector` input chooses which open PRs the run
acts on (`security` -> label `security-alert-remediation`; `dependabot` ->
author `app/dependabot` or label `dependencies`). All shared machinery (PR
selection, context collection, Claude invocation, verification, push/`LGTM`)
lives only in the reusable workflow. Merging stays manual.

## Context

Dependabot opens version-update PRs but they were left unattended: existing PRs
had no labels and a failing PR (#9) sat unfixed. The repository already had a
working security remediation follow-up workflow that does exactly the desired
behavior for one PR class. The goal is fully hands-off handling of Dependabot
PRs (auto-fix failures, comment `LGTM` on green) with merge remaining manual,
without introducing structure that would later need refactoring.

## Alternatives

- Copy `security-pr-followup.yml` into a second Dependabot-specific workflow.
  Rejected: duplicates ~270 lines, a DRY violation that becomes a future
  refactor target and doubles maintenance.
- Generalize the single existing workflow to handle both PR classes inline.
  Rejected: mixes the security and dependency concerns in one file and couples
  their triggers.
- Adopt `act` for local workflow execution. Rejected: it cannot reproduce the
  server-side behaviors that carry the real risk (Dependabot secret-access
  rules, PAT push permissions, schedule firing) and is heavy; `actionlint` plus
  a `workflow_dispatch` rehearsal cover the need instead.

## Reason

A `workflow_call` reusable workflow is the idiomatic GitHub Actions way to share
a job across triggers and inputs. It keeps the follow-up logic single-sourced,
isolates the security and Dependabot concerns in their own thin callers, and is
the structure least likely to need later refactoring. The schedule +
`workflow_dispatch` + review trigger model running under
`SECURITY_AUTOMATION_TOKEN` keeps runs in the base-branch context, so secrets
and push rights are available and untrusted PR code is never checked out in a
privileged event.

## Consequences

- Labels `dependencies` and `security` must exist for Dependabot to apply them;
  existing open Dependabot PRs need a one-time `dependencies` backfill.
- Both callers subscribe to review events, so a review on a non-matching PR
  triggers a run that exits early at selection.
- `actionlint` is added to pre-commit to statically validate workflow files.
- The reusable workflow is validated end-to-end only by a real
  `workflow_dispatch` run, since server-side behavior cannot be reproduced
  locally.

## Revisit Conditions

- A third PR class needs the same follow-up, suggesting a richer selector model.
- GitHub changes reusable-workflow `secrets: inherit` or `inputs` semantics.
- Dependabot branch pushes are blocked by repository or token settings.
