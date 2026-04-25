// DEPRECATED - replaced by /lib/backboard.ts (FloorPlan AI Backboard pipeline)
import { prisma } from "@/lib/prisma";
import type { JobStatus } from "@/lib/types";

const STEP_DELAY_MS = 750;

export const PIPELINE_STEPS: readonly string[] = [
  "Fetching repository files",
  "Analyzing UI files",
  "Creating design brief",
  "Generating redesigned files",
  "Preparing pull request",
  "Done",
] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function updateJobStep(
  jobId: string,
  status: JobStatus,
  currentStep: string,
  extraData?: {
    prUrl?: string | null;
    error?: string | null;
  },
): Promise<void> {
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status,
      currentStep,
      logs: {
        push: currentStep,
      },
      prUrl: extraData?.prUrl,
      error: extraData?.error ?? null,
    },
  });
}

async function markJobFailed(jobId: string, errorMessage: string): Promise<void> {
  try {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "failed",
        error: errorMessage,
        logs: {
          push: `Pipeline failed: ${errorMessage}`,
        },
      },
    });
  } catch (error) {
    console.error("[pipeline] Could not mark job as failed.", {
      jobId,
      error,
    });
  }
}

export async function runFakePipeline(jobId: string): Promise<void> {
  let currentStep = "Queued";

  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        repoOwner: true,
        repoName: true,
      },
    });

    if (!job) {
      return;
    }

    for (const step of PIPELINE_STEPS.slice(0, -1)) {
      currentStep = step;
      await sleep(STEP_DELAY_MS);
      await updateJobStep(jobId, "running", step);
    }

    currentStep = PIPELINE_STEPS[PIPELINE_STEPS.length - 1];
    await sleep(STEP_DELAY_MS);
    await updateJobStep(jobId, "completed", currentStep, {
      prUrl: `https://github.com/${job.repoOwner}/${job.repoName}/pull/1`,
      error: null,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "The fake pipeline failed.";

    console.error("[pipeline] Fake pipeline failed.", {
      jobId,
      currentStep,
      error,
    });

    await markJobFailed(jobId, errorMessage);
  }
}
