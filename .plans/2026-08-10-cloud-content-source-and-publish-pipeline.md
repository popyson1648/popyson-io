# Cloud content source and publish pipeline

## Goal

Move Blog, Works, and About authoring out of Git while preserving the current
static Cloudflare Pages site, local Tailscale-only editor, AI metadata and
translation automation, Pagefind, RSS, sitemap, and public-site performance.

New and updated source text, private drafts, revisions, uploaded images,
generated translations, generated metadata, and generated thumbnails must not
be committed to or stored as GitHub repository content.

Existing Blog, Works, About/news content, body assets, and generated thumbnails
must also be imported into D1/R2. After import, backup, shadow-build comparison,
and production cutover succeed, remove their tracked copies from the current Git
tip with a normal commit. Preserve all earlier commits; do not rewrite history.

## Recommendation

Use D1 as the authoritative relational store for content identity, immutable
text revisions, visibility, soft deletion, publication jobs, and release
manifests. Use a non-public R2 bucket for original and generated binary assets.
Expose both only through a narrowly scoped Worker API.

Keep the public site static. A GitHub-hosted Actions runner retrieves an exact,
immutable publication revision into `$RUNNER_TEMP`, performs metadata
generation and translation, builds one pinned release snapshot, and uploads
the resulting `dist/` directly to Cloudflare Pages. It never commits generated
content or uploads a content-bearing Actions artifact.

This is preferable to the alternatives for this repository because:

- D1 transactions fit the visibility, revision, job, and release state that an
  R2-only manifest would have to implement with custom compare-and-swap logic.
- R2 is the appropriate object store for images and thumbnails; putting binary
  files in D1 would consume its 2 MB row limit and complicate streaming.
- Static Pages output preserves the existing prerender, Pagefind, RSS, sitemap,
  cacheability, and no-runtime-database behavior of the public site.
- A dynamic D1-backed public site would remove the publication build but would
  require a wider SSR/search/feed rewrite and make every public request depend
  on Worker and database availability.
- A hosted CMS or Postgres service would duplicate the custom editor and add a
  second platform without a demonstrated requirement that exceeds D1 limits.
- A public-repository self-hosted runner would expose the WSL host to untrusted
  workflow code and is not an acceptable way to keep content off GitHub-hosted
  runners.

## Approved Decisions

- The documented plaintext-processing, static-redeployment, credential,
  same-provider backup, and old-public-copy concerns are accepted.
- Migrate every currently published Blog post, Work, About/news document, body
  asset, and generated thumbnail into D1/R2 as part of this task.
- Remove the successfully migrated source and generated asset copies from the
  current Git tip.
- Keep the existing Git commit history unchanged. The removal commit remains
  normally revertible; no force-push or history-rewrite procedure is required.

## Scope

- Provision a production D1 database, a private primary R2 asset bucket, and a
  private backup R2 bucket.
- Add a Worker API for editor CRUD, asset transfer, publication jobs, immutable
  release snapshots, CI result upload, and deployment reconciliation.
- Store Blog, Works, and the fixed About item in the same revision model.
- Add `public` and `private` visibility plus nullable `deleted_at` soft deletion
  and restore.
- Keep all buckets non-public; published image files are copied into the Pages
  build and served as ordinary static site assets.
- Change the local editor backend to read and write through the Worker API.
- Replace Git-push publication with a browser-triggered publication job.
- Consolidate metadata generation, translation, verification, and deployment
  into one content publication workflow.
- Make code-push and scheduled-reading deployments build from the active D1
  release rather than repository content.
- Import existing repository content and assets with checksums and a reversible
  cutover.
- Remove migrated `src/content/posts/**`, `src/content/works/**`, editor-managed
  `src/content/about/**`, and item thumbnails under `public/thumbnails/**` from
  the current Git tip after the new source is proven in production. Keep prompts,
  theme, metadata policy, and other non-content configuration in Git.
- Add automated backups, retention protection, restore documentation, and a
  tested restore drill.
- Update project documentation, verification configuration, and decision
  records to match the new source of truth.

## Non-goals

- Hosting or publicly deploying the editor UI. `npm run editor` and the existing
  Tailscale Serve bookmark remain the only authoring surface.
