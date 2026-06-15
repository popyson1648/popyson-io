# Decision

## Title

Reading list sourced from Instapaper via a build-time snapshot

## Date

2026-06-15

## Status

Accepted

## Decision

The reading list is populated from the owner's Instapaper account, not from
hand-edited content:

- The unread folder maps to "未読" (`done: false`); the archive folder maps to
  "読了" (`done: true`).
- A Node script (`scripts/fetch_instapaper.mjs`) calls the Instapaper Full API
  and writes a snapshot to `src/reading.json`, which the SPA imports.
- Secrets are accessed through 1Password (`op`). The committed `.op.env` /
  `.op.env.auth` hold only `op://` references (no secret values), used by both
  local runs and CI.
- A GitHub Actions workflow (`.github/workflows/reading-refresh.yml`) refreshes
  the snapshot on a schedule and commits it to `main` when changed. Cloudflare
  Pages' Git integration rebuilds and deploys automatically on that commit.
- The reading list UI is read-only: the per-item checkbox/toggle was removed and
  the tabs are limited to 未読 / 読了.

## Context

The site is a static Vite + React SPA with no backend. The Instapaper Full API
uses OAuth 1.0a (HMAC-SHA1, consumer secret required) and does not support CORS,
so it cannot be called from the browser. Instapaper is the source of truth for
read/unread state, making the site-side checkbox meaningless.

## Alternatives

- Call Instapaper directly from the browser — impossible (CORS, secret exposure).
- Serverless proxy fetched per request — adds backend/runtime infrastructure the
  project deliberately avoids.
- Keep hand-edited reading data — does not reflect real Instapaper state.

## Reason

A build-time snapshot keeps the site fully static (no backend), keeps secrets out
of the client and the repo (1Password), and gives a committed, diffable JSON that
provides local-dev parity and a fallback when the API is unavailable.

## Consequences

- The reading list updates only when the workflow runs (scheduled/dispatch/push),
  not live per visitor.
- Requires one GitHub secret: `OP_SERVICE_ACCOUNT_TOKEN` (1Password service
  account with read access to the Development vault). Cloudflare credentials are
  not needed in CI because Cloudflare builds from the Git repo directly.
- OAuth signing is implemented in-repo (`scripts/instapaper_oauth.mjs`) with no
  new runtime dependencies.
- Deployment target is Cloudflare Pages (domain already on Cloudflare).

## Revisit Conditions

- Instapaper changes or deprecates the Full API / xAuth.
- A backend or serverless layer is introduced for other reasons (then live fetch
  becomes viable).
- The deployment target moves away from Cloudflare Pages.
