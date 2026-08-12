# Private content and deletion in the editor

> Superseded by
> `2026-08-10-cloud-content-source-and-publish-pipeline.md`. Content will move
> out of Git, private content will not use application-level encryption, and
> normal deletion will use database soft-delete state. The destructive history
> rewrite described below is not part of the active implementation plan. The
> active plan removes migrated content from the current Git tip with a normal
> commit while deliberately preserving all past commits.

## Goal

Add public/private visibility and deletion to the local editor without exposing private source, images, or encryption keys through the public build or Git repository plaintext.

## Scope

- Add public/private visibility for Blog posts and Works.
- Encrypt each private item, including both locales and all images, as one age-compatible archive.
- Keep encrypted private items in a tracked directory excluded from the production build.
- Keep private drafts and local revision snapshots encrypted at rest.
- Decrypt only in the local editor server process and serve the result only through the existing authenticated Tailscale editor session.
- Add explicit conversion flows from public to private and private to public.
- Add two explicit deletion levels: removal from the current site/repository tip, and irreversible purge from managed local and remote history.
- Add a heavily guarded history-rewrite job that can be started from the local browser editor and runs outside the active checkout.
- Purge affected Cloudflare Pages deployments and CDN cache after a clean replacement deployment is serving.

## Non-goals

- Claiming that a Git history rewrite can remove copies from forks, clones, screenshots, caches, or third-party archives.
- Sending plaintext private content to a deployed site, CI, GitHub Actions, or any external service.
- Making About private or deletable; About remains the fixed landing content item.
- Storing the private identity, passphrase, or plaintext draft in the repository.
- Moving deleted content into `.trash`, retaining a deletion archive, or silently creating a backup as part of the purge workflow.

## Assumptions

- Use the official `age` CLI and interoperable age file format because the chosen identity is an existing SSH private key.
- Store only this secret reference in the ignored local `.op.env` file:
  `CONTENT_EDITOR_AGE_IDENTITY="op://Personal/um890-pro-ubuntu/private key?ssh-format=openssh"`.
- Start both editor commands through `op run --env-file=.op.env -- ...`, so the resolved OpenSSH private key exists only as an environment variable for the editor process.
- Pass the resolved identity to `age` over a dedicated inherited pipe, never through command-line arguments or a temporary key file. Pass archive plaintext/ciphertext over standard input and output.
- Use one encrypted archive per item under an opaque random filename so the kind, content id, filenames, Markdown, TOML, and images are encrypted together. Repository observers can still see the number, size, and change timing of ciphertext blobs.
- Public-to-private conversion removes the public source from the repository tip but does not erase older public commits unless the separate rewrite workflow is run.
- A browser-triggered rewrite removes the selected paths from writable Git branches and tags. GitHub pull-request refs are read-only and require GitHub Support to dereference and garbage-collect; forks, clones, caches, screenshots, and third-party archives cannot be guaranteed erased.
- A successful remote history rewrite invalidates the active checkout. The editor stops the job after producing recovery/reclone instructions instead of continuing to publish from stale history.
- The temporary mirror is a short-lived processing workspace, not a retained backup: create it with owner-only permissions, rewrite it in place, and remove it after completion or failure. Do not create bundles, archives, tags, backup branches, `refs/original`, or rollback copies of the pre-purge history.
- The purge is not complete locally while any old clone, reflog, stash, draft/history directory, generated site, Lighthouse report, or browser-downloaded copy under the user's control still contains the item. The job removes repository-owned local copies and reports copies it cannot control.
- The current uncommitted About-editor work remains part of the same feature delivery unless the user requests separate pull requests.

## Deletion Surfaces

- Public source and entry-local images: `src/content/posts/<id>/` or `src/content/works/<id>/`.
- Generated public thumbnail: every matching `public/thumbnails/<id>.*` file.
- Local authoring state: `.drafts/<kind>/<id>/` and `.drafts/.history/<kind>/<id>/`.
- Private state: the item's opaque `.age` blob and its encrypted index entry.
- Local generated copies: rebuild or remove `dist/`, and remove repository-owned reports/caches that contain the route or source. `editor/dist/` is code-only and is verified not to embed content.
- Git object data: matching paths in every branch, tag, stash, reflog, and other writable ref, plus the title, id, slug, route, and other item-specific strings in commit and tag messages.
- GitHub-managed data: rewritten branches/tags, affected Actions runs/logs, pull-request refs, cached commit views, and any issue/PR/comment text discovered by the preflight inventory.
- Cloudflare-managed data: the current production deployment, every older Pages deployment that contains the item, its unique preview URL, rendered routes, localized routes, content assets, thumbnails, RSS, sitemap, Pagefind records, and CDN cache entries.

