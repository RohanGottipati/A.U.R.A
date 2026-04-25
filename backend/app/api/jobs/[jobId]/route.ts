// DEPRECATED - replaced by /app/api/job/[jobId]/route.ts (FloorPlan AI job status)
import { requireUser } from "@/lib/auth";
import { jsonWithCors, optionsResponse } from "@/lib/http";
import { toJobDetailResponse } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/jobs/[jobId] – Fetch a single job by ID.
 */
export async function GET(
  _request: Request,
  { params }: { params: { jobId: string } },
) {
  const user = await requireUser();

  if (!user) {
    return jsonWithCors({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = params;

  try {
    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        userId: user.id,
      },
      select: {
        id: true,
        status: true,
        currentStep: true,
        logs: true,
        prUrl: true,
        error: true,
      },
    });

    if (!job) {
      return jsonWithCors({ error: "Job not found." }, { status: 404 });
    }

    return jsonWithCors(toJobDetailResponse(job));
  } catch (error) {
    console.error("[jobs] Failed to fetch job.", {
      jobId,
      userId: user.id,
      error,
    });

    return jsonWithCors({ error: "Failed to fetch job." }, { status: 500 });
  }
}

export async function OPTIONS() {
  return optionsResponse();
}
