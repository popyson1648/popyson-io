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
custom-record indexes under `dist/pagefind/`. Blog, Works, About, and their
assets come from a database snapshot named by `CONTENT_SNAPSHOT_ROOT`, which
must be an existing absolute directory. The build fails without it: the
repository holds no content to fall back to.

Materialize one for local work with `npm run content:pull`, which writes
`.tmp/content-snapshot` from the author API and prints the line to export. It
takes public content at its current revision by default, so a saved edit shows
up before it is published; pass `-- --include-private` to preview drafts, or
`-- --published` for the state the site serves.

`npm run editor` needs no such step: it pulls its own snapshot into
`.tmp/editor-content-snapshot` before building. That pull asks for published
revisions, because the snapshot builds the editor's shell and the site loader
rejects unfinished content — an entry the author is still filling in would
otherwise fail the build of the tool they need to finish it. The item being
edited is unaffected: it comes from the editor's own state. Set
`CONTENT_SNAPSHOT_ROOT` first to make it use that tree instead.

The Blog UI and rendered article bodies are emitted as a lazy route chunk, so
About and other entry routes do not download Blog/search code. Direct Blog and
article visits preload that chunk before replacing their prerendered HTML.
External fonts use `font-display: optional`: fast connections retain the chosen
typefaces, while constrained connections render immediately with the fallback
stack instead of delaying content for a font swap.

## Article metadata generation

New posts may contain `date = "auto"`, `auto_tags`, `[sumup] mode = "auto"`, or
`[thumbnail] mode = "auto"`. Resolve and write those values before committing:

```sh
npm run metadata:generate:op
```

This command reads `OPENAI_API_KEY` (tags, summary, thumbnail concept, and the
thumbnail image) from `.op.env` through 1Password when AI generation is needed,
and `GEMINI_API_KEY` for whichever section of `src/content/metadata.toml` names
`provider = "gemini"`. `OPENAI_API_KEY` must be billing-enabled. CI runs `node
scripts/generate_metadata.mjs --check`, which is a static check and does not call
any AI provider.

Database-backed publication runs the same generation step inside
`.github/workflows/content-publish.yml` before translation. Generated content
is returned to the Worker as a candidate revision and is never committed to
Git. See `.project/metadata.md` and `.project/content-publication.md`.

## Publish content

The local editor saves immutable revisions and desired visibility/deletion state
through the authenticated Worker API. Publish creates a job pinned to the exact
revision and state, then dispatches `content-publish.yml` with only the opaque
job id. The workflow generates metadata, translates, verifies, and deploys one
immutable release without committing content to Git. See
`.project/content-publication.md`.

## Run

```sh
npm run dev
```

## Content editor

Copy `.op.env.example` to the ignored `.op.env`, replace its placeholder
1Password references, sign in to the 1Password CLI, then start the
database-backed Blog, Works, and About editor:

```sh
npm run editor:setup # one time; asks for sudo approval
npm run editor
```

`editor:setup` registers the current WSL account as the Tailscale operator so
normal editor starts can maintain the Serve listener without `sudo`. Skip it
when that operator permission has already been configured.

`npm run editor` builds a production-optimized editor bundle into the
Git-ignored `editor/dist/` directory, serves it only from the loopback address,
and configures a separate HTTPS Serve listener. Open the URL printed by the
current process, but do not copy it to documentation, issues, shared logs, or
screenshots because it contains a device-specific internal host name. The API
verifies the loopback proxy peer, expected host, Serve-injected login, and the
Origin of state-changing requests. Startup fails when the configured port is
occupied, and existing unrelated Serve listeners are not replaced.

The editor can list and read Blog, Works, and the fixed About item; create
Blog/Works items; edit and preview them; save immutable D1 revisions; upload
images to private R2; restore history; change public/private state; soft-delete
and restore; and publish the currently pinned revision. A stale save or asset
update returns a conflict instead of overwriting a newer revision.

