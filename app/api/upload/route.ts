import { createHash } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import { NextRequest, NextResponse } from "next/server";

import { runPipeline } from "@/lib/backboard";
import { db } from "@/lib/db";
import {
  isLikelyInfrastructureError,
  isLocalDevFallbackEnabled,
  markLocalJobComplete,
} from "@/lib/local-dev-fallback";
import { storage } from "@/lib/storage";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MIN_USE_CASE_LENGTH = 10;
const MAX_USE_CASE_LENGTH = 500;
const INFRA_TIMEOUT_MS = 8000;

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

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timeout after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

export async function POST(req: NextRequest) {
  let jobId: string | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get("floorplan");
    const useCaseValue = formData.get("useCase");
    const useCase = typeof useCaseValue === "string" ? useCaseValue.trim() : "";

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

    jobId = uuidv4();
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

    const imageUrl = await withTimeout(
      storage.uploadImage(imageKey, imageBuffer, file.type),
      INFRA_TIMEOUT_MS,
      "Storage upload",
    );

    await withTimeout(
      db.createJob(jobId, useCase, imageKey, { imageHash }),
      INFRA_TIMEOUT_MS,
      "Database createJob",
    );

    // Fire pipeline asynchronously — do NOT await this
    runPipeline(jobId, imageUrl, useCase).catch((err) => {
      console.error(`Pipeline failed for job ${jobId}:`, err);
    });

    return NextResponse.json({ jobId }, { status: 202 });

  } catch (error) {
    console.error("Upload error:", error);

    if (jobId && isLocalDevFallbackEnabled() && isLikelyInfrastructureError(error)) {
      // Keep localhost usable when external infra is unavailable.
      try {
        markLocalJobComplete(jobId);
      } catch (fallbackErr) {
        console.error("Local fallback write failed:", fallbackErr);
      }
      return NextResponse.json({ jobId }, { status: 202 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const maxDuration = 30;
