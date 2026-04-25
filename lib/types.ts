// Shared types used across the AURA application.

/** Status values that mirror the Prisma JobStatus enum. */
export type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

/** A single step inside the redesign pipeline. */
export interface PipelineStep {
  name: string;
  status: JobStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

/** Shape returned by GET /api/jobs/[jobId]. */
export interface JobResponse {
  id: string;
  repoUrl: string;
  branch: string;
  status: JobStatus;
  steps: PipelineStep[];
  prUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Payload accepted by POST /api/jobs. */
export interface CreateJobPayload {
  repoUrl: string;
  branch?: string;
}
