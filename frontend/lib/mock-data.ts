export interface MockRepo {
  id: string;
  fullName: string;
  name: string;
  description: string;
  language: string;
  stargazerCount: number;
  updatedAt: string;
  isPrivate: boolean;
}

export type MockJobStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED";

export interface MockJob {
  id: string;
  repoFullName: string;
  status: MockJobStatus;
  currentStep: string;
  beforeScreenshots: string[];
  afterScreenshots: string[];
  prUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export const pipelineSteps: string[] = [
  "Cloning repository",
  "Capturing current UI screenshots",
  "Analyzing with Google Cloud Vision",
  "Generating design brief",
  "Redesigning UI components",
  "Rendering redesigned output",
  "Running design critique",
  "Applying revisions",
  "Opening pull request",
  "Done",
];

export const mockRepos: MockRepo[] = [
  {
    id: "repo_001",
    fullName: "acme/landing-page",
    name: "landing-page",
    description: "Marketing landing page for the Acme product suite.",
    language: "TypeScript",
    stargazerCount: 248,
    updatedAt: "2026-04-22T14:32:00.000Z",
    isPrivate: false,
  },
  {
    id: "repo_002",
    fullName: "acme/dashboard-ui",
    name: "dashboard-ui",
    description: "Internal analytics dashboard built with Next.js.",
    language: "TypeScript",
    stargazerCount: 87,
    updatedAt: "2026-04-20T09:14:00.000Z",
    isPrivate: true,
  },
  {
    id: "repo_003",
    fullName: "rohang/portfolio",
    name: "portfolio",
    description: "Personal portfolio site with project showcase.",
    language: "JavaScript",
    stargazerCount: 12,
    updatedAt: "2026-04-18T22:05:00.000Z",
    isPrivate: false,
  },
  {
    id: "repo_004",
    fullName: "openlabs/blog-platform",
    name: "blog-platform",
    description: "Open-source markdown blog platform.",
    language: "TypeScript",
    stargazerCount: 1342,
    updatedAt: "2026-04-15T11:48:00.000Z",
    isPrivate: false,
  },
  {
    id: "repo_005",
    fullName: "rohang/study-app",
    name: "study-app",
    description: "AI-assisted study companion for college students.",
    language: "TypeScript",
    stargazerCount: 56,
    updatedAt: "2026-04-10T18:21:00.000Z",
    isPrivate: true,
  },
];

export const mockJobs: MockJob[] = [
  {
    id: "job_001",
    repoFullName: "acme/landing-page",
    status: "COMPLETED",
    currentStep: "Done",
    beforeScreenshots: [
      "https://placehold.co/1280x800/eeeeee/333333?text=Before+Home",
      "https://placehold.co/1280x800/eeeeee/333333?text=Before+Pricing",
    ],
    afterScreenshots: [
      "https://placehold.co/1280x800/0f172a/ffffff?text=After+Home",
      "https://placehold.co/1280x800/0f172a/ffffff?text=After+Pricing",
    ],
    prUrl: "https://github.com/acme/landing-page/pull/142",
    createdAt: "2026-04-23T10:00:00.000Z",
    updatedAt: "2026-04-23T10:18:00.000Z",
  },
  {
    id: "job_002",
    repoFullName: "acme/dashboard-ui",
    status: "RUNNING",
    currentStep: "Redesigning UI components",
    beforeScreenshots: [
      "https://placehold.co/1280x800/eeeeee/333333?text=Before+Dashboard",
    ],
    afterScreenshots: [],
    prUrl: null,
    createdAt: "2026-04-24T20:42:00.000Z",
    updatedAt: "2026-04-24T20:55:00.000Z",
  },
  {
    id: "job_003",
    repoFullName: "rohang/portfolio",
    status: "PENDING",
    currentStep: "Cloning repository",
    beforeScreenshots: [],
    afterScreenshots: [],
    prUrl: null,
    createdAt: "2026-04-24T22:30:00.000Z",
    updatedAt: "2026-04-24T22:30:00.000Z",
  },
  {
    id: "job_004",
    repoFullName: "openlabs/blog-platform",
    status: "FAILED",
    currentStep: "Capturing current UI screenshots",
    beforeScreenshots: [],
    afterScreenshots: [],
    prUrl: null,
    createdAt: "2026-04-22T08:11:00.000Z",
    updatedAt: "2026-04-22T08:14:00.000Z",
  },
  {
    id: "job_005",
    repoFullName: "rohang/study-app",
    status: "COMPLETED",
    currentStep: "Done",
    beforeScreenshots: [
      "https://placehold.co/1280x800/eeeeee/333333?text=Before+Study",
    ],
    afterScreenshots: [
      "https://placehold.co/1280x800/0f172a/ffffff?text=After+Study",
    ],
    prUrl: "https://github.com/rohang/study-app/pull/27",
    createdAt: "2026-04-19T15:00:00.000Z",
    updatedAt: "2026-04-19T15:22:00.000Z",
  },
];
