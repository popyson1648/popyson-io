ALTER TABLE content_items
  ADD COLUMN translation_enabled INTEGER NOT NULL DEFAULT 1
  CHECK (translation_enabled IN (0, 1));

ALTER TABLE release_items
  ADD COLUMN translation_enabled INTEGER NOT NULL DEFAULT 1
  CHECK (translation_enabled IN (0, 1));

UPDATE content_items
   SET translation_enabled = 0
 WHERE kind = 'post'
   AND EXISTS (
     SELECT 1
       FROM content_revisions r
      WHERE r.id = content_items.current_revision_id
        AND json_extract(r.metadata_json, '$.translation.en') = 'japanese-source'
   );

UPDATE release_items
   SET translation_enabled = 0
 WHERE EXISTS (
   SELECT 1
     FROM content_items i
     JOIN content_revisions r ON r.id = release_items.revision_id
    WHERE i.id = release_items.item_id
      AND i.kind = 'post'
      AND json_extract(r.metadata_json, '$.translation.en') = 'japanese-source'
 );
