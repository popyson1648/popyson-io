# Decision

## Title

Publication progress is derived from the workflow run's steps, not from the job row alone

## Date

2026-08-14

## Status

Accepted

## Decision

The editor's publication progress is built by `scripts/publishProgress.mjs` from two sources: the publication job row in D1, and the steps of the GitHub Actions run that job dispatched, read through `GitHubWorkflowClient.runProgress()`. The API returns it as `progress` on every publication job payload, and the editor renders it as six named stages (受付 / 準備 / 英訳と付加情報の生成 / 候補リリースの作成 / 検証 / サイトへの反映) with a percentage, the current step, and the elapsed time.

## Context

`POST /api/editor/content/:kind/:id/publish` creates a job row and dispatches `.github/workflows/content-publish.yml`. That workflow does the real work — snapshot download, metadata generation, translation, candidate release, `verify.py`, Pages deploy, finalize — and takes several minutes. The job row only records `queued`, `running`, `succeeded` or `failed`, plus `candidate_revision_id` and `release_id`. The editor showed `phase` (the row's state) and a log that stays empty until a failure, so an author saw "running" and nothing else for the whole publication.

## Alternatives

- Show only the job row's own checkpoints (dispatched / candidate created / release created / done). No new dependency, but translation and verification — the slowest part by far — sit inside a single undivided step.
- Have the workflow report progress back to the Content API. Truthful and self-contained, but it adds write endpoints, job-row columns and a call after every step to a pipeline whose value is that it is hard to corrupt.
- Stream the workflow's logs into the editor. Rejected outright: the workflow suppresses its own command output because it may contain unpublished source text.

## Reason

The workflow's step names already describe the publication in the author's terms, and GitHub reports them for free. Reading them costs one API call per run, cached for three seconds, and requires no change to the publication pipeline or its data model. Progress is presented as an estimate: stage weights reflect observed durations rather than step counts, because a bar weighted by steps would barely move during translation.

## Consequences

- `scripts/publishProgress.mjs` holds a map from workflow step names to stages. Renaming or adding a step in `content-publish.yml` requires updating it; `tests/check_publish_progress.test.mjs` reads the workflow and fails when a step is unmapped.
- Progress is best-effort: `runProgress()` returns `null` rather than throwing, and the display falls back to the job row's own checkpoints when GitHub cannot be read.
- The job row remains the authority on how far the publication got. The stage never steps back below what the row implies.
- Only step names and states cross the boundary. No workflow log output reaches the editor.

## Revisit Conditions

- The publication stops running on GitHub Actions, or its steps stop describing the publication.
- Authors need the failure detail that the sanitized error cannot carry.
