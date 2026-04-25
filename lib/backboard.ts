import { runAgent1 } from './agents/agent1-geometry';
import { runAgent2 } from './agents/agent2-placement';
import { runAgent3 } from './agents/agent3-assembly';
import { storage } from './storage';
import { db } from './db';
import { getEnv } from './env';

export async function runPipeline(jobId: string, floorplanImageUrl: string, useCase: string): Promise<void> {
  try {
    // --- Agent 1 ---
    await db.updateJobStatus(jobId, 'agent1_running');
    const floorplan = await runAgent1(floorplanImageUrl);
    await db.updateJobStatus(jobId, 'agent1_done', { agent1Output: floorplan });

    // --- Agent 2 ---
    await db.updateJobStatus(jobId, 'agent2_running');
    const { objects, useCaseCategory, placementNotes } = await runAgent2(floorplan, useCase);
    await db.updateJobStatus(jobId, 'agent2_done', { agent2Output: { objects, useCaseCategory, placementNotes } });

    // --- Agent 3 ---
    await db.updateJobStatus(jobId, 'agent3_running');
    const sceneFile = runAgent3({ floorplan, objects, useCaseCategory, placementNotes, useCase });

    // --- Save to Object Storage ---
    const sceneKey = `scenes/${sceneFile.sceneId}.json`;
    await storage.uploadScene(sceneKey, sceneFile);

    // --- Save to Database ---
    const sceneId = await db.createScene({
      sceneId: sceneFile.sceneId,
      jobId,
      sceneStorageKey: sceneKey,
      useCase,
      useCaseCategory,
      floorplanWidth: floorplan.width,
      floorplanDepth: floorplan.depth,
      objectCount: objects.length,
      shareUrl: `${getEnv().APP_BASE_URL}/scene/${sceneFile.sceneId}`,
    });

    await db.updateJobStatus(jobId, 'complete', { sceneId });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.updateJobStatus(jobId, 'failed', { errorMessage: message });
    throw error;
  }
}
