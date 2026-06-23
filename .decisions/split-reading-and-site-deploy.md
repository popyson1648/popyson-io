# Decision

## Title

Reading list refresh is decoupled from the site deploy (two workflows)

## Date

2026-06-23

## Status

Accepted

## Decision

Deployment to Cloudflare Pages is split into two workflows with a shared
`cloudflare-deploy` concurrency group:

- `deploy.yml` — triggered on `push` to `main` (and `workflow_dispatch`). It does
  a best-effort Instapaper fetch, then always builds and deploys. The fetch is
  `continue-on-error`: on any failure it keeps the committed `src/reading.json`
  and still deploys. This ships blog/about/code regardless of Instapaper.
- `reading-refresh.yml` — triggered on `schedule` (hourly) and
  `workflow_dispatch`. It hard-fails if the Instapaper secrets are missing, then
  fetches; build + deploy are gated on the fetch succeeding. On a transient
  failure it skips the redeploy, so the last successful deployment keeps serving.

Neither workflow commits the fetched snapshot back to the repository. The
committed `src/reading.json` stays a static fallback/seed.

## Context

`src/data.js` statically imports `src/reading.json`, so the reading list is baked
into the build (bundle + prerendered HTML); the browser never fetches it at
runtime (Instapaper has no CORS and needs signed requests). Refreshing the
reading list therefore requires a rebuild + redeploy.

Previously a single `reading-refresh.yml` did fetch + commit + build + deploy on
schedule and on push. Two problems surfaced once the fetch started working again
(see [ci-instapaper-secrets-direct.md](ci-instapaper-secrets-direct.md)):

1. The commit step pushed the snapshot directly to `main`, which is now a
   protected branch requiring pull requests, so the push was rejected and the
   job failed.
2. Because that single workflow also owned every site deploy, a reading fetch (or
   commit) failure blocked shipping unrelated blog/about/code changes.

## Alternatives

- Give the workflow a token/App that bypasses branch protection and keep
  committing the snapshot to `main`. Keeps the committed JSON always current but
  introduces a long-lived privileged credential and keeps the deploy paths
  coupled. Rejected for now in favour of staying token-free.
- Load `reading.json` at runtime as a same-origin asset (no CORS issue) so the
  data leaves the bundle entirely. Cleanest separation but requires refactoring
  the reading page and giving up data prerender for it. Deferred.

## Reason

Splitting the workflows gives the property that actually matters: a reading list
problem never blocks shipping other content, and a reading outage never
republishes a stale or empty list (it simply does not redeploy). It needs no
privileged token and no branch-protection change.

## Consequences

- The committed `src/reading.json` is not auto-refreshed. It only surfaces when a
  build does not fetch — `deploy.yml`'s fallback path during an Instapaper
  outage, CI verification, and local dev. In the rare case a push deploy lands
  during an outage, the live list shows the committed seed until the next hourly
  refresh (self-healing within ~1 hour). Refresh the seed manually with
  `npm run reading:fetch:op` + a normal PR if it drifts too far.
- Both workflows build the full site and deploy via Direct Upload; the shared
  concurrency group serializes them so uploads do not race.
- Scheduled runs deploy on every successful fetch (no change-gate), so deploy
  history shows hourly reading refreshes. An `actions/cache`-based change-gate
  could restore "deploy only on change" later without committing to the repo.

## Revisit Conditions

- The committed fallback drifting becomes a real problem (then adopt the
  token/App commit approach, or move reading data to a runtime-loaded asset).
- Hourly deploy entries become noisy enough to warrant a change-gate.