- Application-level encryption of private content. Cloudflare-managed
  encryption at rest and TLS remain enabled, but the application does not
  introduce age, SSE-C, or a user-managed decryption key.
- Physically deleting content rows or historical revisions during normal delete
  operations.
- Rewriting past Git commits, branches, tags, or other historical refs. Existing
  content remains visible in old commits even after its current tracked copy is
  removed.
- Claiming that an item which was already publicly deployed can be made secret
  retroactively. The current site and Cloudflare-owned old deployments can be
  cleaned up, but independent caches, archives, clones, and screenshots cannot
  be revoked.
- Replacing Gemini, OpenAI, Claude Code, Instapaper, Pagefind, or Cloudflare
  Pages as part of the storage migration.
- Multi-user editing, comments, real-time collaboration, or public API access.

## Assumptions

- Only content explicitly submitted for publication is sent to GitHub Actions
  and the configured AI providers. Saving or previewing a private draft never
  starts an Actions workflow.
- Published source is expected to become public. GitHub's ephemeral runner and
  the AI providers necessarily process that plaintext before deployment, even
  though it is not committed to Git, placed in Actions cache/artifacts, or
  intentionally printed in logs.
- D1 text revisions remain below an application limit chosen well under D1's
  2 MB maximum row size. Images and thumbnails always use R2.
- The primary R2 bucket has no `r2.dev` endpoint or custom public domain.
- The current editor's Tailscale Serve authentication remains unchanged. The
  browser never receives Cloudflare or GitHub credentials; the local Node
  server owns all outbound authenticated calls.
- Local editor-to-Worker authentication uses a dedicated Cloudflare Access
  service token stored in 1Password and injected through an ignored `op run`
  environment file. It is distinct from the CI service token.
- Editor-to-GitHub dispatch uses a fine-grained token limited to this repository
  with Actions write permission, stored in 1Password, given a short practical
  expiry, and available only to the local server process.
- GitHub Actions-to-Worker authentication uses a separate Cloudflare Access
  service token stored in GitHub Actions secrets and admitted only to CI API
  paths. This deliberately prefers Cloudflare's supported service identity over
  a custom GitHub OIDC verifier. Revisit when Cloudflare provides a native
  GitHub workload-identity federation path.
- The Worker verifies the Access assertion and expected service-token identity
  in addition to the Access policy, applies route-specific authorization, and
  never exposes raw D1 SQL or general R2 credentials.
- The current uncommitted About-editor work stays intact and is migrated to the
  new persistence interface during implementation.

## Data Model

- `content_items`: stable id, kind, slug, desired visibility, `deleted_at`,
  current draft revision, published revision, and timestamps.
- `content_revisions`: immutable revision id, parent/base revision, Japanese and
  English text, structured metadata, content checksum, creation source, and
  timestamps.
- `assets`: immutable content-addressed R2 key, item/revision ownership, media
  type, size, SHA-256, and logical filename.
- `publish_jobs`: opaque job id, requested source revision, expected current
  revision, GitHub run id, state, attempts, and sanitized error summary.
- `releases`: immutable release id, code SHA, state, manifest checksum, Pages
  deployment id, and timestamps.
- `release_items`: the exact published revision for every item in a release.

Use foreign keys, unique constraints, and indexes on item kind/slug,
visibility/deletion, job state, and release state. Use `D1Database.batch()` for
state transitions that must commit or roll back together. Use immutable R2
object keys; upload an object before referencing it transactionally, and treat
an unreferenced object as safe garbage that a later audited cleanup may remove.

## Publication State Machine

1. The editor saves a new immutable revision and advances the item's current
   draft pointer with an expected-revision check. A conflicting save returns a
   conflict instead of overwriting newer work.
2. `Publish` creates an idempotent job pinned to that exact revision. The local
   server dispatches `.github/workflows/content-publish.yml` with only the opaque
   job id and records the returned GitHub run id.
3. The workflow authenticates to the CI API and downloads only the job's pinned
   revision and referenced assets into `$RUNNER_TEMP/content-input`. It never
   interpolates the title or body into workflow YAML, shell source, step output,
   run name, or dispatch inputs.
4. Post metadata generation runs first and produces a validated Japanese
   candidate. Translation then consumes that finalized Japanese candidate.
   Works and About skip post-only metadata generation but use the same
   translation and validation boundary.
