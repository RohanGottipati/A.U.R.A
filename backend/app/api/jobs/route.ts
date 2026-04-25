import { requireUser } from "@/lib/auth";
import { jsonWithCors, optionsResponse } from "@/lib/http";
import { toJobListItemResponse } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/jobs – List all jobs for the authenticated user.
 */
export async function GET() {
  const user = await requireUser();

  if (!user) {
    return jsonWithCors({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const jobs = await prisma.job.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return jsonWithCors({
      jobs: jobs.map(toJobListItemResponse),
    });
  } catch (error) {
    console.error("[jobs] Failed to list jobs.", {
      userId: user.id,
      error,
    });

    return jsonWithCors({ error: "Failed to fetch jobs." }, { status: 500 });
  }
}

export async function OPTIONS() {
  return optionsResponse();
}