Existing public content has already been stored in D1 and private R2, with
document counts and asset bytes and checksums compared with the migration
source. Public/private and soft-delete changes are saved in D1 immediately but
do not alter the static site until Publish is run.

Publish pins the current revision, visibility, and deletion state and sends
only an opaque job id to GitHub Actions. Actions fetches that fixed D1/R2
snapshot into temporary storage, generates metadata and translations, verifies
and builds the static site, and deploys it to Pages. The published revision is
advanced only after a successful deployment, and the deployed site does not
read D1 at request time.

The local Node server alone owns the author Access credential and fine-grained
GitHub Actions credential. The browser receives neither credential, and source
snapshots are not stored in repository commits, reusable Actions artifacts or
caches, or shared logs.

The local bundle is regenerated at normal startup and is not a source or backup
directory. Build it without starting the server with `npm run editor:build`.
Use `npm run editor:dev` only when changing the editor itself and HMR is useful.

The editor has its own build configuration and output, so `npm run build`, the
root `dist/`, `npm run dev`, and the deployed static site do not expose the
editor page or its write APIs.

Markdown actions are grouped by headings, inline formatting, block elements,
and images and wrap onto multiple rows instead of requiring horizontal toolbar
scrolling. Desktop layouts provide write, split, and preview modes. At 900 px and
below, split mode is removed; phones provide focused write and preview modes.

Tailscale must be installed and connected inside WSL. Tailnet grants should
restrict TCP port 4173 on this node to the author. Do not enable Tailscale
Funnel for the editor. For local recovery without configuring Serve, run:

```sh
npm run editor -- --no-tailscale
```

This recovery mode remains loopback-only at `http://127.0.0.1:4173/editor`.
There is no `0.0.0.0` binding, direct Tailscale-IP endpoint, application token,
or token-bearing URL.

Stop a foreground server with `Ctrl+C`, or stop a server from another WSL
terminal with `npm run editor:stop`. The stop command verifies the recorded
process and working directory before sending `SIGTERM`; the Serve mapping then
has no editor backend until the next start.

Append `-- --no-tailscale` to `npm run editor:dev` for loopback-only editor UI
development.

`Choose photos` uses the operating system image picker and accepts multiple
images. `Take photo` asks supported mobile browsers for the environment-facing
camera. The exact chooser is controlled by the browser and operating system.
Desktop drag-and-drop and clipboard paste are also supported.

Editor uploads are stored under content-addressed keys in private R2. The local
server proxies authenticated bytes for preview. Publication copies only assets
referenced by a public, non-deleted release into the static Pages output; R2 has
no public endpoint.

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
deploy`) from three workflows; Cloudflare's Git integration is not used. All
three share the `cloudflare-deploy` queue so an older build cannot overwrite a
newer content release.

- `.github/workflows/deploy.yml` — on push to `main` (and `workflow_dispatch`).
  Builds and deploys blog/about/code. It does a best-effort Instapaper fetch and
  falls back to the committed `src/reading.json` if it fails, so a content deploy
  never depends on Instapaper.
- `.github/workflows/reading-refresh.yml` — hourly (and `workflow_dispatch`).
  Refreshes the reading list; it builds and deploys only when the fetch
  succeeds, otherwise the last successful deployment keeps serving.
- `.github/workflows/content-publish.yml` — dispatched with an opaque database
  publication job id. It generates metadata, translates, verifies, deploys, and
  atomically finalizes the pinned release without committing content to Git.

Code and reading-list deployments download the active immutable release from
the Worker after acquiring the shared queue, and `ci.yml` downloads the same
release before verification so CI checks what the site actually ships.

See `.decisions/instapaper-reading-list.md` and
`.decisions/split-reading-and-site-deploy.md`.

## Common Failures

- If dependency commands fail before installing packages, run `npm ci`.
- If metadata generation fails with `OPENAI_API_KEY is required` or
  `GEMINI_API_KEY is required`, add the key to `.op.env` locally or to the
  matching GitHub Actions secret for generation workflows.
- Lighthouse uses a local static server through LHCI and requires Chrome/Chromium.