5. Generated text and thumbnails are validated against an exact output
   allowlist, checksummed, uploaded to staging through the CI API, and committed
   as a new immutable candidate revision. No Git commit or push occurs.
6. D1 creates a candidate release manifest by copying the active release and
   replacing, adding, hiding, restoring, or soft-deleting the selected item.
   Only `visibility = public AND deleted_at IS NULL` items enter the candidate.
7. The deployment job enters the repository-wide `cloudflare-deploy` GitHub
   concurrency group with `queue: max`, reconciles any interrupted prior
   deployment, downloads the candidate manifest and exact assets, builds,
   verifies, and performs one Pages Direct Upload.
8. The Pages deployment carries the release id as a deployment marker. After a
   successful upload, an idempotent finalize call atomically activates the
   release and updates the item's published revision. If that call is
   interrupted, the next deployment reconciles the Pages marker before it can
   build or deploy another snapshot.
9. If the editor saved a newer draft while publication was running, publication
   still activates the pinned candidate but does not move the current draft
   pointer backward. The newer draft remains available for the next publish.

## Repository and Workflow Boundaries

- Git contains code, Worker source, D1 migrations, prompts, metadata policy,
  translation rules, tests, workflows, and documentation only.
- Add a required root-level `workers/content-api/` directory because a
  separately deployable Worker, Wrangler configuration, migrations, and tests
  are repository source rather than temporary output.
- Refactor content loading to accept an explicit snapshot root. CI uses
  `$RUNNER_TEMP`; local public-site development uses a Git-ignored `.tmp/`
  snapshot populated by a sync command. Production and CI fail closed when the
  required snapshot is missing.
- Keep npm dependency caching, but do not place content under npm's cache path.
  Do not call `actions/cache` or `actions/upload-artifact` with any source,
  generated content, asset, snapshot, `dist/`, or Pagefind output.
- Give publication jobs `contents: read` and only the other minimum GitHub
  permissions they require. Remove `contents: write`, checkout credentials,
  direct-main commits, and `SECURITY_AUTOMATION_TOKEN` from content automation.
- Replace the current commit-producing `generate-metadata.yml` and
  `translate-content.yml` paths with the orchestrated content workflow.
- Change `deploy.yml` and `reading-refresh.yml` to download the active immutable
  release after they acquire the same queued deployment lock. This prevents a
  delayed code or reading build from redeploying a stale content snapshot.
- After the migration removal commit, add a CI and pre-commit guard that rejects
  reintroducing source or generated files under the former tracked
  content/thumbnail paths.
- Ensure workflow logs contain ids, checksums, byte counts, states, and sanitized
  failures only. Test failed parser and AI-provider paths because command errors
  can otherwise echo source text.

## Visibility and Deletion

- `private` means excluded from all candidate releases, static HTML, Pagefind,
  RSS, sitemap, and public assets. It does not mean application-encrypted.
- Delete sets `deleted_at`; restore clears it. Revisions and assets remain in the
  primary stores and remain available only through authenticated author routes.
- Publishing a visibility or deletion change creates and deploys a new release;
  a database flag alone is not enough because the public site is static.
- After the replacement release is confirmed as production, purge affected CDN
  paths and delete older Pages deployments whose manifests contained an item
  moved to private or deleted. D1/R2 history remains recoverable, while old
  Pages preview URLs no longer serve the item.
- An imported item remains obtainable from an old Git commit because history is
  intentionally preserved. The UI must state this when changing a formerly
  Git-public item from public to private.

## Backup and Recovery

- Rely on D1 Time Travel for minute-level recovery within the available plan
  window, but do not treat it as the only backup.
- Run a daily Cloudflare Workflow that exports D1 to the dedicated backup R2
  bucket and records the export bookmark and SHA-256.
- Copy newly referenced primary R2 assets to content-addressed backup keys and
  verify checksums. Never grant the editor or publication API delete permission
  on the backup bucket.
- Apply a time-bounded R2 bucket lock to backups before adding a lifecycle rule;
  the lock must outlast the documented recovery window and takes precedence
  over lifecycle deletion.
- Keep application-level revisions and primary assets immutable. Normal soft
  deletion only changes pointers/flags and cannot erase historical bytes.
