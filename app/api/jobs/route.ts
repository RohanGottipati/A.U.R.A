import { NextResponse } from "next/server";
import type { CreateJobPayload } from "@/lib/types";

/**
 * GET /api/jobs – List all jobs for the authenticated user.
 *
 * TODO (Phase 2): Wire up Prisma + NextAuth session to return real data.
 */
export async function GET() {
  // Placeholder: return empty list until DB is connected.
  return NextResponse.json({ jobs: [] });
}

/**
 * POST /api/jobs – Create a new redesign job.
 *
 * Expects JSON body: { repoUrl: string; branch?: string }
 *
 * TODO (Phase 2): Validate auth, persist via Prisma, kick off pipeline.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as CreateJobPayload;

  if (!body.repoUrl) {
    return NextResponse.json({ error: "repoUrl is required" }, { status: 400 });
  }

  // Placeholder response – no DB write yet.
  return NextResponse.json(
    {
      id: `job_${Date.now()}`,
      repoUrl: body.repoUrl,
      branch: body.branch ?? "main",
      status: "PENDING",
      steps: [],
      prUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { status: 201 },
  );
}
