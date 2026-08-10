# Decision

## Title

Move content authoring out of Git into D1 and R2 behind a Worker API

## Date

2026-08-10

## Status

Accepted

## Decision

Cloudflare D1 is the authoritative store for content identity, immutable text
revisions, visibility, soft deletion, publication jobs, and release manifests.
A non-public R2 bucket stores original and generated binary assets. Both are
reachable only through a narrowly scoped Worker API in `workers/content-api/`.

The public site stays static. A GitHub-hosted runner fetches one pinned,
immutable release into `$RUNNER_TEMP`, generates metadata and translations,
builds a single snapshot, and uploads `dist/` to Cloudflare Pages. It commits
no content and uploads no content-bearing artifact or cache.

Git keeps code, Worker source, D1 migrations, prompts, metadata policy,
translation rules, tests, workflows, and documentation. After the imported
release is proven in production, the migrated Blog, Works, About/news sources
and generated item thumbnails are removed from the current Git tip with one
ordinary commit. Earlier commits are preserved; no history is rewritten.

This supersedes both Git-backed authoring and the age-encryption plus
history-rewrite approach in
`.plans/2026-08-10-editor-private-content-and-deletion.md`.

## Context

Authoring currently commits Markdown, TOML, images, and generated thumbnails to
a public repository, so every draft and every visibility change is a public Git
event. The editor is local and Tailscale-only, but its persistence is not.
Private content and deletion were the triggering requirements.

## Alternatives

- Encrypt private items with `age` and rewrite Git history on deletion.
- Serve the public site dynamically from D1 instead of building static output.
- Store everything in R2 with a hand-written manifest and no relational store.
- Adopt a hosted CMS or a managed Postgres service.
- Run a self-hosted GitHub Actions runner on the WSL host.

## Reason

D1 transactions express visibility, revision, job, and release state that an
R2-only manifest would have to reimplement with custom compare-and-swap logic,
while R2 is the right store for images that would otherwise strain D1's 2 MB
row limit. Keeping Pages output static preserves the existing prerender,
Pagefind, RSS, sitemap, and cacheability behavior and keeps public requests
independent of database availability. Encryption plus history rewriting was
rejected because it cannot undo copies already published, breaks clones and
pull-request refs, and adds a destructive operation to routine deletion. A
self-hosted runner would expose the WSL host to untrusted workflow code from a
public repository.

## Consequences

- `workers/content-api/` is a required root-level directory: a separately
  deployable Worker with its own Wrangler config, migrations, and tests.
- Content loading takes an explicit snapshot root. CI uses `$RUNNER_TEMP`; local
  public-site development uses a Git-ignored `.tmp/` snapshot. Production and CI
  fail closed when the snapshot is missing.
- Publication becomes a browser-triggered job instead of a Git push, and
  metadata generation and translation stop committing to the repository.
- A visibility or deletion change only reaches the public site after a
  successful rebuild and deployment; the previous release stays live until then.
- Content already published to Git remains readable in old commits by design.
  The editor must say so when an item is made private.
- Editor and CI authenticate with separate Cloudflare Access service tokens.
  These are long-lived bearer credentials that need rotation and expiry alerts.
- Backups depend on D1 Time Travel plus locked daily exports to a second R2
  bucket in the same Cloudflare account, which is not provider-level disaster
  tolerance.

## Revisit Conditions

Revisit if content approaches D1's size limits, if the site needs
request-time rendering, if Cloudflare ships native GitHub workload-identity
federation that can replace the CI service token, or if account-level disaster
tolerance becomes a requirement.
