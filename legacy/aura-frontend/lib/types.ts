// DEPRECATED - replaced by /types/scene.ts (FloorPlan AI central schema)
export type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface PipelineStep {
  name: string;
  status: JobStatus;
  error?: string;
}

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

export interface JobsResponse {
  jobs: JobResponse[];
}
