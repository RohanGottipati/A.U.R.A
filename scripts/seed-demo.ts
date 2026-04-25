import { runPipeline } from '../lib/backboard';
import { db } from '../lib/db';
import { storage } from '../lib/storage';
import * as fs from 'fs';
import * as path from 'path';

async function seedDemo() {
  console.log('Seeding BearHacks demo scene...');

  const imagePath = path.join(process.cwd(), 'public/demo/bearhacks-floorplan.jpg');
  const imageBuffer = fs.readFileSync(imagePath);

  const imageKey = 'floorplans/demo-bearhacks.jpg';
  const imageUrl = await storage.uploadImage(imageKey, imageBuffer, 'image/jpeg');
  console.log('Image uploaded:', imageUrl);

  const jobId = await db.createJob(
    'hackathon with hacking stations along the walls, sponsor booths in the center, and a ceremony stage at the front',
    imageKey
  );
  console.log('Job created:', jobId);

  await runPipeline(jobId, imageUrl,
    'hackathon with hacking stations along the walls, sponsor booths in the center, and a ceremony stage at the front'
  );

  const job = await db.getJob(jobId);
  console.log('Demo scene ready! Scene ID:', job.scene_id);
  console.log('Share URL:', job.scene_id ? `http://your-domain.com/scene/${job.scene_id}` : 'N/A');
}

seedDemo().catch(console.error);
