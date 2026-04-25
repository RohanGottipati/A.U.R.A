// DEPRECATED - replaced by /lib/db.ts (FloorPlan AI raw PostgreSQL client)
import type { Job } from "@prisma/client";

import type { JobDetailResponse, JobListItemResponse } from "@/lib/types";

export const INITIAL_JOB_STEP = "Queued";
export const INITIAL_JOB_LOG = "Job created";

type JobDetailRecord = Pick<
  Job,
  "id" | "status" | "currentStep" | "logs" | "prUrl" | "error"
>;

export function toJobDetailResponse(job: JobDetailRecord): JobDetailResponse {
  return {
    id: job.id,
    status: job.status,
    currentStep: job.currentStep,
    logs: job.logs,
    prUrl: job.prUrl,
    error: job.error,
  };
}

export function toJobListItemResponse(job: Job): JobListItemResponse {
  return {
    ...toJobDetailResponse(job),
    repoOwner: job.repoOwner,
    repoName: job.repoName,
    repoUrl: job.repoUrl,
    defaultBranch: job.defaultBranch,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}
