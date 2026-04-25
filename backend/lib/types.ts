// DEPRECATED - replaced by /types/scene.ts (FloorPlan AI central schema)
export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface RepoListItem {
  id: number;
  fullName: string;
  name: string;
  description: string | null;
  language: string | null;
  stargazerCount: number;
  updatedAt: string;
  isPrivate: boolean;
}

export interface CreateJobRequest {
  repoOwner: string;
  repoName: string;
  repoUrl: string;
  defaultBranch: string;
}

export interface CreateJobResponse {
  jobId: string;
  status: JobStatus;
}

export interface JobDetailResponse {
  id: string;
  status: JobStatus;
  currentStep: string;
  logs: string[];
  prUrl: string | null;
  error: string | null;
}

export interface JobListItemResponse extends JobDetailResponse {
  repoOwner: string;
  repoName: string;
  repoUrl: string;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobsResponse {
  jobs: JobListItemResponse[];
}

export interface ApiErrorResponse {
  error: string;
}
