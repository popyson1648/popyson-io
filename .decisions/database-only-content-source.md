# D1/R2 is the only content source

## Status

Accepted, 2026-08-13.

## Context

Articles, works, and About were migrated to D1/R2, and the publication,
deploy, and reading-refresh workflows build from an immutable release. The
repository still carried a full copy of the same content, and
`contentSnapshotRoot()` returned the repository root whenever
`CONTENT_SNAPSHOT_ROOT` was unset.

That left two sources for the same data. The copy was never updated by the
editor, so it drifted from the moment the first article was saved to D1, and
any build that forgot to set the variable would have shipped the stale copy
without a word. The migration was finished; the machinery around it still
assumed the old arrangement.

## Decision

The database is the only source of articles, works, and About.

- `contentSnapshotRoot()` requires `CONTENT_SNAPSHOT_ROOT` and throws a message
  naming `npm run content:pull` when it is missing. There is no fallback.
- `npm run content:pull` materializes a snapshot from the author API for local
  work: public content by default, drafts with `--include-private`.
- `ci.yml` downloads the active release before verifying, so CI checks the
  content the site ships rather than a stand-in.
- The unit and component suites read `tests/fixtures/content/` instead, so they
  stay hermetic, deterministic, and runnable without credentials.
- `deploy.yml` and `reading-refresh.yml` download the active release
  unconditionally; the `CONTENT_CLOUD_CUTOVER` variable is deleted.
- The repository copy moves to `archive/content/`, which nothing reads.

The repository keeps content *policy* — `src/content/metadata.toml`,
`src/content/prompts/`, `src/content/theme.toml`. Those are configuration that
belongs with the code that consumes them, not material an author edits.

## Consequences

CI now depends on Cloudflare availability and on the CI Access service token,
and a pull request from a fork cannot run it. That is accepted deliberately:
this repository has no forks, and verifying a fixture would mean CI never sees
the content the site actually serves. The alternative remains available — point
`ci.yml` at `tests/fixtures/content/` — if that trade ever stops paying.

Local work needs one extra step (`npm run content:pull`) before `npm run dev`
or `npm run build`. The failure mode is a clear error naming the command, not a
silently wrong build.

`archive/content/` duplicates what Git history already holds. It is kept
because a readable directory is easier to consult than a deleted tree, and it
costs 8MB in a repository that is not size-constrained.

See `.plans/2026-08-13-database-only-content-source.md` and
`.project/content-publication.md`.
