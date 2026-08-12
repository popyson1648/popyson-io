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

The repository-backed content tree remains the local development default until
the production cutover. GitHub workflows set the snapshot root explicitly and
never put it, `dist/`, or Pagefind output in an Actions artifact or content
cache.

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

A job snapshot has `{ job, item, revision, assets }`. A release snapshot has
`{ release, items: [{ item, revision, assets }] }`. Each asset descriptor has
`id`, `mediaType`, `sizeBytes`, `logicalPath`, and `role`; bytes are downloaded
separately and accepted only when both the declared size and SHA-256 match.
Logical paths must be relative, traversal-free output paths.

The author API creates a pinned job with
`POST /v1/author/content/:kind/:id/publish` and reads status with
`GET /v1/author/publish/:jobId`. GitHub receives only the opaque `job_id` as a
workflow input.

## Workflow order

`.github/workflows/content-publish.yml` acquires the shared
`cloudflare-deploy` queue, reconciles an interrupted deployment, downloads the
pinned job, runs post metadata generation before translation, validates an
exact changed-file allowlist, uploads a candidate revision, then downloads and
verifies the immutable candidate release before deploying it. The Pages commit
message carries `content-release:<release-id>` so a later run can reconcile a
successful upload whose finalize call was interrupted.

`deploy.yml` and `reading-refresh.yml` acquire the same queue and download the
active release before building when the `CONTENT_CLOUD_CUTOVER` repository
variable is `1`. Before that switch, they deliberately use the checked-in
content fallback.

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
GitHub Actions secrets.

## GitHub configuration

Set these repository variables:

- `CONTENT_API_URL`
- `CONTENT_CLOUD_CUTOVER` (`1` only after the active release is verified)
- `CLOUDFLARE_PAGES_PROJECT`

Set these repository secrets:

- `CONTENT_CI_ACCESS_CLIENT_ID`
- `CONTENT_CI_ACCESS_CLIENT_SECRET`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `CLAUDE_CODE_OAUTH_TOKEN`

The CI Access token is distinct from the editor token. No content workflow
needs `contents: write` or the repository administration token.

