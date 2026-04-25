// DEPRECATED - replaced by /app/api/upload/route.ts (FloorPlan AI upload)
import { requireUser } from "@/lib/auth";
import { jsonWithCors, optionsResponse } from "@/lib/http";
import { INITIAL_JOB_LOG, INITIAL_JOB_STEP } from "@/lib/jobs";
import { runFakePipeline } from "@/lib/pipeline";
import { prisma } from "@/lib/prisma";
import type { CreateJobRequest } from "@/lib/types";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseCreateJobRequest(body: unknown): CreateJobRequest | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const candidate = body as Record<string, unknown>;

  if (
    !isNonEmptyString(candidate.repoOwner) ||
    !isNonEmptyString(candidate.repoName) ||
    !isNonEmptyString(candidate.repoUrl) ||
    !isNonEmptyString(candidate.defaultBranch)
  ) {
    return null;
  }

  return {
    repoOwner: candidate.repoOwner.trim(),
    repoName: candidate.repoName.trim(),
    repoUrl: candidate.repoUrl.trim(),
    defaultBranch: candidate.defaultBranch.trim(),
  };
}

export async function POST(request: Request) {
  const user = await requireUser();

  if (!user) {
    return jsonWithCors({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonWithCors({ error: "Invalid JSON body." }, { status: 400 });
  }

  const payload = parseCreateJobRequest(body);

  if (!payload) {
    return jsonWithCors(
      {
        error:
          "repoOwner, repoName, repoUrl, and defaultBranch are required.",
      },
      { status: 400 },
    );
  }

  try {
    const job = await prisma.job.create({
      data: {
        userId: user.id,
        repoOwner: payload.repoOwner,
        repoName: payload.repoName,
        repoUrl: payload.repoUrl,
        defaultBranch: payload.defaultBranch,
        status: "pending",
        currentStep: INITIAL_JOB_STEP,
        logs: [INITIAL_JOB_LOG],
      },
      select: {
        id: true,
        status: true,
      },
    });

    setTimeout(() => {
      void runFakePipeline(job.id);
    }, 0);

    return jsonWithCors(
      {
        jobId: job.id,
        status: job.status,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[jobs] Failed to create job.", {
      userId: user.id,
      payload,
      error,
    });

    return jsonWithCors({ error: "Failed to create job." }, { status: 500 });
  }
}

export async function OPTIONS() {
  return optionsResponse();
}
