import { jsonWithCors, optionsResponse } from "@/lib/http";
import { getMockJob } from "@/lib/mock-jobs";

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

  return jsonWithCors(getMockJob(jobId));
}

export async function OPTIONS() {
  return optionsResponse();
}
