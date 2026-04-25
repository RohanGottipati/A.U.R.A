import type { CreateJobPayload } from "@/lib/types";
import { jsonWithCors, optionsResponse } from "@/lib/http";
import { createMockJob, listMockJobs } from "@/lib/mock-jobs";

/**
 * GET /api/jobs – List all jobs for the authenticated user.
 *
 * TODO (Phase 2): Wire up Prisma + NextAuth session to return real data.
 */
export async function GET() {
  return jsonWithCors({ jobs: listMockJobs() });
}

/**
 * POST /api/jobs – Create a new redesign job.
 *
 * Expects JSON body: { repoUrl: string; branch?: string }
 *
 * TODO (Phase 2): Validate auth, persist via Prisma, kick off pipeline.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as Partial<CreateJobPayload>;

  if (!body.repoUrl?.trim()) {
    return jsonWithCors({ error: "repoUrl is required" }, { status: 400 });
  }

  return jsonWithCors(
    createMockJob({
      repoUrl: body.repoUrl.trim(),
      branch: body.branch?.trim() || undefined,
    }),
    { status: 201 },
  );
}

export async function OPTIONS() {
  return optionsResponse();
}
