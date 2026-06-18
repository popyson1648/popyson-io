# Plan

## Goal

Make the Instapaper reading list refresh hourly while only rebuilding and
deploying to Cloudflare Pages when the snapshot actually changed, so the site
stays fresh without redeploying identical content every hour.

## Scope

- `.github/workflows/reading-refresh.yml`:
  - Change the schedule from daily (`0 21 * * *`) to hourly at `:29`
    (staggered off the existing `:17` dependabot and `:43` security jobs,
    avoiding `:00`).
  - Gate the `Build` and `Deploy` steps on a content-change output from the
    commit step, but always build/deploy for non-scheduled events
    (`push`, `workflow_dispatch`).
- `.decisions/scheduled-workflow-cron-timing.md`: update the reading-refresh
  schedule entry to hourly `:29` and note the three-way stagger.
- `.decisions/instapaper-reading-list.md`: update the cadence/consequences to
  reflect hourly polling with content-gated deploys.

## Non-goals

- Splitting fetch/commit and build/deploy into separate workflows
  (rejected: `GITHUB_TOKEN` pushes do not trigger downstream workflows, so it
  would require a PAT and add a footgun).
- Using `dorny/paths-filter` (wrong tool: the diff is generated during the run,
  not carried by an incoming push).
- Any change to the fetch script or the reading list UI.

## Assumptions

- Repo is public, so GitHub Actions minutes are free/unlimited.
- Cloudflare Pages Direct Upload deploys do not count toward the 500/month
  build quota and have no documented per-deploy cap (verified via Cloudflare
  docs).
- The existing `git diff --quiet -- src/reading.json` reliably detects changes.

## Steps

1. Create a dedicated worktree off `origin/main` (`reading-refresh-hourly-gate`). [done]
2. Edit the workflow: cron -> `29 * * * *`; commit step emits
   `changed=true|false` to `$GITHUB_OUTPUT`; build/deploy guarded by
   `if: steps.commit.outputs.changed == 'true' || github.event_name != 'schedule'`.
3. Update the workflow header comment to describe the content-gated behaviour.
4. Update the two decision docs.
5. Run `python3 scripts/verify.py` (or the workflow-relevant subset) and lint
   the YAML.

## Verification

- `python3 scripts/verify.py` passes.
- YAML parses; `if:` expression and `$GITHUB_OUTPUT` usage are syntactically
  valid.
- Manual trace of each trigger: schedule+no change -> skip deploy;
  schedule+change -> deploy; push/dispatch -> always deploy.

## Open Issues

- None.
