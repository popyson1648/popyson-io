# Plan

## Goal

Run the daily content backup on the Cloudflare Free plan by using a Worker Cron Trigger to create the existing Workflow instance.

## Scope

- Replace the Workflow binding schedule with a top-level Cron Trigger at the same UTC time.
- Add a scheduled handler that starts the backup Workflow with a deterministic instance ID.
- Preserve the Worker's non-public `fetch` behavior.
- Cover the handler, retry behavior, and Wrangler configuration with tests.
- Update the current backup operations documentation.

## Non-goals

- Change backup contents, retention, restore behavior, credentials, or production resources.
- Add a public route or expose deployment identifiers.

## Assumptions

- Cron Trigger delivery may be retried for the same scheduled time.
- Workflow instance IDs remain unique while retained, so retry handling must accept an existing deterministic instance.

## Steps

1. Move the daily cron expression from `workflows[].schedules` to `triggers.crons`.
2. Add a `scheduled()` handler that creates or recognizes the Workflow instance for that scheduled time.
3. Add focused unit and configuration invariant tests.
4. Regenerate Worker binding types and update backup operations documentation.
5. Run focused checks and the standard repository verification.

## Verification

- `npm run content:backup:test`
- `npm run content:backup:typecheck`
- `npx wrangler deploy --dry-run --cwd workers/content-backup`
- `python3 scripts/verify.py`

## Open Issues

- Production deployment and the first scheduled instance are handled separately after review and merge.
