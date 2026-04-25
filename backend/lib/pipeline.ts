import type { PipelineStep } from "@/lib/types";

type PersistedJobStatus = "running" | "completed" | "failed";

const STEP_DELAY_MS = 750;

/** Ordered list of pipeline steps used by the current mock UI. */
export const PIPELINE_STEPS: readonly string[] = [
  "Cloning repository",
  "Analyzing codebase",
  "Generating design brief",
  "Redesigning UI",
] as const;

export function buildInitialSteps(): PipelineStep[] {
  return PIPELINE_STEPS.map((name) => ({
    name,
    status: "PENDING" as const,
  }));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function updateStatus(
  jobId: string,
  status: PersistedJobStatus,
  currentStep: string,
): Promise<void> {
  try {
    const prismaModule = (await import("@/lib/prisma").catch(() => null)) as
      | {
          prisma?: {
            job?: {
              update?: (args: {
                where: { id: string };
                data: { status: PersistedJobStatus; currentStep: string };
              }) => Promise<unknown>;
            };
          };
        }
      | null;

    const prismaClient = prismaModule?.prisma;

    if (!prismaClient?.job?.update) {
      return;
    }

    await prismaClient.job.update({
      where: { id: jobId },
      data: {
        status,
        currentStep,
      },
    });
  } catch (error) {
    console.warn("[pipeline] Could not update job status.", {
      jobId,
      status,
      currentStep,
      error,
    });
  }
}

export async function runPipeline(
  jobId: string,
  repoFullName: string,
  userNote: string,
  githubAccessToken: string,
): Promise<void> {
  let currentStep = "Starting pipeline";

  try {
    console.info("[pipeline] Starting Phase 1 pipeline.", {
      jobId,
      repoFullName,
      hasUserNote: userNote.trim().length > 0,
      hasGithubAccessToken: githubAccessToken.trim().length > 0,
    });

    for (const step of PIPELINE_STEPS) {
      currentStep = step;
      await updateStatus(jobId, "running", step);
      await sleep(STEP_DELAY_MS);
    }

    await updateStatus(jobId, "completed", "Done");
  } catch (error) {
    await updateStatus(jobId, "failed", currentStep);
    throw error;
  }
}
