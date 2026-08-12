# Database content backup and restore

## Backup boundary

`workers/content-backup/` is a scheduled Cloudflare Workflow with no public
application route. It reads the D1 asset inventory, verifies every primary R2
object against its recorded size and SHA-256, and copies missing objects to the
private backup bucket. It then starts a D1 SQL export through the control-plane
API, streams the dump to the same bucket, and writes a checksum manifest.

The Workflow receives a dedicated `D1_REST_API_TOKEN` secret that can export
only the content database. The content API, local editor, and GitHub Actions do
not receive this token. Workflow steps mark the D1 bookmark and signed download
URL as sensitive output and never log content, object keys, internal hostnames,
or credentials.

Backup keys under `d1/` and `assets/` have a 35-day R2 bucket lock. The lock
prevents deletion and overwriting during the retention window and takes
precedence over any future lifecycle rule.

## Deployment

Create a Cloudflare API token that can export only the production D1 database,
then set it without placing the value in shell history or a tracked file:

```sh
cd workers/content-backup
npx wrangler secret put D1_REST_API_TOKEN
npx wrangler deploy
```

The schedule runs once per day. Confirm the first instance is complete and that
both its SQL object and JSON checksum manifest exist before relying on the
schedule.

## Restore procedure

Never restore directly into the production D1 database. Download one SQL object
and its adjacent `.json` manifest into an ignored `.tmp/` directory, create an
empty database whose name includes `-restore-`, and run the restore guard:

```sh
node scripts/restore_content_backup.mjs \
  --database <non-production-restore-database> \
  --sql <absolute-path-to-backup.sql> \
  --manifest <absolute-path-to-backup.sql.json>
```

The default mode verifies byte length and SHA-256 without changing a database.
Add `--execute` to import, and add `--source <source-database>` to compare only
aggregate row and byte fingerprints after the import. The script rejects the
production database name, rejects targets without `-restore-`, checks orphaned
references, and suppresses Wrangler failure details that could contain source
text.

A production restore is a separate destructive operation. It requires an
explicitly reviewed incident plan, a current Time Travel bookmark, and user
approval; this repository does not automate that step. The non-production drill
database is retained for audit and must not receive Worker routes, Access
service credentials, or editor traffic.

## Recorded restore drill

On 2026-08-12, the production D1 export was uploaded to the locked private
backup bucket, downloaded again, and verified byte-for-byte by size and
SHA-256. The dump was imported into a new non-production restore database.
Source and restore fingerprints matched for six content items, six revisions,
four asset records, and four revision attachments, and the reference checks
found no orphaned rows. All four primary R2 assets were also copied to the
locked backup prefix and verified against their D1 SHA-256 values.

This drill proves the current export and non-production import path. The daily
Workflow still needs its least-privilege secret and first successful scheduled
run before automated backup operation is considered complete.
