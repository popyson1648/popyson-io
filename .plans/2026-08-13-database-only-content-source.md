# Make D1/R2 the only content source

## Goal

Articles, works, and About live in D1/R2 and nowhere else. The repository keeps
code, content *policy* (`src/content/metadata.toml`, `src/content/prompts/`,
`src/content/theme.toml`), and nothing an author edits.

Today the repository still carries a full copy of every article, work, About
file, and thumbnail, and the loader silently falls back to it whenever
`CONTENT_SNAPSHOT_ROOT` is unset. That fallback is why deleting the copies
breaks `npm run dev`, `npm run build`, and CI.

## Current state

- D1 holds About (1), works (1), posts (4) plus every revision; R2 holds the
  four thumbnails. No migration is outstanding.
- The active release has published revisions for all six public items, and the
  site built from it matches the pre-cutover output byte for byte.
- `contentSnapshotRoot()` returns the repository root when the environment
  variable is unset, so every build outside the publication workflow reads the
  repository copy.
- `ci.yml` runs `verify.py --mode ci` with no snapshot, so it verifies the
  repository copy.
- `deploy.yml` and `reading-refresh.yml` download the active release only when
  `CONTENT_CLOUD_CUTOVER == '1'`.

## Plan

### 1. Remove the fallback

`contentSnapshotRoot()` requires `CONTENT_SNAPSHOT_ROOT`. When it is missing,
fail with a message naming the command that materializes a snapshot. Policy
files stay repository-rooted and keep resolving against `ROOT`.

This is the change that makes every later step necessary rather than optional:
after it, no build can silently read stale content.

### 2. Give humans a way to materialize content

Add `npm run content:pull` (`op run` + the author service token) that writes a
snapshot tree to `.tmp/content-snapshot` from the **author** API — current
revisions including private drafts, which is what an author wants locally — and
prints the `CONTENT_SNAPSHOT_ROOT` line to export.

The author API already exposes list, read, and asset download; the publication
client already knows how to write the tree. The new command wires the two
together and adds no new Worker route.

### 3. Keep tests hermetic

Unit and component tests must not depend on production data or credentials.
Add `tests/fixtures/content/` (one post per locale, one work, one About) and
point the Vitest setup at it. The suites that assert real published content
already run inside the publication workflow against the candidate release.

### 4. Verify CI against the active release

`ci.yml` downloads the active release into a runner-temporary directory before
`verify.py --mode ci`, using `CONTENT_API_URL` and the CI Access service token
that already exist as repository secrets.

Trade-off to accept explicitly: CI then depends on Cloudflare availability and
on secrets, so a fork's pull request cannot run it. This repository has no
forks, and the alternative — verifying a fixture — would stop CI from ever
seeing the content the site actually ships.

### 5. Retire the cutover switch

Remove the `CONTENT_CLOUD_CUTOVER` conditionals from `deploy.yml` and
`reading-refresh.yml` so both always download the active release, then delete
the repository variable. A switch with one reachable position is a trap.

### 6. Archive the copies

Move `src/content/posts/`, `src/content/works/`, `src/content/about/`, and the
generated `public/thumbnails/*.png` to `archive/content/`, with a README saying
nothing reads it. Keep the `.gitkeep` placeholders so the snapshot tree has
somewhere to land.

### 7. Update the documents

`.project/build.md`, `.project/content-publication.md`, `.project/structure.md`,
`.project/metadata.md`, `.project/verification.toml` comments, and `README.md`
all describe the repository as the local default. Rewrite those passages, and
record the decision under `.decisions/`.

## Verification

- `npm run content:pull` then `python3 scripts/verify.py` passes locally.
- `verify.py` fails with the intended message when no snapshot is present.
- CI passes on the pull request.
- A publication job still succeeds end to end and the site output stays
  unchanged against the recorded 22-URL baseline.

## Out of scope

The editor already reads and writes D1/R2 through the author API and needs no
change.
