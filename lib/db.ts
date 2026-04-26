import { Pool } from 'pg';
import { getEnv } from './env';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const { DATABASE_URL } = getEnv();
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }

  return pool;
}

// Detect whether the optional `image_hash` column has been migrated in. The
// upload route degrades gracefully (skipping caching) if the migration in
// migrations/003_add_image_hash.sql hasn't been applied yet.
let imageHashColumnAvailable: boolean | null = null;

async function hasImageHashColumn(): Promise<boolean> {
  if (imageHashColumnAvailable !== null) return imageHashColumnAvailable;
  try {
    const result = await getPool().query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'jobs' AND column_name = 'image_hash' LIMIT 1`,
    );
    imageHashColumnAvailable = result.rowCount === 1;
  } catch {
    imageHashColumnAvailable = false;
  }
  return imageHashColumnAvailable;
}

export const db = {
  query: (text: string, params?: unknown[]) => getPool().query(text, params),

  async createJob(
    jobId: string,
    useCaseText: string,
    floorplanStorageKey: string,
    options?: { imageHash?: string; status?: string; sceneId?: string },
  ): Promise<string> {
    const hashAvailable = await hasImageHashColumn();
    const useHash = hashAvailable && options?.imageHash;
    const status = options?.status ?? 'pending';
    const sceneId = options?.sceneId ?? null;

    if (useHash) {
      const result = await getPool().query(
        `INSERT INTO jobs (id, use_case, floorplan_storage_key, image_hash, status, scene_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [jobId, useCaseText, floorplanStorageKey, options!.imageHash!, status, sceneId],
      );
      return result.rows[0].id;
    }

    const result = await getPool().query(
      `INSERT INTO jobs (id, use_case, floorplan_storage_key, status, scene_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [jobId, useCaseText, floorplanStorageKey, status, sceneId],
    );
    return result.rows[0].id;
  },

  async findCompletedSceneByHash(
    imageHash: string,
    useCase: string,
  ): Promise<{ sceneId: string } | null> {
    if (!(await hasImageHashColumn())) return null;
    const result = await getPool().query(
      `SELECT j.scene_id AS scene_id
         FROM jobs j
        WHERE j.image_hash = $1
          AND j.use_case = $2
          AND j.status = 'complete'
          AND j.scene_id IS NOT NULL
        ORDER BY j.updated_at DESC
        LIMIT 1`,
      [imageHash, useCase],
    );
    if (result.rowCount === 0) return null;
    return { sceneId: result.rows[0].scene_id as string };
  },

  async updateJobStatus(
    jobId: string,
    status: string,
    extras?: { agent1Output?: object; agent2Output?: object; errorMessage?: string; sceneId?: string }
  ): Promise<void> {
    const fields: string[] = ['status = $2', 'updated_at = NOW()'];
    const values: unknown[] = [jobId, status];
    let i = 3;

    if (extras?.agent1Output) { fields.push(`agent1_output = $${i++}`); values.push(JSON.stringify(extras.agent1Output)); }
    if (extras?.agent2Output) { fields.push(`agent2_output = $${i++}`); values.push(JSON.stringify(extras.agent2Output)); }
    if (extras?.errorMessage) { fields.push(`error_message = $${i++}`); values.push(extras.errorMessage); }
    if (extras?.sceneId)      { fields.push(`scene_id = $${i++}`); values.push(extras.sceneId); }

    await getPool().query(`UPDATE jobs SET ${fields.join(', ')} WHERE id = $1`, values);
  },

  async getJob(jobId: string) {
    const result = await getPool().query('SELECT * FROM jobs WHERE id = $1', [jobId]);
    return result.rows[0] ?? null;
  },

  async createScene(params: {
    sceneId: string;
    jobId: string;
    sceneStorageKey: string;
    useCase: string;
    useCaseCategory: string;
    floorplanWidth: number;
    floorplanDepth: number;
    objectCount: number;
    shareUrl: string;
  }): Promise<string> {
    const result = await getPool().query(
      `INSERT INTO scenes
         (id, job_id, scene_storage_key, use_case, use_case_category,
          floorplan_width, floorplan_depth, object_count, share_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [
        params.sceneId, params.jobId, params.sceneStorageKey, params.useCase,
        params.useCaseCategory, params.floorplanWidth, params.floorplanDepth,
        params.objectCount, params.shareUrl
      ]
    );
    return result.rows[0].id;
  },

  async getScene(sceneId: string) {
    const result = await getPool().query('SELECT * FROM scenes WHERE id = $1', [sceneId]);
    return result.rows[0] ?? null;
  }
};
