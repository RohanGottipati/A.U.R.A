export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface RepoFile {
  path: string;
  content: string;
  encoding: string;
  size: number;
}

export interface DominantColor {
  color?: {
    red?: number;
    green?: number;
    blue?: number;
    alpha?: number;
  };
  score: number;
  pixelFraction: number;
}

export interface DetectedObject {
  name: string;
  score: number;
  boundingPoly: {
    normalizedVertices: { x: number; y: number }[];
  };
}

export interface VisionAnalysis {
  labels: string[];
  text: string;
  colors: DominantColor[];
  objects: DetectedObject[];
  webEntities: string[];
  pageType: string;
}

export interface RepoAnalysis {
  framework: string;
  stylingApproach: string;
  uiLibrary: string;
  pages: string[];
  components: string[];
  uiFiles: RepoFile[];
  hasAnimations: boolean;
  hasCustomStyling: boolean;
  vibeCodedIndicators: string[];
}

export interface DesignBrief {
  appType: string;
  targetAudience: string;
  audience: string;
  tone: string;
  colorDirection: string;
  typographyDirection: string;
  layoutPrinciples: string;
  animationStyle: string;
  keyChange: string;
  avoidPatterns: string[];
  summary: string;
  changes: string[];
}

export interface FileChange {
  path: string;
  content: string;
}

export interface CritiqueResult {
  passedReview: boolean;
  score: number;
  issues: string[];
  positives: string[];
}

export interface ScreenshotResult {
  name: string;
  buffer: Buffer;
}

export interface ScreenshotRef {
  url: string;
  pageName: string;
}

export interface OpenPRParams {
  accessToken: string;
  owner: string;
  repo: string;
  branchName: string;
  beforeScreenshots: ScreenshotRef[];
  afterScreenshots: ScreenshotRef[];
  designBrief: DesignBrief;
  changes: FileChange[];
}
