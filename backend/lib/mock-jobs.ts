import { buildInitialSteps } from "@/lib/pipeline";
import type {
  CreateJobPayload,
  JobResponse,
  JobStatus,
  PipelineStep,
} from "@/lib/types";

function buildStepsForStatus(status: JobStatus): PipelineStep[] {
  const steps = buildInitialSteps();

  if (status === "COMPLETED") {
    return steps.map((step) => ({ ...step, status: "COMPLETED" }));
  }

  if (status === "RUNNING") {
    return steps.map((step, index) => {
      if (index < 3) {
        return { ...step, status: "COMPLETED" };
      }

      if (index === 3) {
        return { ...step, status: "RUNNING" };
      }

      return step;
    });
  }

  if (status === "FAILED") {
    return steps.map((step, index) => {
      if (index < 2) {
        return { ...step, status: "COMPLETED" };
      }

      if (index === 2) {
        return {
          ...step,
          status: "FAILED",
          error: "Screenshot capture service did not respond.",
        };
      }

      return step;
    });
  }

  return steps;
}

function buildMockJob(
  id: string,
  repoUrl: string,
  branch: string,
  status: JobStatus,
  createdAt: string,
): JobResponse {
  return {
    id,
    repoUrl,
    branch,
    status,
    steps: buildStepsForStatus(status),
    prUrl: status === "COMPLETED" ? "https://github.com/example/repo/pull/42" : null,
    createdAt,
    updatedAt: new Date().toISOString(),
  };
}

export function listMockJobs(): JobResponse[] {
  return [
    buildMockJob(
      "job_001",
      "https://github.com/example/my-app",
      "main",
      "COMPLETED",
      new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    ),
    buildMockJob(
      "job_002",
      "https://github.com/example/landing-page",
      "main",
      "RUNNING",
      new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    ),
    buildMockJob(
      "job_003",
      "https://github.com/example/dashboard-ui",
      "develop",
      "PENDING",
      new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    ),
  ];
}

export function getMockJob(jobId: string): JobResponse {
  return (
    listMockJobs().find((job) => job.id === jobId) ??
    buildMockJob(
      jobId,
      "https://github.com/example/repo",
      "main",
      "PENDING",
      new Date().toISOString(),
    )
  );
}

export function createMockJob(payload: CreateJobPayload): JobResponse {
  return buildMockJob(
    `job_${Date.now()}`,
    payload.repoUrl,
    payload.branch ?? "main",
    "PENDING",
    new Date().toISOString(),
  );
}
