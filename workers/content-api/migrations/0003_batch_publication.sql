CREATE TABLE publish_job_items (
  job_id TEXT NOT NULL REFERENCES publish_jobs(id) ON DELETE RESTRICT,
  item_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE RESTRICT,
  revision_id TEXT NOT NULL REFERENCES content_revisions(id) ON DELETE RESTRICT,
  expected_revision_id TEXT NOT NULL REFERENCES content_revisions(id) ON DELETE RESTRICT,
  target_visibility TEXT NOT NULL CHECK (target_visibility IN ('public', 'private')),
  target_deleted_at TEXT,
  candidate_revision_id TEXT REFERENCES content_revisions(id) ON DELETE RESTRICT,
  candidate_checksum TEXT,
  PRIMARY KEY (job_id, item_id)
);

ALTER TABLE publish_jobs ADD COLUMN expected_base_release_id TEXT REFERENCES releases(id) ON DELETE RESTRICT;
ALTER TABLE publish_jobs ADD COLUMN batch_mode INTEGER NOT NULL DEFAULT 0 CHECK (batch_mode IN (0, 1));

INSERT INTO publish_job_items
  (job_id, item_id, revision_id, expected_revision_id, target_visibility,
   target_deleted_at, candidate_revision_id, candidate_checksum)
SELECT id, item_id, revision_id, COALESCE(expected_revision_id, revision_id),
       target_visibility, target_deleted_at, candidate_revision_id, candidate_checksum
  FROM publish_jobs;

CREATE INDEX publish_job_items_item ON publish_job_items (item_id, job_id);
