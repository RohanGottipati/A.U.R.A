-- FloorPlan AI schema
-- Run this against the Vultr PostgreSQL instance

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Jobs table: tracks pipeline execution state
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending',
  use_case TEXT NOT NULL,
  floorplan_storage_key TEXT NOT NULL,
  scene_id UUID REFERENCES scenes(id),
  error_message TEXT,
  agent1_output JSONB,
  agent2_output JSONB
);

-- Scenes table: stores completed scene metadata
CREATE TABLE IF NOT EXISTS scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  job_id UUID,
  scene_storage_key TEXT NOT NULL,
  use_case TEXT NOT NULL,
  use_case_category TEXT NOT NULL,
  floorplan_width NUMERIC,
  floorplan_depth NUMERIC,
  object_count INTEGER,
  share_url TEXT NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'jobs_scene_id_fkey'
  ) THEN
    ALTER TABLE jobs
      ADD CONSTRAINT jobs_scene_id_fkey
      FOREIGN KEY (scene_id)
      REFERENCES scenes(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'scenes_job_id_fkey'
  ) THEN
    ALTER TABLE scenes
      ADD CONSTRAINT scenes_job_id_fkey
      FOREIGN KEY (job_id)
      REFERENCES jobs(id);
  END IF;
END $$;

-- Index for fast job polling
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);
