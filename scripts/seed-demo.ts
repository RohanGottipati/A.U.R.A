import { runPipeline } from '../lib/backboard';
import { db } from '../lib/db';
import { getEnv } from '../lib/env';
import { storage } from '../lib/storage';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

async function seedDemo() {
  console.log('Seeding BearHacks demo scene...');

  const imagePath = path.join(process.cwd(), 'public/demo/bearhacks-floorplan.jpg');
  if (!fs.existsSync(imagePath)) {
    throw new Error(
      'Missing demo asset at public/demo/bearhacks-floorplan.jpg. Add the BearHacks floor plan image before running seed-demo.'
    );
  }

  const imageBuffer = fs.readFileSync(imagePath);

  const jobId = uuidv4();
  const imageKey = `floorplans/${jobId}.jpg`;
  const imageUrl = await storage.uploadImage(imageKey, imageBuffer, 'image/jpeg');
  console.log('Image uploaded:', imageUrl);

  await db.createJob(
    jobId,
    'hackathon with hacking stations along the walls, sponsor booths in the center, and a ceremony stage at the front',
    imageKey
  );
  console.log('Job created:', jobId);

  await runPipeline(jobId, imageUrl,
    'hackathon with hacking stations along the walls, sponsor booths in the center, and a ceremony stage at the front'
  );

  const job = await db.getJob(jobId);
  if (!job?.scene_id) {
    throw new Error('Seed demo completed without a scene ID.');
  }

  console.log('Demo scene ready! Scene ID:', job.scene_id);
  console.log('Share URL:', `${getEnv().APP_BASE_URL}/scene/${job.scene_id}`);
}

seedDemo().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
