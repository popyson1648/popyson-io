# Plan

## Goal

Host the existing editor on Cloudflare so the owner can edit and publish from a
browser without a running personal computer, Tailscale, or 1Password CLI.

## Scope

An isolated Worker serving the editor assets and same-origin editor API, protected
by Cloudflare Access. Preserve the existing D1/R2 content API, immutable revisions,
optimistic concurrency, publication jobs, and GitHub Actions deployment pipeline.
Use the explicitly requested worktree `/workspace/popyson-io-cloudflare-editor`
on branch `codex/cloudflare-editor`.

## Non-goals

Changing public-site delivery, content migration, rewriting the editor UI, or
exposing D1/R2 credentials in the browser. Do not deploy a partially migrated API.

## Assumptions

- Confirmed hostname: `editor.popyson.com`.
- Confirmed owner identity: `setoshun00424@gmail.com`.
- Access allows exactly the owner's identity; use MFA at the identity provider.
- Worker static assets and APIs share one origin. All paths execute the Worker
  first, including scripts, preview documents, images, and unknown API paths.
- Existing author API service credentials remain server-side. GitHub credentials
  need only the permissions used for publication dispatch/progress.
- Local editor operation remains available during migration and rollback.

## Steps

1. Access and hosting foundation (initial implementation in this worktree):
   - Verify signed Access JWT issuer, audience, expiry, and owner email.
   - Reject alternate origins and cross-origin mutations; protect static assets.
   - Disable workers.dev and preview URLs; leave deployment identity unset.
   - Add cryptographic authorization tests, type checking, and bundle checks.
2. Extract a runtime-neutral editor API from `scripts/editorApiPlugin.mjs`:
   - Share content conversion, validation, revision/state/history, asset upload,
     thumbnail regeneration, publication preflight, dispatch, and job progress.
   - Keep Node/Vite adapters for local use; implement Fetch Request/Response
     adapters with bounded request-body parsing and consistent error handling.
   - Inventory transitive Node/filesystem dependencies in Markdown rendering and
     content models. Validate Shiki/WASM and bundle/CPU limits on Workers before
     deciding whether preview rendering needs a browser-side implementation.
3. Connect the Worker API and private assets:
   - Configure upstream author client and GitHub client from Worker bindings.
   - Proxy content images with existing authorization and media/size validation.
   - Preserve same-origin checks, conflict handling, and idempotent publication.
   - Build the hosted editor using an appropriate published content snapshot;
     never use test fixtures as production content or embed private source/secrets.
4. Exercise end-to-end behavior locally against isolated data/stub upstreams:
   - List/read/create/edit/autosave, locales, previews, upload, history restore,
     visibility/delete/restore, translation settings, and publication progress.
   - Test denied access, stale revisions, upstream failures, and retry behavior.
   - Verify mobile/desktop rendering and unchanged local editor behavior.
5. Prepare deployment for review:
   - Confirm hostname and owner identity; configure Access application/policy,
     audience, issuer, MFA, required secrets, and least-privilege credentials.
   - Add deployment workflow and document setup/rotation/rollback procedures.
   - Deploy only the complete reviewed implementation; smoke-test through real
     Access with an isolated draft before any real publication.

## Verification

Run `python3 scripts/verify.py --mode standard` using this worktree's fixture
snapshot. Standard verification includes the new JWT tests, Worker typecheck,
and Wrangler dry-run after editor_build. No cloud credentials are needed.
Production readiness additionally requires the authenticated browser and API
checks in steps 4–5; passing the first milestone does not establish that.

Implementation status as of 2026-11-01:
- Steps 1–3 implemented: pure schemas/templates and shared Fetch API, retained
  Node adapter, authenticated Worker APIs, private images, bounded JSON parsing,
  and hosted Markdown renderer using Shiki's JS engine.
- Step 4 local verification completed: real workerd + D1/R2 tests cover editing,
  conflicts/history, images, state/translation, About, preview, and publication
  jobs. GitHub dispatch is stubbed, never sent to the real service.
- Actual Chromium sessions at 1440×1000 and 390×844 rendered the bundled Worker
  editor and autosaved title changes into local D1. No browser JavaScript errors
  were observed. Test harness injects a signed test identity; real Access login
  remains a deployment prerequisite.
- Step 5 prepared: manual workflow (dry-run by default), validated configuration
  generator, secure setup, rotation, and rollback documentation. Deployment not
  performed. Hostname and owner identity were confirmed on 2026-11-01.

Final local validation:
- `python3 scripts/verify.py --mode standard`: all phases passed, 602 tests.
- Deployment workflow passed actionlint; the generated protected custom-domain
  config passed a Wrangler dry-run with nonproduction settings.
- Bundle: approximately 309 KiB compressed. No production deployment performed.

The user supplied the editor Application Audience tag on 2026-11-01. It is
stored in the Worker configuration and used by the deployment generator. The
Access application ID is `d466bc1d-efb7-4cf8-b7e3-9c35ce1c9264` in account
`e4cad72de68b5d765bb6fb575926bb43`, as shown by the user's dashboard URL. The
user configured an owner-only policy and authenticator-app MFA; live enforcement
is not independently verified. The user's Access settings screenshot confirms the team domain
`https://setoshun00424.cloudflareaccess.com` in this account. Both are now pinned
in the Worker configuration to avoid accidental deployment to the other account.

## Open Issues

The production hostname and owner email are confirmed. Configure the Access application,
author service secrets, GitHub Actions credential, and Cloudflare
deploy credentials. Then validate real login and isolated draft operations before
any intended publication. Hosted preview uses a bounded language set (other
languages fall back to plain text); production CPU/plan limits need measurement.
