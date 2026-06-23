# Plan

## Goal

Decouple the reading-list refresh from the rest of the site deploy so an
Instapaper outage (or a reading fetch failure) never blocks shipping
blog/about/code changes.

## Scope

- Add `.github/workflows/deploy.yml`: on push to `main` + dispatch, best-effort
  reading fetch (fallback to committed snapshot), always build + deploy.
- Rewrite `.github/workflows/reading-refresh.yml`: schedule + dispatch only,
  guard secrets, fetch, build + deploy only on fetch success, no commit to repo.
- Share a `cloudflare-deploy` concurrency group across both.
- Update docs: `.decisions/split-reading-and-site-deploy.md` (new),
  `.decisions/instapaper-reading-list.md`, `.project/build.md`,
  `.project/release.md`, `.project/structure.md`.

## Non-goals

- Committing the fetched snapshot back to `main` (stays token-free; no
  branch-protection bypass).
- Moving reading data to a runtime-loaded asset (deferred).
- Changing `scripts/fetch_instapaper.mjs` or the reading UI.

## Assumptions

- `INSTAPAPER_*` and `CLOUDFLARE_*` secrets and `CLOUDFLARE_PAGES_PROJECT` are
  available to both workflows.
- Hourly deploys (no change-gate) are acceptable.

## Steps

1. Branch off `origin/main` in a worktree.
2. Write `deploy.yml`; rewrite `reading-refresh.yml` (drop push trigger, drop
   commit-to-main, gate deploy on fetch success).
3. Update decision and project docs.
4. `actionlint` locally.
5. PR; verify both workflows via `workflow_dispatch`; confirm a push deploy still
   ships and a reading refresh deploys fresh data.

## Verification

- `actionlint` (incl. shellcheck) — passes locally.
- `deploy.yml` dispatch: builds + deploys; reading fetch best-effort.
- `reading-refresh.yml` dispatch: fetch succeeds -> build + deploy; on a forced
  fetch failure, build + deploy are skipped (job stays green, no redeploy).

## Open Issues

- Committed `src/reading.json` is not auto-refreshed (static fallback). Refresh
  the seed manually if it drifts.
- Optional follow-up: `actions/cache`-based change-gate to avoid hourly deploys
  when the snapshot is unchanged.
