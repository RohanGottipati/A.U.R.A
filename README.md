# A.U.R.A – Automated UI Redesign Assistant

A Next.js 14 App Router web app where users connect a GitHub repo, the backend fetches UI files, runs an AI redesign pipeline, and eventually opens a GitHub PR with the results.

## Tech Stack

- **Framework** – Next.js 14 (App Router)
- **Language** – TypeScript
- **Styling** – Tailwind CSS + Framer Motion
- **Database** – PostgreSQL via Prisma
- **Auth** – NextAuth with GitHub OAuth + Prisma adapter
- **GitHub API** – Octokit
- **AI** – OpenAI SDK, Google Gemini (via fetch)
- **Storage** – Vultr Object Storage (S3-compatible, via `@aws-sdk/client-s3`)

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in your values
cp .env.local.example .env.local

# 3. Generate Prisma client (requires DATABASE_URL in .env.local)
npx prisma generate

# 4. Run database migrations
npx prisma db push

# 5. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
app/
  api/
    health/route.ts        # Health-check endpoint
    jobs/route.ts          # POST to create a job, GET to list jobs
    jobs/[jobId]/route.ts  # GET a single job
  dashboard/page.tsx       # Dashboard – list jobs, start new runs
  run/[jobId]/page.tsx     # Real-time pipeline progress view
  layout.tsx               # Root layout
  page.tsx                 # Landing page

lib/
  agents/index.ts          # AI agent barrel export (placeholder)
  pipeline.ts              # Pipeline step definitions & runner skeleton
  prisma.ts                # PrismaClient singleton
  types.ts                 # Shared TypeScript types

prisma/
  schema.prisma            # Database schema (User, Account, Session, Job)

types/
  next-auth.d.ts           # NextAuth module augmentation
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Phase 1 (this PR)

Sets up the base project structure and placeholder files so that all team members can start building in parallel:

- **Person B** – Wire up GitHub OAuth, NextAuth config, and the Prisma adapter.
- **Person C** – Implement the pipeline agents (`lib/agents/`) and `runPipeline` logic.
- **Person D** – Build the screenshot/Vision analysis step and S3 upload.

## License

Private – for internal use only.
