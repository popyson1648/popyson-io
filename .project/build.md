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

This command reads `GEMINI_API_KEY` (tags, summary, thumbnail concept) and
`OPENAI_API_KEY` (thumbnail image) from `.op.env` through 1Password when AI
generation is needed. `OPENAI_API_KEY` must be billing-enabled. CI runs `node
scripts/generate_metadata.mjs --check`, which is a static check and does not call
any AI provider.

On push to `main`, `.github/workflows/generate-metadata.yml` runs the same
generation step automatically and commits the resolved metadata and generated
thumbnails. See `.project/metadata.md`.

## Publish a post

`npm run post:push` (and `npm run work:push` for `src/content/works/`) runs
`verify.py --mode standard` first and stops without committing if it fails, then
stages only that one content directory, builds the commit subject
from what changed (`add` / `update` / `remove`, with the post title for a single
change and counts plus a body list for several), commits, and pushes. Add
`--dry-run` to print the message without touching git.

## Run

```sh
npm run dev
```

## Content editor

Start the repository-backed Blog and Works editor:

```sh
npm run editor:setup # one time; asks for sudo approval
npm run editor
```

`editor:setup` registers the current WSL account as the Tailscale operator so
normal editor starts can maintain the Serve listener without `sudo`. Skip it
when that operator permission has already been configured.

Stop a server started by this repository from another WSL terminal with
`npm run editor:stop`. When it is running in the foreground, `Ctrl+C` remains
the quickest stop action. The stop command validates both the recorded process
command and working directory before sending `SIGTERM`. The Tailscale Serve
mapping remains available as a stable bookmark but has no editor backend while
the process is stopped.

`npm run editor` builds a production-optimized editor bundle into the
Git-ignored `editor/dist/` directory, serves it only from `127.0.0.1:4173`, and
configures a separate HTTPS Serve listener on port 4173. It prints a stable URL
such as:

```text
https://wsl-ubuntu.tail29f20.ts.net:4173/editor
```

Bookmark the URL printed for the current machine. It works from devices signed
in to the permitted tailnet account and does not contain an editor secret. The
API verifies the loopback proxy peer, Tailscale DNS host, Serve-injected login,
and the Origin of state-changing requests. Port 4173 is strict: when it is
occupied, startup fails instead of silently changing the bookmarked URL. The
existing Serve listener on HTTPS port 443 is not replaced.

The editor can create, edit, preview, save private drafts, upload images, and
publish the currently open content item. The preview imports the public Blog
and Works styles in an isolated frame and provides automatic, desktop, and
phone widths.

Drafts autosave after editing pauses. `Save draft` and `Ctrl`/`Cmd` + `S` save
immediately. All private Markdown and images live under the Git-ignored
`.drafts/` tree and do not modify `src/content/`, production builds, Git status,
commits, or pushes. This directory is local authoring state: it is not backed up
or synchronized, so copy it separately if unpublished work needs a backup.

`Publish` is available only when the editor runs from `main`. It validates the
complete Japanese and English pair, promotes only the open draft to
`src/content/`, runs standard verification, commits only that item's content
directory, and pushes `main`. The private draft is removed only after the push
succeeds; the resulting site deployment is reported as pending. Before-commit
failures restore the prior public content, and later failures retain the draft
for recovery. Publishing never merges.

The local bundle is regenerated at normal startup and is not a source or backup
directory. Build it without starting the server with `npm run editor:build`.
Use `npm run editor:dev` only when changing the editor itself and HMR is useful.

The editor has its own build configuration and output. `npm run build`, the
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

Append `-- --no-tailscale` to `npm run editor:dev` for loopback-only editor UI
development.

`Choose photos` uses the operating system image picker and accepts multiple
images. `Take photo` asks supported mobile browsers for the environment-facing
camera. The exact chooser is controlled by the browser and operating system.
Desktop drag-and-drop and clipboard paste are also supported.

Before publication, images are stored under the open entry's draft `assets/`
directory. The editor serves draft assets at the final
`/content-assets/<posts|works>/<id>/<file>` URL. Publishing moves them with the
Markdown; production exposes only the published copies.

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
