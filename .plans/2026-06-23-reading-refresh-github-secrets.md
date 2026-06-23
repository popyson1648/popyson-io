# Plan

## Goal

Make the hourly reading-list refresh actually fetch again, and stop the workflow
from reporting success when the fetch is misconfigured.

## Scope

- `.github/workflows/reading-refresh.yml`: switch CI auth from 1Password
  (`op run --env-file=.op.env`) to GitHub secrets read directly; add a guard step
  that hard-fails on missing secrets; keep `continue-on-error` only for the
  transient fetch failure case.
- `.decisions/ci-instapaper-secrets-direct.md`: record the decision.
- `.decisions/instapaper-reading-list.md`: update secret-handling references.

## Non-goals

- Changing `scripts/fetch_instapaper.mjs` (it already reads `process.env`).
- Changing local development flow (`npm run reading:fetch:op` stays on 1Password).
- Touching other workflows (none use `op`).

## Assumptions

- The four Instapaper values are available in 1Password for the owner to load
  into GitHub secrets.
- `OP_SERVICE_ACCOUNT_TOKEN` is used only by this workflow.

## Steps

1. Branch off `origin/main` in a worktree.
2. Edit the workflow: remove the 1Password CLI step, add the secret-presence
   guard, pass the four secrets via step-scoped `env:` to `npm run reading:fetch`.
3. Update the header comment block (required secrets, local-dev note).
4. Add / update decision docs.
5. Owner registers the four GitHub secrets.
6. Open a PR; verify with a manual `workflow_dispatch` run.

## Verification

- `actionlint` (includes shellcheck on `run:` blocks) — passes locally.
- After secrets are set: a `workflow_dispatch` run completes with the fetch step
  green, and (if the snapshot changed) commits + deploys.
- Negative check: with a secret unset, the guard step fails the run instead of
  passing silently.

## Open Issues

- Remove `OP_SERVICE_ACCOUNT_TOKEN` from repo secrets once confirmed unused
  elsewhere.
