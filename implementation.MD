# DesignPR — Full Implementation Guide (Complete)

> **What we're building:** A web app where users connect a GitHub repo, and an AI agent pipeline analyzes the existing UI, redesigns it with real design taste, and opens a pull request with before/after screenshots — automatically.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Environment Variables](#environment-variables)
4. [Installation & Setup](#installation--setup)
5. [TypeScript Types](#typescript-types)
6. [Frontend App](#frontend-app)
7. [GitHub OAuth + API](#github-oauth--api)
8. [Vultr Infrastructure](#vultr-infrastructure)
9. [Google Cloud Vision Integration](#google-cloud-vision-integration)
10. [Backboard Agent Pipeline](#backboard-agent-pipeline)
11. [The Agent Prompts](#the-agent-prompts)
12. [Playwright Screenshot System](#playwright-screenshot-system)
13. [Deployment Helpers](#deployment-helpers)
14. [PR Creation](#pr-creation)
15. [Gemma 4 Integration](#gemma-4-integration)
16. [Database Schema](#database-schema)
17. [API Routes](#api-routes)
18. [Error Handling & Retry Utilities](#error-handling--retry-utilities)
19. [Demo Flow](#demo-flow)
20. [Critical Notes](#critical-notes)

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router), Tailwind CSS, Framer Motion
- **Backend:** Next.js API Routes (serverless)
- **Database:** Vultr Managed PostgreSQL via Prisma ORM
- **Object Storage:** Vultr Object Storage (S3-compatible)
- **Compute:** Vultr VPS running Playwright headless browser service
- **Agent Orchestration:** Backboard
- **AI Models:** GPT-4o (redesign + critique + revision), Gemma 4 via Google Gemini API (analyze + brief)
- **Vision:** Google Cloud Vision API
- **Auth:** GitHub OAuth (NextAuth.js)
- **GitHub API:** Octokit
- **Screenshots:** Playwright (running on Vultr compute instance)

---

## Project Structure

```
designpr/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── dashboard/
│   │   └── page.tsx                # User dashboard — repo list + job history
│   ├── run/
│   │   └── [jobId]/page.tsx        # Live job progress page
│   └── api/
│       ├── auth/[...nextauth]/     # NextAuth GitHub OAuth
│       ├── repos/route.ts          # List user GitHub repos
│       ├── jobs/
│       │   ├── create/route.ts     # Start a new DesignPR job
│       │   └── [jobId]/route.ts    # Get job status
│       ├── screenshot/route.ts     # Trigger Playwright on Vultr compute
│       └── webhook/backboard/      # Backboard pipeline callbacks
├── lib/
│   ├── types.ts                    # All shared TypeScript interfaces
│   ├── prisma.ts                   # Prisma client
│   ├── vultr-storage.ts            # Vultr Object Storage client
│   ├── github.ts                   # Octokit helpers (fetch files + open PR)
│   ├── vision.ts                   # Google Cloud Vision helpers
│   ├── backboard.ts                # Backboard client + pipeline definitions
│   ├── openai.ts                   # OpenAI GPT-4o helper
│   ├── gemma.ts                    # Gemma 4 via Google Gemini API helper
│   ├── screenshot.ts               # Next.js-side screenshot trigger
│   ├── deploy-helper.ts            # Vercel preview deploy helpers
│   ├── pipeline.ts                 # Full agent pipeline orchestrator
│   ├── retry.ts                    # Retry + error handling utilities
│   └── agents/
│       ├── analyzer.ts             # Agent 1: repo analysis
│       ├── brief.ts                # Agent 2: design brief generation
│       ├── redesign.ts             # Agent 3: UI redesign
│       ├── critic.ts               # Agent 4: critique loop
│       └── reviser.ts              # Agent 5: final revision
├── prisma/
│   └── schema.prisma
├── types/
│   └── next-auth.d.ts              # NextAuth session type augmentation
├── playwright-service/             # Separate Node service on Vultr VPS
│   ├── package.json
│   ├── index.ts
│   └── screenshot.ts
├── next.config.js
├── package.json
└── .env.local
```

---

## Environment Variables

```bash
# NextAuth
NEXTAUTH_SECRET=your_secret_here_generate_with_openssl_rand_base64_32
NEXTAUTH_URL=https://your-domain.com

# GitHub OAuth App (create at github.com/settings/developers)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# GitHub Personal Access Token (for opening PRs as the app)
GITHUB_PAT=

# OpenAI (GPT-4o — redesign, critique, revision agents)
OPENAI_API_KEY=

# Google Gemini (for Gemma 4)
GOOGLE_GEMINI_API_KEY=

# Google Cloud Vision
GOOGLE_CLOUD_VISION_API_KEY=
GOOGLE_APPLICATION_CREDENTIALS=./gcp-service-account.json

# Vultr Managed PostgreSQL
DATABASE_URL=postgresql://user:pass@host:5432/designpr?sslmode=require

# Vultr Object Storage (S3-compatible)
VULTR_STORAGE_ENDPOINT=https://ewr1.vultrobjects.com
VULTR_STORAGE_ACCESS_KEY=
VULTR_STORAGE_SECRET_KEY=
VULTR_STORAGE_BUCKET=designpr-screenshots

# Playwright Service (running on Vultr compute)
PLAYWRIGHT_SERVICE_URL=http://your-vultr-ip:3001
PLAYWRIGHT_SERVICE_SECRET=your_shared_secret_min_32_chars

# Backboard
BACKBOARD_API_KEY=
BACKBOARD_ORG_ID=

# Vercel (for preview deploys used in screenshots)
VERCEL_TOKEN=
VERCEL_TEAM_ID=      # optional, only if using a Vercel team
```

---

## Installation & Setup

### 1. Clone and install dependencies

```bash
git clone https://github.com/your-org/designpr.git
cd designpr
npm install
```

### 2. Main `package.json`

```json
{
  "name": "designpr",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@auth/prisma-adapter": "^1.6.0",
    "@aws-sdk/client-s3": "^3.600.0",
    "@google-cloud/vision": "^4.3.0",
    "@octokit/rest": "^20.1.1",
    "@prisma/client": "^5.16.0",
    "framer-motion": "^11.2.0",
    "next": "14.2.5",
    "next-auth": "^4.24.7",
    "openai": "^4.52.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "prisma": "^5.16.0",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.5.0"
  }
}
```

### 3. Database setup

```bash
# Generate Prisma client
npx prisma generate

# Push schema to Vultr PostgreSQL (dev / first run)
npx prisma db push

# Or run migrations (production)
npx prisma migrate dev --name init
npx prisma migrate deploy   # in CI/CD
```

### 4. `next.config.js`

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ewr1.vultrobjects.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
  // Needed so Prisma can run in Next.js API routes
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
}

module.exports = nextConfig
```

### 5. NextAuth session type augmentation

```typescript
// types/next-auth.d.ts
import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      githubAccessToken?: string   // added so pipeline can use it
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    githubAccessToken?: string
  }
}
```

---

## TypeScript Types

Define all shared interfaces in one place. Import from here everywhere.

```typescript
// lib/types.ts

// ── Repo / files ──────────────────────────────────────────────────────────

export interface RepoFile {
  path: string
  content: string
  encoding: "utf-8" | "base64"
  size: number
}

// ── Vision ────────────────────────────────────────────────────────────────

export interface DominantColor {
  color?: { red?: number; green?: number; blue?: number; alpha?: number }
  score?: number
  pixelFraction?: number
}

export interface DetectedObject {
  name?: string
  score?: number
  boundingPoly?: unknown
}

export interface VisionAnalysis {
  labels: string[]
  text: string[]
  colors: DominantColor[]
  objects: DetectedObject[]
  webEntities: string[]
  pageType: string
}

// ── Agent I/O ─────────────────────────────────────────────────────────────

export interface RepoAnalysis {
  framework: "next.js" | "react" | "vue" | "html" | string
  stylingApproach: "tailwind" | "css-modules" | "styled-components" | "plain-css" | string
  uiLibrary: "shadcn" | "mui" | "chakra" | "none" | string
  pages: Array<{ path: string; file: string; description: string }>
  components: Array<{ name: string; file: string; type: "layout" | "ui" | "page" }>
  uiFiles: string[]
  hasAnimations: boolean
  hasCustomStyling: boolean
  vibeCodedIndicators: string[]
}

export interface DesignBrief {
  appType: string
  targetAudience: string
  tone: string
  colorDirection: string
  typographyDirection: string
  layoutPrinciples: string[]
  animationStyle: string
  keyChange: string
  avoidPatterns: string[]
  audience: string
  summary: string
  changes: Array<{ file: string; description: string }>
}

export interface FileChange {
  path: string
  content: string
}

export interface CritiqueResult {
  passedReview: boolean
  score: number
  issues: Array<{ file: string; issue: string; fix: string }>
  positives: string[]
}

// ── Screenshots ───────────────────────────────────────────────────────────

export interface ScreenshotResult {
  name: string
  buffer: Buffer
}

export interface ScreenshotRef {
  url: string
  pageName: string
}

// ── GitHub PR ─────────────────────────────────────────────────────────────

export interface OpenPRParams {
  accessToken: string
  owner: string
  repo: string
  branchName: string
  beforeScreenshots: ScreenshotRef[]
  afterScreenshots: ScreenshotRef[]
  designBrief: DesignBrief
  changes: FileChange[]
}
```

---

## Frontend App

### Landing Page (`app/page.tsx`)

The landing page must look STUNNING — this is the Best UI/UX prize entry. Do not use generic AI aesthetics.

Design direction: Dark background, editorial typography, dramatic scroll animations. Think Linear meets Vercel but with more personality.

Key sections:
1. **Hero** — Headline, subheading, "Connect GitHub" CTA button. Full viewport height. Animated headline on load.
2. **Before/After Demo** — Interactive slider showing a vibe coded app vs the DesignPR output. This is the most important section.
3. **How It Works** — Three steps with animated icons. Keep it clean.
4. **Footer** — Minimal.

Implementation requirements:
- Use Framer Motion for all animations
- Hero headline should animate in word by word on page load
- Before/after slider should be a draggable divider (build this custom, not a library)
- Scroll-triggered reveal on every section
- Color palette: near-black background (#0a0a0a), white text, single accent color (pick something unexpected — not blue, not purple)
- Typography: Use a distinctive display font from Google Fonts for headlines (options: Playfair Display, Syne, Cabinet Grotesk, Clash Display). Body in a clean geometric sans.
- NO default Shadcn components visible anywhere on this page

```tsx
// app/page.tsx — structure outline
// 1. Import Framer Motion: { motion, useScroll, useTransform, AnimatePresence }
// 2. Hero with staggered word animation on headline
// 3. BeforeAfterSlider custom component
// 4. HowItWorks with scroll-triggered step reveals
// 5. CTA section
```

### Dashboard (`app/dashboard/page.tsx`)

After GitHub OAuth, user lands here.

Sections:
- **Connected repos** — Card grid of their GitHub repos with a "Run DesignPR" button on each
- **Job history** — Table of past runs with status, before/after thumbnails, link to PR
- **Active job** — If a job is running, show a live progress indicator with agent step names

The repo cards should show: repo name, language, last updated, star count, and a "Run DesignPR →" button. On click, open a modal asking for an optional note ("Describe your app in one sentence — helps the agent understand context").

### Job Progress Page (`app/run/[jobId]/page.tsx`)

Live polling page showing agent pipeline progress. Poll `/api/jobs/[jobId]` every 2 seconds.

Show:
- Current agent step with animated spinner
- Completed steps with checkmarks
- Screenshot thumbnails as they're captured
- Final before/after comparison when done
- Link to the opened PR

Agent steps to display:
1. Cloning repository...
2. Capturing current UI screenshots...
3. Analyzing with Google Cloud Vision...
4. Generating design brief...
5. Redesigning UI components...
6. Rendering redesigned output...
7. Running design critique...
8. Applying revisions...
9. Opening pull request...
10. Done! ✓

---

## GitHub OAuth + API

### NextAuth Setup (`app/api/auth/[...nextauth]/route.ts`)

```typescript
import NextAuth, { type AuthOptions } from "next-auth"
import GithubProvider from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
  ],
  callbacks: {
    // Expose user id and GitHub access token on the session object
    async session({ session, user }) {
      session.user.id = user.id

      // Look up the stored GitHub access token for this user
      const account = await prisma.account.findFirst({
        where: { userId: user.id, provider: "github" },
        select: { access_token: true },
      })
      session.user.githubAccessToken = account?.access_token ?? undefined

      return session
    },
  },
  pages: {
    signIn: "/",   // redirect unauthenticated users to landing page
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

**Important:** The PrismaAdapter automatically populates the `Account` table (including `access_token`) when a user first signs in via GitHub OAuth. The session callback above retrieves it on every session read so the access token is always available server-side without an extra DB query in each route.

### Prisma Client Singleton (`lib/prisma.ts`)

```typescript
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

### Fetch Repo Files (`lib/github.ts`)

This function is called at the start of the pipeline to pull all UI-relevant files from the repo.

```typescript
import { Octokit } from "@octokit/rest"
import type { RepoFile, OpenPRParams, ScreenshotRef } from "./types"

// ── File fetching ─────────────────────────────────────────────────────────

// Extensions that contain UI code worth analyzing / redesigning
const UI_EXTENSIONS = [
  ".tsx", ".jsx", ".ts", ".js",
  ".css", ".module.css", ".scss",
  ".html",
]

// Paths to skip entirely — they don't contain UI code
const SKIP_PATHS = [
  "node_modules", ".next", ".git", "dist", "build",
  "__tests__", ".test.", ".spec.", "jest.", "vitest.",
  "prisma/migrations", ".env",
]

function shouldInclude(path: string): boolean {
  if (SKIP_PATHS.some(skip => path.includes(skip))) return false
  return UI_EXTENSIONS.some(ext => path.endsWith(ext))
}

export async function fetchRepoFiles(
  owner: string,
  repo: string,
  accessToken: string
): Promise<RepoFile[]> {
  const octokit = new Octokit({ auth: accessToken })

  // Get the full git tree (recursive = flatten all directories)
  const { data: repoData } = await octokit.rest.repos.get({ owner, repo })
  const defaultBranch = repoData.default_branch

  const { data: treeData } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: defaultBranch,
    recursive: "1",
  })

  const files = treeData.tree.filter(
    item => item.type === "blob" && item.path && shouldInclude(item.path)
  )

  // Cap at 60 files to avoid burning tokens — prioritize app/ and components/
  const prioritized = [
    ...files.filter(f => f.path!.startsWith("app/") || f.path!.startsWith("src/app/")),
    ...files.filter(f => f.path!.includes("component")),
    ...files.filter(f => !f.path!.startsWith("app/") && !f.path!.includes("component")),
  ].slice(0, 60)

  // Fetch content of each file (parallel, but respect secondary rate limits)
  const results: RepoFile[] = []
  const BATCH_SIZE = 10

  for (let i = 0; i < prioritized.length; i += BATCH_SIZE) {
    const batch = prioritized.slice(i, i + BATCH_SIZE)
    const fetched = await Promise.all(
      batch.map(async item => {
        try {
          const { data } = await octokit.rest.git.getBlob({
            owner,
            repo,
            file_sha: item.sha!,
          })
          const content =
            data.encoding === "base64"
              ? Buffer.from(data.content, "base64").toString("utf-8")
              : data.content
          return { path: item.path!, content, encoding: "utf-8" as const, size: item.size ?? 0 }
        } catch {
          return null
        }
      })
    )
    results.push(...fetched.filter((f): f is RepoFile => f !== null))
  }

  return results
}

// ── PR creation ───────────────────────────────────────────────────────────

export async function openDesignPR({
  accessToken,
  owner,
  repo,
  branchName,
  beforeScreenshots,
  afterScreenshots,
  designBrief,
  changes,
}: OpenPRParams): Promise<string> {
  const octokit = new Octokit({ auth: accessToken })

  // 1. Get default branch
  const { data: repoData } = await octokit.rest.repos.get({ owner, repo })
  const defaultBranch = repoData.default_branch

  // 2. Get latest commit SHA of default branch
  const { data: refData } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${defaultBranch}`,
  })
  const latestSHA = refData.object.sha

  // 3. Create new branch
  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: latestSHA,
  })

  // 4. For each changed file, create a blob
  const blobs = await Promise.all(
    changes.map(({ content }) =>
      octokit.rest.git.createBlob({
        owner,
        repo,
        content: Buffer.from(content).toString("base64"),
        encoding: "base64",
      })
    )
  )

  // 5. Create a new tree with all changed files
  const tree = await octokit.rest.git.createTree({
    owner,
    repo,
    base_tree: latestSHA,
    tree: changes.map(({ path }, i) => ({
      path,
      mode: "100644" as const,
      type: "blob" as const,
      sha: blobs[i].data.sha,
    })),
  })

  // 6. Create commit
  const commit = await octokit.rest.git.createCommit({
    owner,
    repo,
    message: "✨ DesignPR: Transform UI with real design taste",
    tree: tree.data.sha,
    parents: [latestSHA],
  })

  // 7. Update branch ref to point at new commit
  await octokit.rest.git.updateRef({
    owner,
    repo,
    ref: `heads/${branchName}`,
    sha: commit.data.sha,
  })

  // 8. Open the pull request
  const prBody = buildPRBody({ beforeScreenshots, afterScreenshots, designBrief })

  const { data: pr } = await octokit.rest.pulls.create({
    owner,
    repo,
    title: "✨ DesignPR: UI Redesign",
    body: prBody,
    head: branchName,
    base: defaultBranch,
  })

  return pr.html_url
}

function buildPRBody({
  beforeScreenshots,
  afterScreenshots,
  designBrief,
}: {
  beforeScreenshots: ScreenshotRef[]
  afterScreenshots: ScreenshotRef[]
  designBrief: Pick<OpenPRParams["designBrief"], "summary" | "tone" | "audience" | "keyChange" | "changes">
}): string {
  // NOTE: afterScreenshots[i] must be accessed via a variable — template literal
  // indexing like `${afterScreenshots[i].url}` does not work inside map callbacks
  // with template strings in all JS environments. Use explicit variable instead.
  const rows = beforeScreenshots
    .map((before, i) => {
      const after = afterScreenshots[i]
      return `
### ${before.pageName}

| Before | After |
|--------|-------|
| ![Before](${before.url}) | ![After](${after.url}) |
`
    })
    .join("\n")

  const changeList = designBrief.changes
    .map(c => `- **${c.file}**: ${c.description}`)
    .join("\n")

  return `## ✨ DesignPR — Automated UI Redesign

> ${designBrief.summary}

---

## Design Brief

**Tone:** ${designBrief.tone}
**Audience:** ${designBrief.audience}
**Key change:** ${designBrief.keyChange}

---

## Before → After

${rows}

---

## What Changed

${changeList}

---

*Generated by [DesignPR](https://designpr.app) — Turn vibe coded projects into real products.*`
}
```

### List Repos (`app/api/repos/route.ts`)

```typescript
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { Octokit } from "@octokit/rest"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "github" },
    select: { access_token: true },
  })

  if (!account?.access_token) {
    return Response.json({ error: "No GitHub token" }, { status: 400 })
  }

  const octokit = new Octokit({ auth: account.access_token })

  const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
    sort: "updated",
    per_page: 30,
    type: "owner",
  })

  return Response.json(
    repos.map(r => ({
      id: r.id,
      fullName: r.full_name,
      name: r.name,
      description: r.description,
      language: r.language,
      stargazerCount: r.stargazers_count,
      updatedAt: r.updated_at,
      isPrivate: r.private,
    }))
  )
}
```

---

## Vultr Infrastructure

### What to provision on Vultr

**1. Managed PostgreSQL**
- Create via Vultr dashboard: Databases → PostgreSQL
- Get connection string, put in `DATABASE_URL`
- Append `?sslmode=require` to the connection string — Vultr requires SSL
- Used for: users, jobs, repo history, generation logs

**2. Object Storage**
- Create via Vultr dashboard: Storage → Object Storage
- Create a bucket called `designpr-screenshots`
- Set bucket ACL to public-read (screenshots need to be embeddable in PRs)
- Used for: before/after screenshots stored as PNGs

**3. Compute Instance (for Playwright)**
- Create a $6/month VPS (1 vCPU, 1GB RAM is enough for demo)
- Ubuntu 22.04
- Run the playwright-service on it (see Playwright section)
- Open port 3001 in Vultr firewall

**4. Managed Firewall**
- Create firewall group in Vultr
- Allow: port 22 (SSH), port 3001 (Playwright service — restrict to your app IP only)
- Attach to the compute instance

**5. Load Balancer (optional for demo, nice for pitch)**
- Only needed if you want to show it in your pitch as part of the Vultr story
- Can be added without actually routing traffic during the hackathon

### Vultr Object Storage Client (`lib/vultr-storage.ts`)

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

// Vultr Object Storage is S3-compatible
const s3 = new S3Client({
  endpoint: process.env.VULTR_STORAGE_ENDPOINT,
  region: "us-east-1", // required field but ignored by Vultr
  credentials: {
    accessKeyId: process.env.VULTR_STORAGE_ACCESS_KEY!,
    secretAccessKey: process.env.VULTR_STORAGE_SECRET_KEY!,
  },
  forcePathStyle: true, // required for non-AWS S3-compatible stores
})

export async function uploadScreenshot(
  jobId: string,
  filename: string,
  buffer: Buffer
): Promise<string> {
  const key = `${jobId}/${filename}`

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.VULTR_STORAGE_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: "image/png",
      ACL: "public-read",
    })
  )

  // Return the public URL
  return `${process.env.VULTR_STORAGE_ENDPOINT}/${process.env.VULTR_STORAGE_BUCKET}/${key}`
}
```

---

## Google Cloud Vision Integration

### Setup
1. Create a Google Cloud project
2. Enable the Cloud Vision API
3. Create a service account with Vision API access, download JSON key
4. Place JSON key at `./gcp-service-account.json`
5. Set `GOOGLE_APPLICATION_CREDENTIALS=./gcp-service-account.json`

Install: `npm install @google-cloud/vision`

### Vision Analysis (`lib/vision.ts`)

```typescript
import vision from "@google-cloud/vision"
import type { VisionAnalysis, DominantColor, DetectedObject } from "./types"

const client = new vision.ImageAnnotatorClient()

export async function analyzeScreenshot(imageUrl: string): Promise<VisionAnalysis> {
  const [result] = await client.annotateImage({
    image: { source: { imageUri: imageUrl } },
    features: [
      { type: "LABEL_DETECTION", maxResults: 20 },
      { type: "TEXT_DETECTION" },
      { type: "IMAGE_PROPERTIES" },      // dominant colors
      { type: "OBJECT_LOCALIZATION" },   // detect UI elements
      { type: "WEB_DETECTION" },         // what type of site
    ],
  })

  const labels = (result.labelAnnotations ?? []).map(l => l.description ?? "")
  const text = (result.textAnnotations ?? []).map(t => t.description ?? "")
  const colors = (result.imagePropertiesAnnotation?.dominantColors?.colors ?? []) as DominantColor[]
  const objects = (result.localizedObjectAnnotations ?? []) as DetectedObject[]
  const webEntities = (result.webDetection?.webEntities ?? []).map(e => e.description ?? "")
  const pageType = inferPageType(labels, webEntities, text)

  return { labels, text, colors, objects, webEntities, pageType }
}

function inferPageType(labels: string[], webEntities: string[], text: string[]): string {
  const combined = [...labels, ...webEntities, ...text].join(" ").toLowerCase()
  if (combined.includes("dashboard") || combined.includes("analytics")) return "dashboard"
  if (combined.includes("landing") || combined.includes("hero")) return "landing page"
  if (combined.includes("login") || combined.includes("sign in")) return "auth page"
  if (combined.includes("portfolio") || combined.includes("about me")) return "portfolio"
  if (combined.includes("blog") || combined.includes("article")) return "blog"
  if (combined.includes("ecommerce") || combined.includes("shop") || combined.includes("product")) return "ecommerce"
  return "web application"
}

export function buildVisionSummary(analysis: VisionAnalysis): string {
  const colorStr = analysis.colors
    .slice(0, 3)
    .map(c => `rgb(${c.color?.red ?? 0},${c.color?.green ?? 0},${c.color?.blue ?? 0})`)
    .join(", ")

  return [
    `Page type: ${analysis.pageType}`,
    `UI elements detected: ${analysis.objects.map(o => o.name).join(", ")}`,
    `Dominant colors: ${colorStr}`,
    `Text content includes: ${analysis.text.slice(0, 5).join(", ")}`,
    `Design labels: ${analysis.labels.slice(0, 10).join(", ")}`,
  ].join("\n")
}
```

**Critical:** Pass the Vision analysis output to the Brief Agent and Critic Agent. The Vision data tells the agents what the current UI actually looks like structurally, not just what the code says.

---

## Backboard Agent Pipeline

### What Backboard does here
Backboard manages state across all five agents. Each agent reads from and writes to a shared thread. This means Agent 4 (Critic) automatically has access to what Agent 2 (Brief) decided — you don't manually wire context between steps.

Install: `npm install @backboard/sdk` (check backboard.io docs for the current package name)

### Pipeline / Thread Client (`lib/backboard.ts`)

```typescript
// NOTE: Replace with actual Backboard SDK import once you have the package name.
// The interface below matches the expected API from Backboard docs.
// If the SDK isn't available yet, use the REST API directly.

interface BackboardThread {
  id: string
  metadata: Record<string, unknown>
}

interface BackboardClient {
  threads: {
    create: (opts: { id: string; metadata: Record<string, unknown> }) => Promise<BackboardThread>
    setData: (threadId: string, key: string, value: unknown) => Promise<void>
    getData: (threadId: string, key: string) => Promise<unknown>
  }
  agents: {
    run: (opts: { threadId: string; agent: string; input: Record<string, unknown> }) => Promise<unknown>
  }
}

// Instantiate once and export for use in pipeline.ts
function createBackboardClient(): BackboardClient {
  const BASE = "https://api.backboard.io/v1"
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.BACKBOARD_API_KEY}`,
    "X-Org-Id": process.env.BACKBOARD_ORG_ID!,
  }

  return {
    threads: {
      async create({ id, metadata }) {
        const res = await fetch(`${BASE}/threads`, {
          method: "POST",
          headers,
          body: JSON.stringify({ id, metadata }),
        })
        return res.json()
      },
      async setData(threadId, key, value) {
        await fetch(`${BASE}/threads/${threadId}/data/${key}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ value }),
        })
      },
      async getData(threadId, key) {
        const res = await fetch(`${BASE}/threads/${threadId}/data/${key}`, { headers })
        const body = await res.json()
        return body.value
      },
    },
    agents: {
      async run({ threadId, agent, input }) {
        const res = await fetch(`${BASE}/agents/run`, {
          method: "POST",
          headers,
          body: JSON.stringify({ threadId, agent, input }),
        })
        return res.json()
      },
    },
  }
}

// Singleton instance — import `bb` anywhere in the pipeline
export const bb = createBackboardClient()

export async function createDesignPRPipeline(jobId: string) {
  return bb.threads.create({ id: jobId, metadata: { jobId } })
}
```

### Job Creation Route (`app/api/jobs/create/route.ts`)

```typescript
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { createDesignPRPipeline } from "@/lib/backboard"
import { runPipeline } from "@/lib/pipeline"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { repoFullName, userNote } = await req.json()
  if (!repoFullName || typeof repoFullName !== "string") {
    return Response.json({ error: "repoFullName is required" }, { status: 400 })
  }

  // 1. Create job record
  const job = await prisma.job.create({
    data: {
      userId: session.user.id,
      repoFullName,
      userNote: userNote ?? null,
      status: "pending",
    },
  })

  // 2. Create Backboard thread for shared agent state
  await createDesignPRPipeline(job.id)

  // 3. Kick off the pipeline without awaiting — return job ID immediately
  // The frontend will poll /api/jobs/[jobId] to track progress.
  const githubAccessToken = session.user.githubAccessToken ?? ""
  runPipeline(job.id, repoFullName, userNote ?? "", githubAccessToken).catch(err => {
    console.error(`[Pipeline ${job.id}] fatal error:`, err)
    prisma.job
      .update({ where: { id: job.id }, data: { status: "failed", currentStep: "Error" } })
      .catch(() => {})
  })

  return Response.json({ jobId: job.id }, { status: 201 })
}
```

---

## The Agent Prompts

**This section is the most important in the entire document. The quality of these prompts determines whether you win or lose.**

### OpenAI GPT-4o Helper (`lib/openai.ts`)

Install: `npm install openai`

```typescript
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function callGPT4o(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 8192,
    temperature: 0.4,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    // Ask the model to return JSON directly — prevents code-fence wrapping
    response_format: { type: "json_object" },
  })

  const text = response.choices[0].message.content ?? ""
  return text.trim()
}

// Typed JSON wrapper — parse and validate the response
export async function callGPT4oJSON<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  const raw = await callGPT4o(systemPrompt, userPrompt)
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new Error(`GPT-4o returned non-JSON: ${raw.slice(0, 200)}`)
  }
}
```

> **Note on `response_format: { type: "json_object" }`:** This forces GPT-4o to return valid JSON with no markdown fences. It requires the word "JSON" to appear somewhere in your prompt (the agent prompts below all include it). Do not use this flag on the free tier — it requires at least Tier 1.

### Gemma 4 Helper (`lib/gemma.ts`)

```typescript
export async function callGemma4(prompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
        },
      }),
    }
  )

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemma API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  const text: string = data.candidates[0].content.parts[0].text
  return text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim()
}

// Typed JSON wrapper
export async function callGemma4JSON<T>(prompt: string): Promise<T> {
  const raw = await callGemma4(prompt)
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new Error(`Gemma returned non-JSON: ${raw.slice(0, 200)}`)
  }
}
```

### Agent 1: Analyzer (uses Gemma 4 — fast, cheap)

```typescript
// lib/agents/analyzer.ts
import { callGemma4JSON } from "@/lib/gemma"
import type { RepoFile, RepoAnalysis } from "@/lib/types"

export async function runAnalyzer(
  repoContents: RepoFile[],
  visionSummary: string
): Promise<RepoAnalysis> {
  const fileBlock = repoContents
    .map(f => `--- ${f.path} ---\n${f.content}`)
    .join("\n\n")

  const prompt = `
You are a senior frontend engineer analyzing a codebase to understand its UI structure.

REPOSITORY FILES:
${fileBlock}

VISUAL ANALYSIS (from Google Cloud Vision screenshot analysis):
${visionSummary}

Analyze this codebase and return a JSON object with:
{
  "framework": "next.js" | "react" | "vue" | "html",
  "stylingApproach": "tailwind" | "css-modules" | "styled-components" | "plain-css",
  "uiLibrary": "shadcn" | "mui" | "chakra" | "none",
  "pages": [{ "path": string, "file": string, "description": string }],
  "components": [{ "name": string, "file": string, "type": "layout" | "ui" | "page" }],
  "uiFiles": [string],
  "hasAnimations": boolean,
  "hasCustomStyling": boolean,
  "vibeCodedIndicators": [string]
}

Return ONLY the JSON object, no other text.
`

  return callGemma4JSON<RepoAnalysis>(prompt)
}
```

### Agent 2: Brief Generator (uses Gemma 4 — fast, cheap)

```typescript
// lib/agents/brief.ts
import { callGemma4JSON } from "@/lib/gemma"
import type { RepoAnalysis, DesignBrief } from "@/lib/types"

export async function runBriefGenerator(
  analysis: RepoAnalysis,
  visionSummary: string,
  userNote: string
): Promise<DesignBrief> {
  const prompt = `
You are a senior product designer generating a design brief for a UI redesign.

APP ANALYSIS:
${JSON.stringify(analysis, null, 2)}

VISUAL ANALYSIS:
${visionSummary}

USER CONTEXT:
"${userNote}"

Generate a design brief that will guide a complete UI redesign. Return JSON:
{
  "appType": string,
  "targetAudience": string,
  "audience": string,
  "tone": string,
  "colorDirection": string,
  "typographyDirection": string,
  "layoutPrinciples": [string],
  "animationStyle": string,
  "keyChange": string,
  "avoidPatterns": [string],
  "summary": string,
  "changes": [{ "file": string, "description": string }]
}

Return ONLY the JSON object.
`

  return callGemma4JSON<DesignBrief>(prompt)
}
```

### Agent 3: Redesign Agent (uses GPT-4o — most important agent)

```typescript
// lib/agents/redesign.ts
import { callGPT4oJSON } from "@/lib/openai"
import type { RepoFile, DesignBrief, RepoAnalysis, FileChange } from "@/lib/types"

const ANTI_PATTERN_BLACKLIST = `
ANTI-PATTERN BLACKLIST — NEVER DO ANY OF THESE:
1. Never use default Shadcn/UI gray color scheme (#f4f4f5, #e4e4e7, #a1a1aa)
2. Never apply the same border-radius to every element (e.g. rounded-lg everywhere)
3. Never stack multiple buttons of the same color next to each other
4. Never use Inter font at default weight (400) for headings — use bold weights or different fonts
5. Never use generic gradient: "from-blue-500 to-purple-500" or similar cliché gradients
6. Never center-align every single element on the page
7. Never use the default Tailwind slate gray (#64748b) as primary text color
8. Never use placeholder icons (generic squares) — use real lucide-react icons
9. Never add a component without considering hover state
10. Never use padding less than p-4 (16px) for card interiors — go generous
11. Never have zero animations — every interactive element needs a transition
12. Never use font-size below text-sm for body content
13. Never use opacity-50 as the only visual distinction for disabled states
14. Never stack more than 2 font weights without clear visual purpose
15. Never use justify-content: center for a navbar — use space-between with real nav items
`

export async function runRedesign(
  fileContents: RepoFile[],
  brief: DesignBrief,
  analysis: RepoAnalysis
): Promise<FileChange[]> {
  const systemPrompt = `
You are an elite frontend engineer and designer with taste as sharp as Linear, Vercel, and Stripe.
You write production-quality React/Next.js code that looks like it was built by a design-obsessed team.

${ANTI_PATTERN_BLACKLIST}

DESIGN PRINCIPLES YOU ALWAYS FOLLOW:
- Typography creates hierarchy: use at least 3 distinct type sizes with purpose
- Whitespace is your most powerful tool — be generous
- Every interactive element has a hover state and transition
- Animations should feel physical: use ease-out for entrances, ease-in for exits
- Color should have meaning: one accent, supporting neutrals, semantic states
- Components should feel custom even when built on primitives
- Use Framer Motion for React animations — import { motion } from "framer-motion"
- Scroll-triggered reveals using Framer Motion's whileInView prop
- Micro-interactions on buttons: scale(0.97) on press, slight lift on hover
- Cards should have subtle shadows that intensify on hover

TECHNICAL RULES:
- Preserve all functionality — only change visual/styling code
- Keep all imports that are needed
- Use the same framework and styling approach as the original (Tailwind, CSS modules, etc.)
- Do not change API calls, data fetching, or business logic
- You may add new imports for animation libraries if needed
- Return the complete file content for every file you change
`

  const userPrompt = `
DESIGN BRIEF:
${JSON.stringify(brief, null, 2)}

CURRENT CODE FILES TO REDESIGN:
${fileContents.map(f => `=== FILE: ${f.path} ===\n${f.content}`).join("\n\n")}

Redesign these files according to the design brief. Apply real design taste.

Return a JSON array of file changes:
[
  {
    "path": "relative/path/to/file.tsx",
    "content": "complete new file content here"
  }
]

Return ONLY the JSON array. No explanation. Complete file content only.
`

  return callGPT4oJSON<FileChange[]>(systemPrompt, userPrompt)
}
```

### Agent 4: Critic Agent (uses GPT-4o)

```typescript
// lib/agents/critic.ts
import { callGPT4oJSON } from "@/lib/openai"
import type { FileChange, DesignBrief, CritiqueResult } from "@/lib/types"

export async function runCritic(
  fileChanges: FileChange[],
  brief: DesignBrief,
  afterVisionSummary: string
): Promise<CritiqueResult> {
  const systemPrompt = `
You are a brutally honest senior product designer doing a design review.
Your job is to identify anything in the redesigned code that still looks AI-generated, generic, or lazy.
You are reviewing code that was just redesigned. Be specific. Be harsh. Be actionable.
`

  const userPrompt = `
DESIGN BRIEF (what we were aiming for):
${JSON.stringify(brief, null, 2)}

REDESIGNED CODE:
${fileChanges.map(f => `=== ${f.path} ===\n${f.content}`).join("\n\n")}

VISUAL ANALYSIS OF THE REDESIGNED OUTPUT (what Google Cloud Vision sees):
${afterVisionSummary}

Review the redesigned code against the brief and the anti-pattern list.

Return JSON:
{
  "passedReview": boolean,
  "score": number,
  "issues": [
    {
      "file": string,
      "issue": string,
      "fix": string
    }
  ],
  "positives": [string]
}

Be honest. If score >= 8 and no critical issues, set passedReview to true.
Return ONLY the JSON.
`

  return callGPT4oJSON<CritiqueResult>(systemPrompt, userPrompt)
}
```

### Agent 5: Reviser Agent (uses GPT-4o)

```typescript
// lib/agents/reviser.ts
import { callGPT4oJSON } from "@/lib/openai"
import type { FileChange, CritiqueResult } from "@/lib/types"

export async function runReviser(
  fileChanges: FileChange[],
  critique: CritiqueResult
): Promise<FileChange[]> {
  // If the critic passed it, skip revision entirely
  if (critique.passedReview) return fileChanges

  const systemPrompt = `
You are an elite frontend engineer applying specific design fixes identified by a design review.
Apply ONLY the fixes listed. Do not change anything not mentioned in the issues list.
Preserve all functionality.
`

  const issueBlock = critique.issues
    .map(i => `File: ${i.file}\nIssue: ${i.issue}\nFix: ${i.fix}`)
    .join("\n\n")

  const userPrompt = `
ISSUES TO FIX:
${issueBlock}

CURRENT CODE:
${fileChanges.map(f => `=== ${f.path} ===\n${f.content}`).join("\n\n")}

Apply all fixes and return the updated files as a JSON array:
[{ "path": string, "content": string }]

Return ONLY the JSON array.
`

  return callGPT4oJSON<FileChange[]>(systemPrompt, userPrompt)
}
```

---

## Playwright Screenshot System

The Playwright service runs on your Vultr compute instance as a separate Express server. Your Next.js app calls it via HTTP.

### Setup on Vultr VPS

```bash
# SSH into Vultr compute instance
ssh root@your-vultr-ip

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install playwright service dependencies
mkdir /opt/designpr-playwright && cd /opt/designpr-playwright
npm init -y
npm install playwright express
npx playwright install chromium
npx playwright install-deps chromium

# Copy your playwright-service files here (scp or git clone)

# Run with PM2 for persistence across reboots
npm install -g pm2
pm2 start dist/index.js --name designpr-playwright
pm2 save
pm2 startup   # follow the printed command to enable on reboot
```

### Playwright Service `package.json`

```json
{
  "name": "designpr-playwright-service",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node index.ts"
  },
  "dependencies": {
    "express": "^4.19.2",
    "playwright": "^1.45.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.14.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.5.0"
  }
}
```

### Playwright Service (`playwright-service/index.ts`)

```typescript
import express from "express"
import { takeScreenshots } from "./screenshot"

const app = express()
app.use(express.json({ limit: "10mb" }))

// Auth middleware — reject requests without the shared secret
app.use((req, res, next) => {
  const secret = req.headers["x-service-secret"]
  if (secret !== process.env.PLAYWRIGHT_SERVICE_SECRET) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  next()
})

app.get("/health", (_req, res) => res.json({ ok: true }))

app.post("/screenshot", async (req, res) => {
  const { url, jobId, type } = req.body as {
    url: string
    jobId: string
    type: "before" | "after"
  }

  if (!url || !jobId || !type) {
    return res.status(400).json({ error: "url, jobId, and type are required" })
  }

  try {
    const screenshots = await takeScreenshots(url, jobId, type)
    // Return buffers as base64 strings so they travel over HTTP cleanly
    res.json({
      screenshots: screenshots.map(s => ({
        name: s.name,
        data: s.buffer.toString("base64"),
      })),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[screenshot]", message)
    res.status(500).json({ error: message })
  }
})

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => console.log(`Playwright service running on port ${PORT}`))
```

### Screenshot Logic (`playwright-service/screenshot.ts`)

```typescript
import { chromium } from "playwright"
import type { ScreenshotResult } from "../lib/types"

export async function takeScreenshots(
  url: string,
  _jobId: string,
  type: "before" | "after"
): Promise<ScreenshotResult[]> {
  const browser = await chromium.launch({ headless: true })
  const results: ScreenshotResult[] = []

  try {
    // Desktop screenshot (1440×900)
    const desktopPage = await browser.newPage()
    await desktopPage.setViewportSize({ width: 1440, height: 900 })
    await desktopPage.goto(url, { waitUntil: "networkidle", timeout: 30_000 })
    await desktopPage.waitForTimeout(2000) // let animations settle

    const desktopBuffer = await desktopPage.screenshot({ fullPage: true, type: "png" })
    results.push({ name: `${type}-desktop`, buffer: Buffer.from(desktopBuffer) })
    await desktopPage.close()

    // Mobile screenshot (390×844 — iPhone 14 Pro viewport)
    const mobilePage = await browser.newPage()
    await mobilePage.setViewportSize({ width: 390, height: 844 })
    await mobilePage.goto(url, { waitUntil: "networkidle", timeout: 30_000 })
    await mobilePage.waitForTimeout(2000)

    const mobileBuffer = await mobilePage.screenshot({ fullPage: true, type: "png" })
    results.push({ name: `${type}-mobile`, buffer: Buffer.from(mobileBuffer) })
    await mobilePage.close()
  } finally {
    await browser.close()
  }

  return results
}
```

### Triggering Screenshots from Next.js (`lib/screenshot.ts`)

```typescript
import { uploadScreenshot } from "./vultr-storage"

interface RemoteScreenshot {
  name: string
  data: string // base64 encoded PNG
}

export async function captureScreenshots(
  deployedUrl: string,
  jobId: string,
  type: "before" | "after"
): Promise<string[]> {
  const response = await fetch(`${process.env.PLAYWRIGHT_SERVICE_URL}/screenshot`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-service-secret": process.env.PLAYWRIGHT_SERVICE_SECRET!,
    },
    body: JSON.stringify({ url: deployedUrl, jobId, type }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Playwright service error ${response.status}: ${err}`)
  }

  const { screenshots } = (await response.json()) as { screenshots: RemoteScreenshot[] }

  // Upload each screenshot to Vultr Object Storage and return public URLs
  return Promise.all(
    screenshots.map(s => {
      const buffer = Buffer.from(s.data, "base64")
      return uploadScreenshot(jobId, `${s.name}.png`, buffer)
    })
  )
}
```

---

## Deployment Helpers

The pipeline needs a live URL to pass to Playwright. The two approaches are:

### Option A — Vercel Preview Deploys (recommended for hackathon speed)

```typescript
// lib/deploy-helper.ts
import type { RepoFile, FileChange } from "./types"

// Deploy original repo files to a Vercel preview deploy and return the URL
export async function deployForScreenshot(
  repoFiles: RepoFile[],
  jobId: string
): Promise<string> {
  return deployToVercel(repoFiles, jobId, "before")
}

// Deploy the redesigned version (original files with changes applied on top)
export async function deployRedesignedForScreenshot(
  repoFiles: RepoFile[],
  changes: FileChange[],
  jobId: string
): Promise<string> {
  // Merge: original files overwritten by agent's changed files
  const changedPaths = new Set(changes.map(c => c.path))
  const mergedFiles: RepoFile[] = [
    ...repoFiles.filter(f => !changedPaths.has(f.path)),
    ...changes.map(c => ({ path: c.path, content: c.content, encoding: "utf-8" as const, size: c.content.length })),
  ]
  return deployToVercel(mergedFiles, jobId, "after")
}

async function deployToVercel(
  files: RepoFile[],
  jobId: string,
  suffix: string
): Promise<string> {
  const VERCEL_TOKEN = process.env.VERCEL_TOKEN!
  const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID // optional

  const payload = {
    name: `designpr-${jobId.slice(0, 8)}-${suffix}`,
    files: files.map(f => ({
      file: f.path,
      data: f.content,
    })),
    projectSettings: {
      framework: "nextjs",
    },
    ...(VERCEL_TEAM_ID ? { teamId: VERCEL_TEAM_ID } : {}),
  }

  const res = await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Vercel deploy failed: ${err}`)
  }

  const deployment = await res.json()

  // Poll until deployment is ready (max 3 minutes)
  return waitForDeployment(deployment.id, VERCEL_TOKEN)
}

async function waitForDeployment(deploymentId: string, token: string): Promise<string> {
  const MAX_ATTEMPTS = 36 // 36 × 5s = 3 minutes
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    await new Promise(r => setTimeout(r, 5000))

    const res = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()

    if (data.readyState === "READY") {
      return `https://${data.url}`
    }
    if (data.readyState === "ERROR" || data.readyState === "CANCELED") {
      throw new Error(`Vercel deployment ${deploymentId} failed: ${data.readyState}`)
    }
  }

  throw new Error(`Vercel deployment ${deploymentId} timed out after 3 minutes`)
}
```

### Option B — Serve locally from Playwright VPS (more Vultr usage for the pitch)

For a stronger Vultr story: instead of Vercel, ship the repo files to the Playwright service, have it `npm install && npm run build && npm start` in a temp directory, take screenshots at `localhost:PORT`, then clean up. Add this endpoint to the Playwright service:

```typescript
// playwright-service/local-deploy.ts  (add to the service)
import { execSync } from "child_process"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"

export async function serveLocally(
  files: Array<{ path: string; content: string }>,
  port: number
): Promise<() => void> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "designpr-"))

  for (const file of files) {
    const dest = path.join(tmpDir, file.path)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, file.content, "utf-8")
  }

  execSync("npm install --prefer-offline", { cwd: tmpDir, stdio: "pipe" })
  execSync("npm run build", { cwd: tmpDir, stdio: "pipe" })

  const child = require("child_process").spawn("npm", ["start", "--", "-p", String(port)], {
    cwd: tmpDir,
    detached: true,
    stdio: "ignore",
  })
  child.unref()

  // Give the server 5 seconds to start
  await new Promise(r => setTimeout(r, 5000))

  // Return cleanup function
  return () => {
    try { process.kill(-child.pid) } catch {}
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}
```

---

## PR Creation

See `lib/github.ts` above for the full `openDesignPR` implementation.

### Full Pipeline Orchestrator (`lib/pipeline.ts`)

```typescript
import { prisma } from "./prisma"
import { bb } from "./backboard"
import { fetchRepoFiles } from "./github"
import { analyzeScreenshot, buildVisionSummary } from "./vision"
import { captureScreenshots } from "./screenshot"
import { deployForScreenshot, deployRedesignedForScreenshot } from "./deploy-helper"
import { runAnalyzer } from "./agents/analyzer"
import { runBriefGenerator } from "./agents/brief"
import { runRedesign } from "./agents/redesign"
import { runCritic } from "./agents/critic"
import { runReviser } from "./agents/reviser"
import { openDesignPR } from "./github"
import { withRetry } from "./retry"
import type { FileChange } from "./types"

export async function runPipeline(
  jobId: string,
  repoFullName: string,
  userNote: string,
  githubAccessToken: string
) {
  const [owner, repo] = repoFullName.split("/")

  const updateStatus = (status: string, step: string) =>
    prisma.job.update({ where: { id: jobId }, data: { status, currentStep: step } })

  try {
    // ── STEP 1: Clone and read repo files ───────────────────────────────
    await updateStatus("running", "Cloning repository")
    const repoFiles = await withRetry(() => fetchRepoFiles(owner, repo, githubAccessToken))

    // ── STEP 2: Capture BEFORE screenshots ──────────────────────────────
    await updateStatus("running", "Capturing current UI screenshots")
    const deployedUrl = await deployForScreenshot(repoFiles, jobId)
    const beforeScreenshotUrls = await captureScreenshots(deployedUrl, jobId, "before")

    await prisma.job.update({
      where: { id: jobId },
      data: { beforeScreenshots: beforeScreenshotUrls },
    })

    // ── STEP 3: Google Cloud Vision — analyze BEFORE screenshots ────────
    await updateStatus("running", "Analyzing with Google Cloud Vision")
    const visionResults = await Promise.all(
      beforeScreenshotUrls.map(url => withRetry(() => analyzeScreenshot(url)))
    )
    const visionSummary = visionResults.map(buildVisionSummary).join("\n\n")

    // ── STEP 4: Analyzer Agent (Gemma 4) ────────────────────────────────
    await updateStatus("running", "Analyzing codebase structure")
    const analysis = await withRetry(() => runAnalyzer(repoFiles, visionSummary))
    await bb.threads.setData(jobId, "repo_analysis", analysis)

    // ── STEP 5: Brief Generator Agent (Gemma 4) ─────────────────────────
    await updateStatus("running", "Generating design brief")
    const brief = await withRetry(() => runBriefGenerator(analysis, visionSummary, userNote))
    await bb.threads.setData(jobId, "design_brief", brief)

    // ── STEP 6: Redesign Agent (GPT-4o) ────────────────────────────────
    await updateStatus("running", "Redesigning UI components")
    const uiFiles = repoFiles.filter(f => analysis.uiFiles.includes(f.path))
    const fileChanges: FileChange[] = await withRetry(
      () => runRedesign(uiFiles, brief, analysis),
      { maxAttempts: 2, delayMs: 3000 } // GPT-4o is expensive — only retry once
    )
    await bb.threads.setData(jobId, "file_changes", fileChanges)

    // ── STEP 7: Capture AFTER screenshots ───────────────────────────────
    await updateStatus("running", "Rendering redesigned output")
    const redesignedUrl = await deployRedesignedForScreenshot(repoFiles, fileChanges, jobId)
    const afterScreenshotUrls = await captureScreenshots(redesignedUrl, jobId, "after")

    await prisma.job.update({
      where: { id: jobId },
      data: { afterScreenshots: afterScreenshotUrls },
    })

    // ── STEP 8: Vision analysis of AFTER screenshots ────────────────────
    await updateStatus("running", "Running design critique")
    const afterVisionResults = await Promise.all(
      afterScreenshotUrls.map(url => withRetry(() => analyzeScreenshot(url)))
    )
    const afterVisionSummary = afterVisionResults.map(buildVisionSummary).join("\n\n")

    // ── STEP 9: Critic Agent (GPT-4o) ───────────────────────────────────
    const critique = await withRetry(() => runCritic(fileChanges, brief, afterVisionSummary))
    await bb.threads.setData(jobId, "critique", critique)

    // ── STEP 10: Reviser Agent if needed (GPT-4o) ────────────────────────
    let finalChanges = fileChanges
    if (!critique.passedReview) {
      await updateStatus("running", "Applying revisions")
      finalChanges = await withRetry(
        () => runReviser(fileChanges, critique),
        { maxAttempts: 2, delayMs: 3000 }
      )
    }

    // ── STEP 11: Open GitHub PR ──────────────────────────────────────────
    await updateStatus("running", "Opening pull request")
    const branchName = `designpr/${jobId.slice(0, 8)}`
    const prUrl = await withRetry(() =>
      openDesignPR({
        accessToken: githubAccessToken,
        owner,
        repo,
        branchName,
        beforeScreenshots: beforeScreenshotUrls.map((url, i) => ({
          url,
          pageName: `View ${i + 1}`,
        })),
        afterScreenshots: afterScreenshotUrls.map((url, i) => ({
          url,
          pageName: `View ${i + 1}`,
        })),
        designBrief: brief,
        changes: finalChanges,
      })
    )

    // ── STEP 12: Mark job complete ───────────────────────────────────────
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "completed",
        currentStep: "Done",
        afterScreenshots: afterScreenshotUrls,
        prUrl,
        designBrief: brief,
      },
    })
  } catch (err) {
    await updateStatus("failed", "Error")
    throw err
  }
}
```

---

## Database Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  jobs          Job[]
  createdAt     DateTime  @default(now())
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text  // GitHub OAuth access token — used by pipeline
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Job {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])
  repoFullName      String   // "owner/repo"
  userNote          String?
  status            String   @default("pending")  // pending | running | completed | failed
  currentStep       String?
  beforeScreenshots String[] // Vultr Object Storage public URLs
  afterScreenshots  String[] // Vultr Object Storage public URLs
  prUrl             String?
  designBrief       Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([userId])
  @@index([status])
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

---

## API Routes

### Job Status (`app/api/jobs/[jobId]/route.ts`)

```typescript
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: Request,
  { params }: { params: { jobId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const job = await prisma.job.findUnique({
    where: { id: params.jobId, userId: session.user.id },
  })

  if (!job) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  return Response.json(job)
}
```

---

## Error Handling & Retry Utilities

### Retry Helper (`lib/retry.ts`)

All agent and external API calls should be wrapped with this so transient failures (rate limits, network blips) don't kill the whole pipeline.

```typescript
interface RetryOptions {
  maxAttempts?: number
  delayMs?: number
  backoffMultiplier?: number
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxAttempts = 3, delayMs = 1500, backoffMultiplier = 2 } = options

  let lastError: unknown
  let currentDelay = delayMs

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt === maxAttempts) break

      console.warn(`[retry] Attempt ${attempt}/${maxAttempts} failed. Retrying in ${currentDelay}ms...`, err)
      await new Promise(r => setTimeout(r, currentDelay))
      currentDelay *= backoffMultiplier
    }
  }

  throw lastError
}

