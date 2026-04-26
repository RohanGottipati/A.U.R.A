-- Adds an image content hash to jobs so we can deduplicate identical uploads.
-- Re-running an identical (image, use_case) pair would otherwise produce a
-- completely different scene because Gemini's vision pipeline is not fully
-- deterministic. Caching by hash makes repeat uploads visually stable.

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS image_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_jobs_image_hash_use_case ON jobs(image_hash, use_case);
