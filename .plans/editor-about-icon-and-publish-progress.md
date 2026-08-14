# Plan

## Goal

Show the About avatar in the editor, and show what a publication is doing while it runs.

## Scope

- `editor/vite.config.js`: serve the site's `public/` so `/avator.jpg` resolves.
- `scripts/publishProgress.mjs` (new): fold a publication job row and its workflow run into stages.
- `scripts/githubWorkflowClient.mjs`: `runProgress()`, cached, best-effort.
- `scripts/editorApiPlugin.mjs`: return `progress` on publication job payloads.
- `src/editor/EditorRoot.jsx`, `src/editor/editor.css`: a progress panel in place of the publish log.

## Non-goals

- Changing `.github/workflows/content-publish.yml` or the publication data model.
- Bringing workflow log output into the editor; it may contain unpublished source text.

## Assumptions

- The workflow's step names are stable enough to map, and a rename is caught by a test that reads the workflow.
- One GitHub API read per three seconds per run is well inside the token's rate limit.

## Steps

1. Point the editor build's `publicDir` at `public/`. About stores its avatar as a path into it, and the editor build previously excluded it, so both the editor field and the preview iframe rendered a broken image.
2. Add `publishProgress()` and `stageForStepName()`: six stages, weighted by observed duration, with a fallback to the job row's own checkpoints when no run is readable.
3. Add `GitHubWorkflowClient.runProgress()`: read the run's single job, return its steps, cache for three seconds, never throw.
4. Attach `progress` in `publicJob()`, reading the run when the job carries a `githubRunId`.
5. Replace the publish log `<details>` with a progress panel: stage list, progress bar, current step, elapsed time, a link to the run, and the sanitized error when there is one.

## Verification

- `tests/check_editor_vite_config.test.mjs`: the editor build serves `public/`.
- `tests/check_publish_progress.test.mjs`: every workflow step maps to a stage; fallbacks, ordering, completion, failure; the client's caching and its silence on failure.
- `tests/editor.test.jsx`: the panel names the running stage and step, its progress bar, and the run link.
- `python3 scripts/verify.py`.
- `npm run editor`: the About avatar renders, and a real publication moves through the stages.

## Open Issues

None.
