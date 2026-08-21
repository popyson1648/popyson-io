# Optional Translation During Publication

## Goal

Allow an editor user to decide, for each public content item in a batch publication, whether the Japanese source should be translated into English. Translation is enabled by default.

## Scope

- Add a per-item translation checkbox to the batch publication confirmation dialog for public additions and updates.
- Default every eligible checkbox to enabled whenever the dialog is opened.
- Send the selected translation policy through the local editor proxy to the Content API.
- Persist the policy on each pinned publication job item so retries and resumed runs keep the original selection.
- Translate only enabled items in GitHub Actions.
- For disabled items, copy the Japanese source into the English source slot before validation and metadata generation.
- Mark disabled Blog posts in the published data and show a restrained English-only availability note immediately above the article title when the English locale is active.
- Keep the translation allowlist and boundary checks exact for mixed batches.
- Add or update tests, the publication decision record, and current project documentation.

## Non-goals

- Removing an item from the English locale or hiding its English route.
- Adding notices to Blog lists, Japanese pages, Works, or About.
- Changing the site's current requirement that every published item has Japanese and English source slots.
- Persisting a permanent per-content translation preference outside a publication job.
- Changing how drafts, private transitions, or deletions are published.

## Assumptions

- The selection belongs to the publication attempt, not to the content revision. Reopening the confirmation dialog starts again with translation enabled.
- The checkbox is shown only for public additions and public updates that have source content to process.
- When translation is disabled, the English locale intentionally displays the Japanese source. This avoids an AI translation call while preserving the existing bilingual build contract.
- The notice copy is `This page is only available in Japanese.` and uses existing article typography and color tokens without a new decorative treatment.
- Older clients and jobs that omit the new setting continue to translate by default.
- The existing publication intent checksum continues to protect content state; the idempotency key additionally includes the canonical per-item translation selection.

## Steps

1. Extend the editor publication dialog and API client with per-item translation state, default-on behavior, and an accessible checkbox for every eligible item.
2. Extend the editor proxy and Content API request contract to validate a canonical translation selection, include it in idempotency, and store it on `publish_job_items` through a D1 migration.
3. Include the pinned policy in publication job snapshots while keeping GitHub workflow dispatch limited to the opaque job identifier.
4. Add deterministic snapshot preparation that copies Japanese source to the English slot for disabled items and emits an exact allowlist for enabled translation targets.
5. Update the publication workflow and OpenAI fallback so zero-target runs skip translation and mixed batches translate only enabled items; restrict translation boundary validation to the exact allowlist.
6. Carry the untranslated marker into Blog data and render the English-only availability note above the article title using existing design tokens.
7. Cover default, disabled, mixed-batch, retry, validation, workflow, progress, and localized notice behavior with tests; record the design decision and update the concise project documentation.
8. Run targeted checks, the production build, and the repository verification command, then perform a final diff and behavior review.

## Verification

- Run the editor component tests for default-on controls and submitted selections.
- Run editor proxy/client tests for request validation, canonical idempotency, and opaque workflow dispatch.
- Run Content API tests against the migration for default-on storage, pinned selections, invalid IDs, and job snapshots.
- Run snapshot, translation fallback, workflow policy, and publication progress tests for all-on, all-off, and mixed batches.
- Run a production build to confirm copied Japanese content remains valid in both locale slots.
- Verify the availability note appears only on the English route for an untranslated Blog post, precedes its title, and reuses existing typography and muted color tokens at desktop and mobile sizes.
- Run `python3 scripts/verify.py` as required by the repository workflow.
- Review the final diff for schema compatibility, retry behavior, secret exposure, and unrelated changes.

## Open Issues

- None. The owner approved the Japanese-source fallback and requested the English-only Blog article notice on 2026-08-21.
