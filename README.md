# A.U.R.A

**Architectural Understanding & Rendering Agent** — upload a floor plan image, describe your use case in plain English, and walk through a fully configured 3D scene.

Originally built as "FloorPlan AI" at BearHacks (the npm package is still named `floorplan-ai`).

## Features

- **Floor plan → 3D scene.** Upload a JPG, PNG, or WebP floor plan (max 10 MB) plus a 10–500 character use case (e.g. *"hackathon with hacking stations along the walls and a stage at the front"*). A three-stage AI pipeline extracts the geometry, places objects, and assembles a 3D scene.
- **Live progress.** The processing page polls the job and shows each pipeline step until the scene is ready.
- **Interactive 3D viewer.** Orbit and first-person walk modes, a sidebar with the object list, add/delete objects, an inspector for editing the selected object, and undo (Ctrl/Cmd+Z).
- **Save & share.** Edited scenes are saved as new scenes with a shareable URL.
- **Bring your own Gemini key.** The landing page lets visitors store their own Gemini API key in `localStorage`; the upload form sends it with the request and the pipeline uses it instead of the server key.
- **Result caching.** Re-uploading the same image with the same use case reuses the previously generated scene (SHA-256 image hash).
- **Scripted demo.** Uploading a file named `Test.webp` (the image in `public/Test.webp`) skips the AI pipeline and returns a pre-built scene from `lib/demo-scene.ts` — no database, storage, or Gemini calls.
- **Landing page.** Scroll-driven landing page with an embedded YouTube demo video, a waitlist modal, and the Gemini key modal.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| 3D rendering | Three.js |
| Styling / animation | Tailwind CSS, Framer Motion |
| UI primitives | Radix UI Dialog, Lucide React |
| AI vision + language | Google Gemini (`gemini-2.5-flash` by default) via `@google/generative-ai` |
| Agent orchestration | Backboard API |
| Database | PostgreSQL (Vultr Managed) via `pg` |
| File storage | Vultr Object Storage (S3-compatible) via `@aws-sdk/client-s3` |
| Hosting | Vercel (production: https://aura-bay-nu.vercel.app) or a Vultr VPS with PM2 + Nginx (`deploy/`) |

## AI Pipeline

`POST /api/upload` stores the image in Object Storage, creates a job in PostgreSQL, and runs the pipeline asynchronously (`lib/backboard.ts`):

1. **Agent 1 — Geometry extraction** (`lib/agents/agent1-geometry.ts`): sends the floor plan image directly to Gemini Vision and returns structured JSON for rooms, walls, doors, and dimensions.
2. **Agent 2 — Object placement** (`lib/agents/agent2-placement.ts`): turns the geometry and use case into a placement plan. It uses Backboard first, falls back to direct Gemini, then to a rule-based planner (`lib/agents/fallback.ts`). With a user-supplied key it skips Backboard and calls Gemini directly.
3. **Agent 3 — Scene assembly** (`lib/agents/agent3-assembly.ts`): plain TypeScript, no LLM. Clamps sizes, resolves placements (`lib/placement-resolver.ts`), and validates/normalizes everything into the final `SceneFile` (`types/scene.ts`).

The finished scene JSON is uploaded to Object Storage and its metadata saved to PostgreSQL.

## Project Structure

```
app/
  page.tsx                      # Landing page
  upload/page.tsx               # Upload form
  processing/[jobId]/page.tsx   # Pipeline progress
  scene/[sceneId]/page.tsx      # 3D viewer
  api/
    upload/route.ts             # POST: floor plan + use case -> { jobId }
    job/[jobId]/route.ts        # GET: job status / progress
    scene/[sceneId]/route.ts    # GET: scene JSON
    scene/save/route.ts         # POST: save an edited scene
    health/route.ts             # GET: health check
components/
  UploadForm.tsx, ProgressTracker.tsx
  SceneViewer.tsx, SceneSidebar.tsx, ThreeScene.tsx, objectMeshes.ts
  landing/                      # ScrollSimulation, Sections, Waitlist/DemoVideo/GeminiKey modals
  ui/dialog.tsx                 # Radix Dialog wrapper
context/ModalContext.tsx        # Landing-page modal state
hooks/useScrollProgress.ts      # Scroll progress hook for the landing page
lib/
  agents/                       # Agent 1-3 + rule-based fallback
  backboard*.ts                 # Pipeline orchestration, Backboard client, agent prompts
  gemini.ts, db.ts, storage.ts  # Gemini, PostgreSQL, Object Storage clients
  env.ts                        # Validated env access (also reads .env.local / .env)
  demo-scene.ts                 # Scripted Test.webp demo flow
  scene-validation.ts, placement-resolver.ts, utils.ts
types/scene.ts                  # Scene schema shared by pipeline and viewer
migrations/                     # PostgreSQL schema
scripts/                        # seed-demo.ts, setup-backboard.ts
public/                         # Landing assets, demo videos, sample floor plans
deploy/                         # Vultr VPS deployment (see deploy/README.md)
ecosystem.config.cjs            # PM2 config used by deploy scripts
implementation.MD               # Original hackathon implementation plan (historical)
legacy/                         # Archived earlier A.U.R.A code, not part of the app
```

## Prerequisites

- Node.js 22 (`.nvmrc`, `engines: 22.x`) and npm
- A PostgreSQL database (with `pgcrypto`) and `psql` for migrations
- A Vultr Object Storage (or other S3-compatible) bucket
- A Google Gemini API key and a Backboard API key

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Create your env file and fill in the values (see below)
cp .env.example .env.local

# 3. Apply the database migrations (idempotent, safe to re-run)
psql "$DATABASE_URL" -f migrations/002_floorplan_ai_schema.sql
psql "$DATABASE_URL" -f migrations/003_add_image_hash.sql

# 4. (Optional) Create Backboard assistants and copy the printed IDs into .env.local
npm run setup-backboard

# 5. Lint + type-check
npm run check

# 6. Start the dev server on http://localhost:3000
npm run dev
```

> **Migrations:** both files use `IF NOT EXISTS` guards, so they can be re-run safely. `deploy/scripts/deploy-app.sh` applies them on every deploy.

The landing page and the `Test.webp` demo flow work without any backend services. Real uploads need every required variable below; missing ones cause a `Missing required environment variable` error at request time.

## Environment Variables

Template: `.env.example` (production template: `deploy/.env.production.example`).

| Variable | Required | Purpose |
|---|---|---|
| `APP_BASE_URL` | yes | Public base URL, used to build share links |
| `GEMINI_API_KEY` | yes | Server-side Gemini API key |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `VULTR_STORAGE_ENDPOINT` | yes | S3-compatible Object Storage endpoint |
| `VULTR_STORAGE_BUCKET` | yes | Bucket for floor plan images and scene JSON |
| `VULTR_STORAGE_ACCESS_KEY` | yes | Object Storage access key |
| `VULTR_STORAGE_SECRET_KEY` | yes | Object Storage secret key |
| `BACKBOARD_API_KEY` | yes | Backboard API key |
| `BACKBOARD_AGENT1_ASSISTANT_ID` … `BACKBOARD_AGENT3_ASSISTANT_ID` | no | Reuse pre-created assistants (otherwise created on first use and cached in memory) |
| `BACKBOARD_LLM_PROVIDER` | no | LLM provider for Backboard calls (default `google`) |
| `BACKBOARD_MODEL_NAME` | no | Model for Backboard calls (default `gemini-2.5-flash`) |
| `GEMINI_MODEL` | no | Model for direct Gemini calls (default `gemini-2.5-flash`) |
| `NEXT_PUBLIC_DEMO_VIDEO_URL` | no | Self-hosted MP4/HLS URL for the landing demo video instead of the YouTube embed |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Production server on port 3000 |
| `npm run lint` | ESLint (`next lint`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run check` | Lint + typecheck |
| `npm run seed-demo` | Run the full pipeline on `public/demo/bearhacks-floorplan.*` (or `public/Floor 1.png`) and print the scene URL |
| `npm run setup-backboard` | Create the three Backboard assistants and print their env var IDs |

## API

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Returns `OK` |
| `POST` | `/api/upload` | `multipart/form-data` with `floorplan` (image) and `useCase`; optional `geminiApiKey` field or `x-gemini-api-key` header → `202 { jobId }` |
| `GET` | `/api/job/[jobId]` | Job status, progress, step label, and `sceneId` when complete |
| `GET` | `/api/scene/[sceneId]` | Normalized scene JSON |
| `POST` | `/api/scene/save` | Save an edited scene → `{ newSceneId, shareUrl }` |

## Deployment

Production is deployed on Vercel from `main` (Next.js preset, Node 22 from `engines`); pull requests get Vercel preview deployments. `.vercelignore` keeps large local-only media out of uploads. Environment variables must be set in the Vercel project settings.

Alternatively, `deploy/README.md` walks through deploying to a Vultr Ubuntu VPS (Node 22, PM2 via `ecosystem.config.cjs`, Nginx reverse proxy, existing Vultr Postgres and Object Storage) using the scripts in `deploy/scripts/`.

## Legacy Code

`legacy/` holds the archived earlier A.U.R.A backend and frontend. It is excluded from linting, type-checking, and the VPS upload (`deploy/scripts/upload-code.sh`) and is kept for reference only.
