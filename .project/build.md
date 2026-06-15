# Build

## Prerequisites

- Node.js 22
- npm
- Python 3.11 for the repository verification runner

## Setup

```sh
npm ci
```

## Build

```sh
npm run build
```

## Run

```sh
npm run dev
```

For a production preview:

```sh
npm run build
npm run preview
```

## Reading list (Instapaper)

The reading list is generated from Instapaper into `src/reading.json`.
Secrets are read through 1Password; edit `.op.env` (and `.op.env.auth`) so the
`op://` references point at your vault. These files hold references only, not
secrets.

```sh
# one-time: exchange username/password for an access token, then store the
# printed token/secret in 1Password
npm run instapaper:auth:op

# refresh the committed snapshot
npm run reading:fetch:op
```

In CI, `.github/workflows/reading-refresh.yml` refreshes the snapshot on a
schedule and commits it to `main`. Cloudflare Pages' Git integration then
rebuilds (`npm run build`, output `dist`) and deploys automatically. See
`.decisions/instapaper-reading-list.md`.

## Common Failures

- If dependency commands fail before installing packages, run `npm ci`.
- Lighthouse uses a local static server through LHCI and requires Chrome/Chromium.
