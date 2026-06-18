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

The production build runs Vite, prerenders route HTML, then generates Pagefind
custom-record indexes under `dist/pagefind/`.

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
Secrets are read through 1Password; copy `.op.env.example` to `.op.env` and
copy `.op.env.auth.example` to `.op.env.auth`, then edit the local files so the
`op://` references point at your vault. The local `.op.env*` files are ignored
because they reveal vault, item, and field paths even when they do not contain
literal secret values.

```sh
# one-time: exchange username/password for an access token, then store the
# printed token/secret in 1Password
npm run instapaper:auth:op

# refresh the committed snapshot
npm run reading:fetch:op
```

In CI, `.github/workflows/reading-refresh.yml` refreshes the snapshot on a
schedule, builds, and deploys to Cloudflare Pages via Direct Upload
(`wrangler pages deploy`). See `.decisions/instapaper-reading-list.md`.

## Common Failures

- If dependency commands fail before installing packages, run `npm ci`.
- Lighthouse uses a local static server through LHCI and requires Chrome/Chromium.
