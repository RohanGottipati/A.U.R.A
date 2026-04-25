import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

import { runPipeline } from "../lib/backboard";
import { db } from "../lib/db";
import { getEnv } from "../lib/env";
import { storage } from "../lib/storage";

const DEMO_IMAGE_CANDIDATES = [
  "public/demo/bearhacks-floorplan.jpg",
  "public/demo/bearhacks-floorplan.png",
  "public/demo/bearhacks-floorplan.webp",
  "public/Floor 1.png",
];

function getDemoImageContentType(imagePath: string): string {
  const extension = path.extname(imagePath).toLowerCase();

  switch (extension) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    default:
      throw new Error(`Unsupported demo image type: ${extension}`);
  }
}

function resolveDemoImagePath(): string {
  const match = DEMO_IMAGE_CANDIDATES.find((relativePath) =>
    fs.existsSync(path.join(process.cwd(), relativePath)),
  );

  if (!match) {
    throw new Error(
      "Missing demo asset. Add public/demo/bearhacks-floorplan.(jpg|png|webp) or public/Floor 1.png before running seed-demo.",
    );
  }

  return path.join(process.cwd(), match);
}

async function seedDemo() {
  console.log("Seeding BearHacks demo scene...");

  const imagePath = resolveDemoImagePath();
  const imageBuffer = fs.readFileSync(imagePath);
  const imageContentType = getDemoImageContentType(imagePath);

  const jobId = uuidv4();
  const imageKey = `floorplans/${jobId}${path.extname(imagePath).toLowerCase()}`;
  const imageUrl = await storage.uploadImage(imageKey, imageBuffer, imageContentType);
  console.log("Image uploaded:", imageUrl);

  await db.createJob(
    jobId,
    "hackathon with hacking stations along the walls, sponsor booths in the center, and a ceremony stage at the front",
    imageKey,
  );
  console.log("Job created:", jobId);

  await runPipeline(jobId, imageUrl,
    "hackathon with hacking stations along the walls, sponsor booths in the center, and a ceremony stage at the front",
  );

  const job = await db.getJob(jobId);
  if (!job?.scene_id) {
    throw new Error("Seed demo completed without a scene ID.");
  }

  console.log("Demo scene ready! Scene ID:", job.scene_id);
  console.log("Share URL:", `${getEnv().APP_BASE_URL}/scene/${job.scene_id}`);
}

seedDemo().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
