# Plan

## Goal

Replace the editor's per-content publication workflow with one global action that publishes every saved, unpublished change across posts, Works, and About in a single pinned job and a single Cloudflare Pages deployment.

## Scope

- Add a global editor publication status and action that spans every content kind.
- Detect the exact set of saved changes relative to the active release, including new or updated public content and content made private or deleted.
- Pin all affected item revisions and publication states into one immutable publication job.
- Validate, translate, build, deploy, and activate the complete batch atomically.
- Show a reviewable preflight list and one combined progress result in the editor.
- Preserve safe retries, idempotency, release reconciliation, and compatibility for already-created single-item jobs.
- Update the Content API schema, clients, editor server and UI, workflow, tests, and project documentation together.

## Non-goals

- Publishing unsaved browser state or incomplete editor forms.
- Publishing private drafts that have never appeared in the active release.
- Removing revision history or changing the existing save, delete, restore, and visibility semantics.
- Scheduling publication, selecting only some pending items, or adding multi-author approval.
- Purging copies already retained by Git history, search engines, or third-party caches.

## Assumptions

- The active release is the source of truth for what the public site currently serves.
- A public, non-deleted item is pending when its current revision differs from the revision in the active release or it is absent from that release.
- A private or deleted item is pending only when it is still present in the active release.
- Opening the global publication dialog saves the currently edited item first; changes in other items must already have been saved by editor autosave or an explicit save.
- The batch is frozen when the job is created. Later saves belong to the next batch and cannot silently change the running deployment.
- Existing item-specific API jobs may finish after deployment of this change, so the migration and CI endpoints must continue to read them safely.

## Steps

1. Record the batch-publication design decision.
2. Normalize publication-job storage with a D1 migration and legacy-job backfill.
3. Add global preflight and transactional batch-publication endpoints.
4. Make snapshots, candidate creation, verification, and finalization batch-aware.
5. Add the global editor action, grouped confirmation, and combined progress UI.
6. Update documentation and operational guidance.
7. Perform a final regression and maintainability review.

## Verification

- Cover pending detection, immutable batch creation, stale conflicts, atomic activation, retries, and legacy jobs in Worker tests.
- Cover global preflight, one dispatch, no-change behavior, and sanitized progress in editor server/model tests.
- Cover the global action, grouped review, invalid navigation, progress, and removal of per-item publication controls in React tests.
- Cover batch workflow iteration, deletion-only batches, allowlist enforcement, and one Pages deployment.
- Run `python3 scripts/verify.py` and the commands required by `.project/verification.toml`.
- Build the public site and editor from a representative fixture batch.
- Verify desktop and narrow editor layouts, keyboard focus, and progress/error states locally.

## Open Issues

- Choose the narrow-screen label during implementation without changing behavior.
- Production rollout must apply the D1 migration before deploying the Content API and editor changes. No production migration is part of local verification without separate approval.
