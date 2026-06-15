# Plan

## Goal

Source the reading list from the owner's Instapaper account: unread -> 未読,
archive -> 読了. Remove the read-only-meaningless checkbox; limit tabs to
未読 / 読了. Automate fetch + deploy to Cloudflare Pages.

## Scope

- `scripts/instapaper_oauth.mjs`: OAuth 1.0a (HMAC-SHA1) signing helpers, no deps.
- `scripts/fetch_instapaper.mjs`: fetch unread + archive, write `src/reading.json`.
- `scripts/instapaper_auth.mjs`: one-time xAuth access-token helper.
- `.op.env`, `.op.env.auth`: committed 1Password reference files (no secrets).
- `package.json`: `reading:fetch`, `reading:fetch:op`, `instapaper:auth:op`.
- `src/reading.json`: committed snapshot, imported by `src/data.js`.
- `src/pages.jsx` ReadingPage: remove checkbox/toggle, 2 tabs, enable ext link.
- `src/i18n.js`: drop `reading_all`, add `open_link`.
- `src/app.css`: remove unused `.rcheck` / `.ritem-note` rules.
- `.github/workflows/reading-refresh.yml`: scheduled fetch -> commit snapshot to
  main. Cloudflare Pages' Git integration rebuilds/deploys on the commit.

## Non-goals

- No backend or per-request serverless fetch.
- No highlights/tags/progress display.
- No changes to other (persona) content.

## Assumptions

- Owner holds Instapaper Full API consumer key/secret in 1Password.
- Access token obtained once via `instapaper:auth:op`, stored in 1Password.
- Cloudflare Pages project + tokens provisioned by the owner.

## Steps

1. Add OAuth + fetch + auth scripts and npm scripts.
2. Add committed `.op.env` / `.op.env.auth` reference files (no secrets).
3. Wire `src/data.js` to import `src/reading.json`.
4. Rework ReadingPage UI; trim i18n + CSS.
5. Add the fetch/deploy workflow.
6. Update `.project/` and `.decisions/`.

## Verification

- OAuth signer matches the canonical OAuth 1.0a base string / independent impl.
- `npm run lint`, `npm run build`, `python3 scripts/verify.py`.
- `npm run dev` + browser: 2 tabs (default 未読), no checkbox, working ext links,
  archive items under 読了.
- CI dry run via `workflow_dispatch` after secrets are set.

## Open Issues

- Owner must connect the repo to Cloudflare Pages (Git integration: build
  `npm run build`, output `dist`), create a 1Password service account with read
  access to the Development vault, and set the `OP_SERVICE_ACCOUNT_TOKEN` GitHub
  secret before the scheduled refresh can run.
