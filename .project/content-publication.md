# Database content publication

## Build boundary

Git remains the source for application code, prompts, metadata policy, and
theme configuration. D1 revisions and R2 assets are materialized into an
isolated tree only when `CONTENT_SNAPSHOT_ROOT` names an existing absolute
directory. That tree mirrors the managed parts of the repository:

```text
src/content/posts/
src/content/works/
src/content/about/
public/thumbnails/
public/content-assets/
```

Nothing reads content from the repository: `contentSnapshotRoot()` requires
`CONTENT_SNAPSHOT_ROOT` and throws without it, so a build cannot silently ship
whatever happens to be on disk. Workflows point it at a release they
downloaded, `npm run content:pull` writes one for local work, and the unit and
component suites use `tests/fixtures/content/` so they stay hermetic. GitHub
workflows never put the snapshot, `dist/`, or Pagefind output in an Actions
artifact or content cache.

## Worker API contract

The CI client authenticates with a dedicated Cloudflare Access service token.
The Worker must provide these idempotent routes:

- `POST /v1/ci/jobs/:jobId/running`
- `GET /v1/ci/jobs/:jobId/snapshot`
- `GET|PUT /v1/ci/assets/:sha256`
- `POST /v1/ci/jobs/:jobId/candidate`
- `POST /v1/ci/jobs/:jobId/deploying`
- `POST /v1/ci/jobs/:jobId/finalize`
- `POST /v1/ci/jobs/:jobId/fail`
- `GET /v1/ci/releases/active/snapshot`
- `GET /v1/ci/releases/:releaseId/snapshot`
- `GET /v1/ci/releases/pending`
- `POST /v1/ci/releases/reconcile`

A batch job snapshot has
`{ job, items: [{ item, revision, assets, translationEnabled }] }`.
Legacy single-item jobs retain `{ job, item, revision, assets }`. A release snapshot has
`{ release, items: [{ item, revision, assets }] }`. Each asset descriptor has
`id`, `mediaType`, `sizeBytes`, `logicalPath`, and `role`; bytes are downloaded
separately and accepted only when both the declared size and SHA-256 match.
Logical paths must be relative, traversal-free output paths.

The editor reads the complete pending set from
`GET /v1/author/publication/preflight` and creates one pinned job with
`POST /v1/author/publication`. Public additions and updates carry an exact
per-item translation preference; omission by an older client means enabled.
The preference is stored on the pinned job item, and the editor's canonical
idempotency key includes it. The intent checksum rejects a stale preflight.
Pending public revisions are additions or updates; private/deleted items are
included only when the active release still contains them. Existing
`POST /v1/author/content/:kind/:id/publish` jobs remain supported for rollout
and retry compatibility. Status is read with `GET /v1/author/publish/:jobId`.
GitHub receives only the opaque `job_id` as workflow input.

## Workflow order

`.github/workflows/content-publish.yml` acquires the shared
`cloudflare-deploy` queue, reconciles an interrupted deployment, downloads the
pinned batch, prepares each English source, translates only enabled items before
post metadata generation, validates an exact changed-file allowlist, uploads a
candidate revision, then downloads and verifies the immutable candidate release
before deploying it. The Pages commit message carries
`content-release:<release-id>` so a later run can reconcile a successful upload
whose finalize call was interrupted.

Translation-enabled targets are listed explicitly in runner-temporary snapshot
metadata. Claude Code is primary. If its process exits unsuccessfully,
`scripts/translate_with_openai.mjs` makes one bounded Responses API request to
`gpt-5.6-terra` with low reasoning effort. The fallback receives only the
translation rules and the allowlisted Japanese sources, returns a strict list
of complete English targets, and has no file or tool access. Both providers
pass through the same exact checksum allowlist before publication continues.

When translation is disabled, preparation copies the Japanese source into the
English slot without invoking either translation provider. Blog metadata is
resolved only from the Japanese file and the completed file is copied again so
the two slots remain identical. Candidate revision metadata records the
Japanese-source fallback. A generated `src/content/publication.json` in each
materialized snapshot carries that marker into the site build; the English Blog
article view shows a small muted availability note above the title.

The editor's publish check therefore asks for Japanese prose and accepts English
that is still empty. It does ask both locales for structure — a News date is not
prose and no translation supplies one.

`deploy.yml` and `reading-refresh.yml` acquire the same queue and always
download the active release before building. `ci.yml` downloads it too, without
the queue, because it verifies rather than deploys.

Workflow logs may contain ids, states, checksums, counts, and sanitized errors.
Provider and deployment command output is kept in runner-temporary files and is
not printed or uploaded because failures can include source text or private
service URLs.

## Cloudflare configuration

The `popyson-content-api` Worker serves `content-api.popyson.com` as a custom
domain and has no `workers.dev` route. Two path-scoped Cloudflare Access
applications protect it, one per role:

- `content-api.popyson.com/v1/author` admits only the `popyson-content-author`
  service token.
- `content-api.popyson.com/v1/ci` admits only the `popyson-content-ci` service
  token.

Each application holds a single Service Auth policy, returns 401 instead of a
login redirect, and issues its own audience tag.
`workers/content-api/wrangler.jsonc` carries the team domain, both audience
tags, and both service token client ids. The Worker rejects any request whose
assertion audience or `common_name` does not match the role of the requested
path, so a token that is valid for one application cannot reach the other.

`GET /health` sits outside both applications and returns only `{"ok":true}`.

Client secrets never enter the repository. The author secret is stored in
1Password and reaches the editor through `op run`; the CI secret is stored in
both GitHub Actions and Dependabot secrets under the same name.

## GitHub configuration

Set these repository variables:

- `CONTENT_API_URL`
- `CLOUDFLARE_PAGES_PROJECT`

Set these GitHub Actions repository secrets:

- `CONTENT_CI_ACCESS_CLIENT_ID`
- `CONTENT_CI_ACCESS_CLIENT_SECRET`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `GEMINI_API_KEY`
- `OPENAI_API_KEY` (metadata, thumbnail generation, and translation fallback)
- `CLAUDE_CODE_OAUTH_TOKEN` (primary translation provider)

Set these repository Dependabot secrets to the same values as their GitHub
Actions counterparts so Dependabot pull requests can download the active
release during CI:

- `CONTENT_CI_ACCESS_CLIENT_ID`
- `CONTENT_CI_ACCESS_CLIENT_SECRET`

The CI Access token is distinct from the editor token. No content workflow
needs `contents: write` or the repository administration token.
