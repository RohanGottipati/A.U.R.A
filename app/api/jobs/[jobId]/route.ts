import { NextResponse } from "next/server";

/**
 * GET /api/jobs/[jobId] – Fetch a single job by ID.
 *
 * TODO (Phase 2): Look up the job in the DB via Prisma.
 */
export async function GET(
  _request: Request,
  { params }: { params: { jobId: string } },
) {
  const { jobId } = params;

  // Placeholder response.
  return NextResponse.json({
    id: jobId,
    repoUrl: "https://github.com/example/repo",
    branch: "main",
    status: "PENDING",
    steps: [],
    prUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}