- Add a documented restore procedure that restores into a non-production D1
  database and temporary R2 namespace first, validates row/object counts and
  checksums, then requires explicit approval before a production restore.
- Perform and record a restore drill before cutover and periodically afterward.
- Record the residual risk that D1 and the required backup are in the same
  Cloudflare account/provider. If account-level or provider-level disaster
  tolerance is required, add a second encrypted transport copy to a separately
  credentialed account or independent object-storage provider before declaring
  that stronger recovery objective met.

## Migration and Cutover Steps

1. Record an architecture decision that supersedes Git-backed authoring and the
   age/history-rewrite plan while preserving local Tailscale-only editor access
   and static public delivery.
2. Add the Worker project, production/preview Wrangler environments, D1
   migrations, typed API contracts, Access route policies, secret inventory,
   size limits, validation, rate limits, and sanitized observability.
3. Implement the D1 schema and repositories with local tests for transactions,
   expected-revision conflicts, idempotency, visibility, soft delete, releases,
   and job state transitions.
4. Implement private R2 asset upload/download through streaming Worker routes,
   content-addressed keys, MIME and signature validation, image-size limits,
   checksums, and revision ownership. Do not expose a public bucket URL.
5. Add the backup Workflow, bucket-lock/lifecycle configuration, checksum
   inventory, restore tooling, runbook, and a successful non-production restore
   drill.
6. Add 1Password-backed local secret references and startup checks for the
   editor Access service token and fine-grained GitHub dispatch token. Keep the
   literal values out of files, process arguments, browser responses, and logs.
7. Replace filesystem draft/list/read/save/history/asset operations behind the
   editor server with the authenticated API client. Preserve the current UI,
   Tailscale URL, autosave, preview, image picker/camera, and conflict feedback.
8. Refactor metadata and translation scripts to operate on an explicit isolated
   content root, accept database timestamps instead of `git log`, and emit a
   machine-readable allowlisted result bundle rather than changing the checkout.
9. Refactor the public content loader, asset copier, prerender, Pagefind, RSS,
   sitemap, and tests to build solely from a pinned snapshot root.
10. Add `content-publish.yml`, shared queued deployment control, publication
    state transitions, release markers, retry rules, and interrupted-deployment
    reconciliation. Remove all generated-content commits and pushes.
11. Update code-push and reading-refresh deployments to fetch the active release
    under the same deployment queue, and verify that their failure behavior
    continues to preserve the last successful production deployment.
12. Create a dry-run importer for every existing Blog post, Work, About/news
    document, body image, and generated thumbnail. Verify ids, slugs, locales,
    timestamps, metadata, bytes, and checksums before importing; rerunning must
    be idempotent.
13. Run a shadow build from the imported snapshot and compare routes, rendered
    body HTML, feeds, sitemap, Pagefind records, and asset checksums with the
    current production build. Resolve intentional differences explicitly.
14. Cut over editor persistence and all three deployment paths behind a rollback
    switch. Publish one test revision, one private draft, one visibility change,
    one soft delete/restore, and one interrupted/retried job.
15. After the imported release and backup restore have passed verification,
    remove the migrated source trees and generated item thumbnails from the
    current Git tip in one normal, reviewable commit. Confirm that the build and
    production deployment still use only the pinned D1/R2 snapshot. Do not amend
    or rewrite any earlier commit.
16. Enable the repository-content guard, update `.project/`, verification, and
    CI documentation, then observe successful editor saves, backups, Actions
    runs, and deployments before removing the rollback switch. Rollback uses a
    normal revert/new deployment rather than a history rewrite.

## Verification

- `python3 scripts/verify.py` passes with the new Worker, editor, site build, and
  workflow checks included in `.project/verification.toml`.
- Worker unit/integration tests cover authentication separation, malformed and
  oversized bodies, path traversal, unsupported media, SQL injection,
  conditional conflicts, idempotent retries, transaction rollback, stale jobs,
  and sanitized logging.
- A private or deleted item is absent from snapshot export, `dist/`, localized
  routes, thumbnails, RSS, sitemap, Pagefind, and current/old Pages deployments
  after cleanup, while remaining restorable in D1/R2.
- Browser developer tools confirm that Cloudflare/GitHub credentials and private
  source never reach the editor frontend.
