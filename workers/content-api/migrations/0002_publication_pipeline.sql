ALTER TABLE publish_jobs ADD COLUMN expected_revision_id TEXT REFERENCES content_revisions(id) ON DELETE RESTRICT;
ALTER TABLE publish_jobs ADD COLUMN target_visibility TEXT CHECK (target_visibility IN ('public', 'private'));
ALTER TABLE publish_jobs ADD COLUMN target_deleted_at TEXT;
ALTER TABLE publish_jobs ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0);
ALTER TABLE publish_jobs ADD COLUMN candidate_revision_id TEXT REFERENCES content_revisions(id) ON DELETE RESTRICT;
ALTER TABLE publish_jobs ADD COLUMN candidate_checksum TEXT;
ALTER TABLE publish_jobs ADD COLUMN release_id TEXT REFERENCES releases(id) ON DELETE RESTRICT;

ALTER TABLE releases ADD COLUMN publish_job_id TEXT REFERENCES publish_jobs(id) ON DELETE RESTRICT;
ALTER TABLE releases ADD COLUMN base_release_id TEXT REFERENCES releases(id) ON DELETE RESTRICT;

CREATE INDEX releases_publish_job
  ON releases (publish_job_id, created_at DESC) WHERE publish_job_id IS NOT NULL;
CREATE INDEX releases_pending
  ON releases (state, created_at);

UPDATE publish_jobs
   SET expected_revision_id = revision_id,
       target_visibility = (
         SELECT visibility FROM content_items WHERE content_items.id = publish_jobs.item_id
       ),
       target_deleted_at = (
         SELECT deleted_at FROM content_items WHERE content_items.id = publish_jobs.item_id
       )
 WHERE expected_revision_id IS NULL;
