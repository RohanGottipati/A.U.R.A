import { createHash } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import { NextRequest, NextResponse } from "next/server";

import { runPipeline } from "@/lib/backboard";
import { db } from "@/lib/db";
import {
  DEMO_FLOORPLAN_FILENAME,
  DEMO_JOB_PREFIX,
  rememberDemoUseCase,
} from "@/lib/demo-scene";
import { storage } from "@/lib/storage";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MIN_USE_CASE_LENGTH = 10;
const MAX_USE_CASE_LENGTH = 500;

function getImageExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      throw new Error(`Unsupported mime type: ${mimeType}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("floorplan");
    const useCaseValue = formData.get("useCase");
    const useCase = typeof useCaseValue === "string" ? useCaseValue.trim() : "";

    // Optional bring-your-own-key. Sent by the upload form when the user has
    // saved a Gemini API key in the landing-page modal. Header takes
    // precedence over a form-data field; both are scrubbed before logging.
    const headerKey = req.headers.get("x-gemini-api-key")?.trim() ?? "";
    const formKeyValue = formData.get("geminiApiKey");
    const formKey = typeof formKeyValue === "string" ? formKeyValue.trim() : "";
    const userApiKey = headerKey || formKey || undefined;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No floor plan image provided" }, { status: 400 });
    }
    if (useCase.length < MIN_USE_CASE_LENGTH) {
      return NextResponse.json(
        { error: `Use case description too short (minimum ${MIN_USE_CASE_LENGTH} characters)` },
        { status: 400 },
      );
    }
    if (useCase.length > MAX_USE_CASE_LENGTH) {
      return NextResponse.json(
        { error: `Use case description too long (maximum ${MAX_USE_CASE_LENGTH} characters)` },
        { status: 400 },
      );
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Image too large (max 10MB)" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      return NextResponse.json({ error: "Invalid file type. Use JPG, PNG, or WebP." }, { status: 400 });
    }

    // ── Hardcoded demo flow ─────────────────────────────────────────────
    // When the user uploads the bundled `Test.webp` asset we skip the real
    // pipeline (and any DB / storage / Gemini calls) and hand back a synthetic
    // job id whose timestamp drives a quick, scripted "loading" sequence
    // ending in a pre-baked 3D scene. The supplied API key is intentionally
    // ignored. See lib/demo-scene.ts.
    if (file.name === DEMO_FLOORPLAN_FILENAME) {
      const demoJobId = `${DEMO_JOB_PREFIX}${Date.now()}`;
      rememberDemoUseCase(demoJobId, useCase);
      return NextResponse.json({ jobId: demoJobId }, { status: 202 });
    }

    const jobId = uuidv4();
    const imageKey = `floorplans/${jobId}.${getImageExtension(file.type)}`;
    const imageBuffer = Buffer.from(await file.arrayBuffer());

    // Content-addressed cache key. Gemini's vision pipeline isn't
    // deterministic across calls (even at temperature 0), so re-running it
    // for the same (image, use_case) pair would yield wildly different
    // scenes. Short-circuit by reusing a previously-completed scene.
    const imageHash = createHash("sha256").update(imageBuffer).digest("hex");

    try {
      const cached = await db.findCompletedSceneByHash(imageHash, useCase);
      if (cached) {
        // Skip the pipeline. Create a stub job already in `complete` state
        // pointing at the existing scene so the processing page redirects
        // immediately.
        await db.createJob(jobId, useCase, imageKey, {
          imageHash,
          status: "complete",
          sceneId: cached.sceneId,
        });
        return NextResponse.json({ jobId }, { status: 202 });
      }
    } catch (err) {
      console.warn("Image-hash cache lookup failed, falling through:", err);
    }

    const imageUrl = await storage.uploadImage(imageKey, imageBuffer, file.type);

    await db.createJob(jobId, useCase, imageKey, { imageHash });

    // Fire pipeline asynchronously — do NOT await this
    runPipeline(jobId, imageUrl, useCase, userApiKey).catch((err) => {
      console.error(`Pipeline failed for job ${jobId}:`, err);
    });

    return NextResponse.json({ jobId }, { status: 202 });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const maxDuration = 30;
