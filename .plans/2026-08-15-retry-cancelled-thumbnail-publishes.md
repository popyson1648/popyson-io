# Retry cancelled thumbnail publications

## Goal

Finish publishing the thumbnail updates whose GitHub Actions runs were cancelled before their jobs started.

## Scope

- Identify the affected content and current publication state through the author API and Actions history.
- Re-submit only publication work that is not already complete.
- Run publication jobs sequentially and verify each result.

## Non-goals

- Regenerating or uploading thumbnail images.
- Changing application code, content, workflow configuration, or concurrency policy.
- Merging this branch.

## Assumptions

- The replacement thumbnail assets and draft revisions are already saved in the content service.
- Actions runs `31859714385` and `31859716590` were cancelled before starting.
- A later successful run may already have replaced one of the cancelled publications.

## Steps

1. Read content and publication status from the author API and correlate successful Actions runs by publication job ID.
2. Determine which saved thumbnail revisions are not the currently published revisions.
3. Create a publication for the first outstanding item and wait for completion.
4. Repeat for any remaining item only after the shared deployment queue is idle.
5. Confirm the active published revisions and public thumbnail responses.

## Verification

- Every re-submitted publication job reports `succeeded`.
- The corresponding GitHub Actions run completes successfully.
- Each affected item points to its intended published revision.
- The public thumbnail URL returns the updated image successfully.

## Open Issues

- GitHub does not retain workflow inputs in the cancelled runs, so the affected items must be inferred from content state and nearby successful job IDs.
- Publication of `20260729-94519dc2` remains blocked: runs `31861744675` and `31861936313` both failed in `Translate the Japanese source` after the Claude Code provider exited in about five seconds. No thumbnail generation or deployment step ran.