## Steps

1. Add an official `age` CLI encryption service with strict archive-path validation, bounded payload sizes, atomic writes, dedicated-pipe identity handling, and key/buffer zeroing where practical.
2. Write the ignored local `.op.env` secret-reference configuration, route `npm run editor` and its development variant through `op run`, and add prerequisite checks for 1Password CLI access, the secret reference, the SSH key format, and the installed `age` CLI.
3. Add encrypted private source and draft stores that are never consumed by Vite, prerendering, Pagefind, RSS, or deployment.
4. Extend list/read/save/history/assets so private content is decrypted only in memory inside authenticated editor API requests.
5. Add visibility controls and clear confirmation dialogs for public/private conversion, including the warning that past public Git history is unchanged.
6. Extend publication so public items stage public source, private items stage only encrypted blobs, and visibility conversion stages both sides atomically.
7. Add current-state deletion that removes the selected source, entry-local assets, matching public thumbnail, local draft/history, and private blob/index entry directly. Do not use `.trash`; publish with a neutral commit message that does not repeat the title or body.
8. Build and verify a clean site, push the current-state deletion, and wait for a successful clean Cloudflare Pages production deployment before purging any old history. This keeps the public hostname available while replacing the deleted route, assets, RSS, sitemap, and search records.
9. Add a browser-triggered background purge job with a full deletion manifest, two-stage typed confirmation, clean working-tree/no-local-only-ref checks, unchanged-remote checks, and a fresh owner-only temporary mirror clone.
10. In that mirror, run `git-filter-repo --sensitive-data-removal --invert-paths` over every historical source/asset/thumbnail path and `--replace-message` over verified item-specific strings. Verify paths, strings, old blob ids, and first-changed commits are unreachable, then force-push rewritten writable branches and tags.
11. Delete affected GitHub Actions runs/logs through the GitHub API. Inventory issue, pull-request, and comment text for explicit review; do not silently delete unrelated discussions. Report rejected/read-only `refs/pull/*`, first changed commits, fork checks, and a ready-to-submit GitHub Support request for PR dereferencing and cached-view garbage collection.
12. Wait until the clean Pages deployment is confirmed as production, then delete every older Cloudflare Pages deployment identified as containing the item. Purge the affected custom-domain paths/hostname from Cloudflare's CDN and verify the production, localized, asset, thumbnail, RSS, sitemap, search, and former deployment URLs no longer return the content.
13. Remove the temporary mirror without retaining a bundle/archive and remove repository-owned local drafts, history, generated builds, reports, reflogs, stashes, and old Git objects. Keep the editor locked until the active checkout is either freshly cloned or explicitly sanitized and the old clone is removed.
14. Add unit, API, component, integration, archive-tampering, wrong-key, size-limit, path-traversal, public-build leakage, rewrite dry-run, remote-race, deployment-cleanup, local-copy, and confirmation-gate tests.
15. Run full verification and browser checks at phone, tablet, and desktop widths before publishing the implementation PR.

## Verification

- Ciphertext contains none of the known plaintext title, body, filenames, or image bytes.
- A wrong identity cannot list, preview, download, edit, or publish private content.
- Archive traversal, oversized input, malformed ciphertext, and partial writes fail closed.
- Production build, RSS, search, sitemap, and prerender output contain no private content or private assets.
- Public/private conversion preserves both locales and image bytes.
- Normal deletion removes the item from the site and repository tip.
- History-rewrite dry-run identifies all affected refs and never mutates the active checkout.
- History rewrite refuses dirty state, a changed remote, ambiguous paths, failed verification, or an unconfirmed destructive step.
- Commit/tag messages contain none of the verified item-specific title, id, slug, route, or supplied sensitive strings after rewriting.
- A clean replacement Pages deployment is serving before old deployments are removed; all identified content-bearing deployments and caches are then deleted and checked.
- No `.trash`, backup ref, Git bundle, deletion archive, plaintext crypto temp file, or retained temporary mirror is created.
- Successful branch/tag rewriting leaves the active editor locked until the old local Git object database has been removed or sanitized, and emits exact GitHub Support follow-up instructions.
- `python3 scripts/verify.py` passes.

## Accepted Constraints

- 1Password is the private identity store, using `Personal/um890-pro-ubuntu/private key` through the local environment-file secret reference above.
- The local browser editor may start the guarded destructive history-rewrite job.
- Rewriting and force-pushing can remove the content from normal Git branches and tags, but GitHub-owned pull-request refs require GitHub Support. GitHub documents that Support may decline cleanup for non-sensitive content, and no workflow can erase independent clones or third-party copies.
