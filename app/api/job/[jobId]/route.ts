import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getDemoJobStatus, isDemoJobId } from "@/lib/demo-scene";

const STATUS_LABELS: Record<string, string> = {
  pending: "Preparing your floor plan...",
  agent1_running: "Reading floor plan geometry...",
  agent1_done: "Floor plan extracted!",
  agent2_running: "Planning object placement...",
  agent2_done: "Objects placed!",
  agent3_running: "Assembling 3D scene...",
  complete: "Scene ready!",
  failed: "Processing failed",
};

const STATUS_PROGRESS: Record<string, number> = {
  pending: 5,
  agent1_running: 20,
  agent1_done: 40,
  agent2_running: 55,
  agent2_done: 75,
  agent3_running: 90,
  complete: 100,
  failed: 0,
};

export async function GET(_req: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    // Demo / hardcoded flow: synthesize the response from a fixed timeline,
    // never touching the DB. See lib/demo-scene.ts.
    if (isDemoJobId(params.jobId)) {
      const status = getDemoJobStatus(params.jobId);
      if (status) return NextResponse.json(status);
    }

    const job = await db.getJob(params.jobId);

    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    return NextResponse.json({
      status: job.status,
      label: STATUS_LABELS[job.status] ?? job.status,
      progress: STATUS_PROGRESS[job.status] ?? 0,
      sceneId: job.scene_id ?? null,
      error: job.error_message ?? null,
    });
  } catch (error) {
    console.error("Job status fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