- Git status and the commit produced by a full publish remain unchanged except
  for code/config changes made by a developer; no content path or generated
  thumbnail appears in Git.
- After cutover, the current Git tree contains none of the migrated Blog,
  Works, About/news source or item thumbnails, while old commits remain
  byte-for-byte unchanged and readable.
- The publication workflow receives an opaque job id only, stores all plaintext
  under `$RUNNER_TEMP`, uploads no content-bearing cache/artifact, and emits no
  known title/body test marker in logs.
- Metadata runs before translation, and the deployed English version is derived
  from the finalized Japanese candidate.
- Code-push and reading-refresh builds use the current active release and cannot
  overwrite production with an older release during concurrent jobs.
- A simulated Pages-success/finalize-failure is reconciled without duplicate AI
  work, a duplicate release, or a stale redeploy.
- Phone, tablet, and desktop editor save/preview/publish/image flows continue to
  work through the stable Tailscale bookmark.
- Lighthouse and existing bundle-size/performance checks show no material public
  regression because the public output remains static and editor/API code is
  absent from the public bundle.
- D1 Time Travel availability is confirmed, a daily export reaches the locked
  backup bucket, primary/backup asset checksums match, and a non-production
  restore drill reconstructs a complete release.

## Known Concerns

- GitHub-hosted runners and AI providers process the plaintext selected for
  publication. The design prevents intentional repository/artifact/cache/log
  retention, but cannot promise that infrastructure providers keep no internal
  operational telemetry. Do not submit unpublished private content to Publish.
- Cloudflare Access service tokens are long-lived bearer credentials. Separate
  author/CI tokens, path-specific policies, 1Password/GitHub Secrets storage,
  expiry alerts, rotation, and Worker-side identity checks limit the blast
  radius. Native workload federation would be preferable when supported.
- A static visibility change requires a successful rebuild and deployment. Until
  it completes, the previous production release remains visible by design.
- Cleaning old Pages deployments removes convenient point-in-time Pages
  rollback targets. Rollback must create a new deployment from a retained D1/R2
  release instead.
- Same-account R2 backup protects against application bugs and accidental data
  changes but not every account/provider catastrophe. The stronger option is an
  independently credentialed second copy.
- D1 is single-threaded per database and limited to 2 MB per row and 10 GB per
  paid database (500 MB free). Current content is far below these limits, and
  indexed, low-write personal-blog traffic is an appropriate fit; monitor size
  and query metrics nonetheless.

## Open Issues

- Choose the backup retention period and whether the initial launch requires a
  second account/provider copy. Recommended baseline: at least 30 days of locked
  daily exports plus D1 Time Travel; stronger disaster tolerance adds the second
  copy before cutover.
- Confirm the Cloudflare Workers plan used by production so the documented D1
  Time Travel window and database-size limit can be recorded accurately.
- Choose the exact 1Password items/fields for the new editor Access token and
  fine-grained GitHub Actions-dispatch token during implementation; do not reuse
  the previously discussed SSH private key entry.
- Define the maximum supported Markdown/TOML revision size after measuring all
  imported content, keeping a substantial margin below D1's 2 MB row limit.

## Research Basis

- Cloudflare storage selection: <https://developers.cloudflare.com/workers/platform/storage-options/>
- D1 limits: <https://developers.cloudflare.com/d1/platform/limits/>
- D1 transactions: <https://developers.cloudflare.com/d1/worker-api/d1-database/>
- D1 Time Travel and R2 export: <https://developers.cloudflare.com/d1/reference/time-travel/>
- Scheduled D1 backup example: <https://developers.cloudflare.com/workflows/examples/backup-d1/>
- R2 consistency and durability: <https://developers.cloudflare.com/r2/reference/consistency/> and <https://developers.cloudflare.com/r2/reference/durability/>
- R2 bucket locks: <https://developers.cloudflare.com/r2/buckets/bucket-locks/>
- Cloudflare Access service tokens: <https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/>
- GitHub workflow dispatch API: <https://docs.github.com/en/rest/actions/workflows>
- GitHub Actions secure use and runner isolation: <https://docs.github.com/en/actions/reference/security/secure-use>
- GitHub Actions deployment queuing: <https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency>
- Cloudflare Pages Direct Upload: <https://developers.cloudflare.com/pages/get-started/direct-upload/>
