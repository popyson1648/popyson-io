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
`[thumbnail] mode = "auto"`. Resolve and write those values before committing:

```sh
npm run metadata:generate:op
```

This command reads `GEMINI_API_KEY` (tags, summary, thumbnail concept) and
`OPENAI_API_KEY` (thumbnail image) from `.op.env` through 1Password when AI
generation is needed. `OPENAI_API_KEY` must be billing-enabled. CI runs `node
scripts/generate_metadata.mjs --check`, which is a static check and does not call
any AI provider.

On push to `main`, `.github/workflows/generate-metadata.yml` runs the same
generation step automatically and commits the resolved metadata and generated
thumbnails. See `.project/metadata.md`.

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

`npm run reading:fetch:op` overwrites the local `src/reading.json`. In CI the
snapshot is never committed back; the committed file is only a fallback/seed.
See the Deploy section below.

## Deploy

The site is deployed to Cloudflare Pages via Direct Upload (`wrangler pages
deploy`) from two decoupled workflows; Cloudflare's Git integration is not used.

- `.github/workflows/deploy.yml` — on push to `main` (and `workflow_dispatch`).
  Builds and deploys blog/about/code. It does a best-effort Instapaper fetch and
  falls back to the committed `src/reading.json` if it fails, so a content deploy
  never depends on Instapaper.
- `.github/workflows/reading-refresh.yml` — hourly (and `workflow_dispatch`).
  Refreshes the reading list; it builds and deploys only when the fetch
  succeeds, otherwise the last successful deployment keeps serving.

See `.decisions/instapaper-reading-list.md` and
`.decisions/split-reading-and-site-deploy.md`.

## Common Failures

- If dependency commands fail before installing packages, run `npm ci`.
- If metadata generation fails with `GEMINI_API_KEY is required` or
  `OPENAI_API_KEY is required`, add the key to `.op.env` locally or to the
  matching GitHub Actions secret for generation workflows.
- Lighthouse uses a local static server through LHCI and requires Chrome/Chromium.
