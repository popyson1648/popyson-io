PRAGMA foreign_keys = ON;

CREATE TABLE content_items (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('post', 'work', 'about')),
  slug TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  deleted_at TEXT,
  current_revision_id TEXT,
  published_revision_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (kind, slug)
);

CREATE TABLE content_revisions (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE RESTRICT,
  parent_revision_id TEXT REFERENCES content_revisions(id) ON DELETE RESTRICT,
  source_format TEXT NOT NULL CHECK (source_format IN ('markdown', 'toml')),
  source_ja TEXT NOT NULL,
  source_en TEXT NOT NULL,
  documents_json TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  media_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  checksum_sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE revision_assets (
  revision_id TEXT NOT NULL REFERENCES content_revisions(id) ON DELETE RESTRICT,
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  logical_path TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'body' CHECK (role IN ('body', 'thumbnail', 'hero')),
  PRIMARY KEY (revision_id, logical_path)
);

CREATE TABLE publish_jobs (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE RESTRICT,
  revision_id TEXT NOT NULL REFERENCES content_revisions(id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL CHECK (state IN ('queued', 'running', 'failed', 'succeeded')),
  github_run_id TEXT,
  sanitized_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE releases (
  id TEXT PRIMARY KEY,
  code_sha TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('candidate', 'deploying', 'active', 'failed', 'superseded')),
  manifest_checksum TEXT NOT NULL,
  pages_deployment_id TEXT,
  created_at TEXT NOT NULL,
  activated_at TEXT
);

CREATE TABLE release_items (
  release_id TEXT NOT NULL REFERENCES releases(id) ON DELETE RESTRICT,
  item_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE RESTRICT,
  revision_id TEXT NOT NULL REFERENCES content_revisions(id) ON DELETE RESTRICT,
  PRIMARY KEY (release_id, item_id)
);

CREATE INDEX content_items_listing
  ON content_items (kind, visibility, deleted_at, updated_at DESC);
CREATE INDEX content_revisions_item_history
  ON content_revisions (item_id, created_at DESC);
CREATE INDEX revision_assets_asset
  ON revision_assets (asset_id);
CREATE INDEX publish_jobs_state
  ON publish_jobs (state, created_at);
CREATE UNIQUE INDEX releases_one_active
  ON releases (state) WHERE state = 'active';
