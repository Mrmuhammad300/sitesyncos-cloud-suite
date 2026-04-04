-- Submittal file attachments with version tracking
-- Run this in your Supabase SQL editor or via: supabase db push

CREATE TABLE IF NOT EXISTS submittal_files (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  submittal_id UUID        NOT NULL REFERENCES submittals(id) ON DELETE CASCADE,
  file_name    TEXT        NOT NULL,
  file_url     TEXT        NOT NULL,
  file_size    TEXT,
  version      INT         NOT NULL DEFAULT 1,
  uploaded_by  TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by submittal
CREATE INDEX IF NOT EXISTS submittal_files_submittal_id_idx ON submittal_files(submittal_id);

-- RLS
ALTER TABLE submittal_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read submittal files"
  ON submittal_files FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can upload submittal files"
  ON submittal_files FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete submittal files"
  ON submittal_files FOR DELETE TO authenticated USING (true);
