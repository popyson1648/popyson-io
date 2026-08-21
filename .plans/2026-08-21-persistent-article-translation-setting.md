# Persistent Article Translation Setting

## Goal

Move the English translation choice from the batch publication dialog to each
Blog article's gear-based publication settings, and persist the choice with the
article. Translation remains enabled by default.

## Scope

- Add an `英語に翻訳する` checkbox to the existing gear → publication settings
  panel for Blog articles.
- Store the preference on the D1 content item, independently of article revision
  history, with a default of enabled.
- Store the preference on release items and pin it on publication job items so
  active releases, retries, and resumed workflows remain deterministic.
- Treat a preference-only change as a pending Blog update even when the current
  source revision is unchanged.
- Remove editable translation controls from the batch publication dialog and
  use the saved article setting when the publication job is created.
- Keep the Japanese-source fallback, generated publication manifest, and
  English-only availability note introduced by PR #174.
- Add a D1 migration with compatibility backfill, update tests, supersede the
  previous per-publication decision, and update current project documentation.

## Non-goals

- Adding translation controls to Works or About; they continue to translate.
- Hiding Japanese-only articles from English routes.
- Changing translation providers or metadata generation behavior.
- Automatically changing the setting when an article revision is restored.
- Publishing or otherwise changing the currently pending article.

## Assumptions

- "Article" means a Blog `post`; the control is not shown for Works or About.
- The setting is an article property, so it survives normal saves and revision
  restoration.
- Changing the setting uses the existing optimistic state-update API. Unsaved
  article text is saved first, matching the existing visibility control.
- New and existing articles default to translation enabled. Migration backfill
  preserves an existing Japanese-source marker as disabled when one exists.
- The batch publication dialog may show the saved state as read-only context,
  but cannot override it.

## Steps

1. Add item- and release-level translation columns with default-on constraints
   and backfill Japanese-source state from existing revision metadata.
2. Expose and validate the item setting through Content API item JSON and the
   optimistic PATCH state endpoint, allowing changes only for Blog posts.
3. Include item and active-release settings in pending publication comparison
   and intent checksums; pin the item setting directly into each job item.
4. Carry the setting through candidate release manifests and release snapshots
   so code deploys and resumed publication runs preserve the active state.
5. Add the checkbox to the gear publication settings, remove the batch-dialog
   checkbox and request payload, and render the saved setting read-only in the
   publication summary.
6. Replace the previous per-publication decision with a superseding decision
   record and update the concise project documentation.
7. Verify default-on, toggle persistence, preference-only publication, history
   independence, mixed release state, exact translation targeting, and the
   English-only notice with unit, Worker, integration, and component tests.
8. Run `python3 scripts/verify.py` against a production snapshot, review the
   final diff, then create a PR. After merge approval, apply the D1 migration
   before deploying the Content API Worker.

## Verification

- Verify the Blog gear panel exposes an accessible, default-on checkbox and
  Works/About do not.
- Verify toggling the checkbox persists through reload and article revision
  restoration.
- Verify the batch publication dialog has no editable translation checkbox and
  submits no translation override.
- Verify a setting-only change appears as a pending update and is pinned in the
  immutable job snapshot.
- Verify active release snapshots retain the setting across unrelated content
  publications and code-only site deployments.
- Verify enabled, disabled, and mixed publication batches select the exact
  translation targets and all-disabled batches skip both providers.
- Verify an untranslated Blog post shows the availability note only in English.
- Run the repository standard verification with the current production content
  snapshot and confirm all GitHub checks before merge.

## Open Issues

- None. The owner approved this corrected plan on 2026-08-21.
