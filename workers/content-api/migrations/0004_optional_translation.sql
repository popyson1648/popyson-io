ALTER TABLE publish_job_items
  ADD COLUMN translation_enabled INTEGER NOT NULL DEFAULT 1
  CHECK (translation_enabled IN (0, 1));
