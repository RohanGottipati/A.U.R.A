import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export const db = {
  query: (text: string, params?: unknown[]) => pool.query(text, params),

  async createJob(useCaseText: string, floorplanStorageKey: string): Promise<string> {
    const result = await pool.query(
      `INSERT INTO jobs (use_case, floorplan_storage_key)
       VALUES ($1, $2) RETURNING id`,
      [useCaseText, floorplanStorageKey]
    );
    return result.rows[0].id;
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

    await pool.query(`UPDATE jobs SET ${fields.join(', ')} WHERE id = $1`, values);
  },

  async getJob(jobId: string) {
    const result = await pool.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
    return result.rows[0] ?? null;
  },

  async createScene(params: {
    jobId: string;
    sceneStorageKey: string;
    useCase: string;
    useCaseCategory: string;
    floorplanWidth: number;
    floorplanDepth: number;
    objectCount: number;
    shareUrl: string;
  }): Promise<string> {
    const result = await pool.query(
      `INSERT INTO scenes
         (job_id, scene_storage_key, use_case, use_case_category,
          floorplan_width, floorplan_depth, object_count, share_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [
        params.jobId, params.sceneStorageKey, params.useCase,
        params.useCaseCategory, params.floorplanWidth, params.floorplanDepth,
        params.objectCount, params.shareUrl
      ]
    );
    return result.rows[0].id;
  },

  async getScene(sceneId: string) {
    const result = await pool.query('SELECT * FROM scenes WHERE id = $1', [sceneId]);
    return result.rows[0] ?? null;
  }
};
