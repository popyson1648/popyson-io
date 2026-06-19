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

## Article metadata generation

New posts may contain `date = "auto"`, `auto_tags`, `[sumup] mode = "auto"`, or
`[thumbnail] mode = "none"`. Resolve and write those values before committing:

```sh
npm run metadata:generate:op
```

This command reads `GEMINI_API_KEY` from `.op.env` through 1Password when AI tag
or summary generation is needed. CI runs `node scripts/generate_metadata.mjs
--check`, which is a static check and does not call the AI provider.

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
- If metadata generation fails with `GEMINI_API_KEY is required`, add the key to
  `.op.env` locally or to the GitHub Actions secret named `GEMINI_API_KEY` for
  generation workflows.
- Lighthouse uses a local static server through LHCI and requires Chrome/Chromium.