// Safe JSON parse — returns null instead of throwing
export function safeParseJSON<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}
```

---

## Demo Flow

**This is the exact sequence to practice for stage:**

1. Open the app live — judges see the landing page. It looks stunning.
2. "Let me connect a GitHub repo." — GitHub OAuth in one click.
3. Select a pre-prepared vibe coded repo. Add note: "A SaaS analytics dashboard."
4. Hit "Run DesignPR."
5. Show the job progress page — agents ticking through steps in real time.
6. While it runs, explain what each agent is doing.
7. PR appears on GitHub. Open it.
8. Show the before/after screenshots in the PR description.
9. "Let's merge it." Hit merge.
10. Done.

**Pre-bake a demo repo for stage.** Do not use a random real repo. Build a deliberately ugly vibe coded Next.js app with all the anti-patterns (default Shadcn, gray everything, no animations, poor typography) and use that. You control the before. Make it as ugly as possible so the after hits hard.

---

## Critical Notes

**The prompt is the product.** Spend the first 8-10 hours iterating on the redesign agent system prompt until the before/after difference is genuinely shocking. Everything else is plumbing.

**Run the full pipeline end-to-end first, ugly.** Get a PR opening with any output at all before worrying about design quality. Then improve the prompts.

**Do not use 21st.dev Magic MCP at runtime.** Use it during your build for inspiration. Bake the patterns into your prompt. Remove the runtime dependency.

**The demo app has to be ugly on purpose.** Build a fake SaaS dashboard that violates every anti-pattern. Gray backgrounds, default Shadcn components, Inter at 400 weight, no animations, cramped spacing. Make judges wince when they see the before.

**Your own app UI must be exceptional.** You are entering Best UI/UX. Your landing page is judged. Do not let it look vibe coded. Use distinctive fonts, strong animations, generous spacing. Eat your own cooking.

**Fix the PR body template literal bug (was in original).** The original guide had `` `afterScreenshots[i].url}` `` (missing `${`). This is fixed in the `buildPRBody` function above — always access `afterScreenshots[i]` via a named variable before the template literal.

**Backboard SDK availability.** If the Backboard npm package isn't published yet when you're building, the REST client in `lib/backboard.ts` above is a drop-in replacement that works against their API directly. Swap it for the SDK once available.

**`forcePathStyle: true` on Vultr S3 client.** Without this flag, the AWS SDK will construct path-style URLs incorrectly for non-AWS endpoints and all uploads will 404. This is in `lib/vultr-storage.ts` above.

**Vultr story for the pitch:** "Every agent run happens on Vultr. The screenshots are taken by a headless browser running on Vultr compute. Every image is stored on Vultr Object Storage. Every job is tracked in our Vultr Postgres database. When multiple users run jobs simultaneously, Vultr's load balancer distributes the work. This is production infrastructure, not a laptop project."

**Backboard story for the pitch:** "Backboard manages the shared memory across all five agents. The design brief created in step 2 is automatically available to the critique agent in step 4 — no manual context passing. If we wanted to add a sixth agent, we just add it to the thread."

**Google Cloud Vision story for the pitch:** "Vision API is the eyes of the entire system. It tells our agents what the UI actually looks like — not what the code says it should look like. It detects the real color palette, identifies UI elements, understands the layout structure. Without Vision, our critique agent is flying blind."

**Gemma 4 story for the pitch:** "We use Gemma 4 for the lightweight analysis steps and GPT-4o for the creative reasoning steps. Not every part of the pipeline needs a frontier model. Routing intelligently keeps costs down and speed up."
