# FloorPlan AI

Upload any floor plan image. Describe your use case in plain English. Walk through a fully configured 3D scene in seconds.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | Next.js 14 (App Router) |
| 3D Rendering | Three.js |
| AI Vision + Language | Gemini 2.0 Flash API |
| Agent Orchestration | Backboard (3 sequential agents) |
| Database | PostgreSQL (Vultr Managed) |
| File Storage | Vultr Object Storage (S3-compatible) |
| Language | TypeScript throughout |

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Copy the environment template
cp .env.local.example .env.local
# Fill in GEMINI_API_KEY, DATABASE_URL, and Vultr Storage credentials

# 3. Run the database migration
psql "$DATABASE_URL" < migrations/002_floorplan_ai_schema.sql

# 4. Start the dev server
npm run dev
```

App runs on [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/                          # Next.js App Router
  page.tsx                    # Landing page
  upload/page.tsx             # Upload + use case input
  processing/[jobId]/page.tsx # Real-time pipeline progress
  scene/[sceneId]/page.tsx    # 3D viewer page
  api/
    upload/route.ts           # POST: receive floor plan + use case
    job/[jobId]/route.ts      # GET: poll job status
    scene/[sceneId]/route.ts  # GET: fetch scene JSON
    health/route.ts           # GET: health check
components/
  ThreeScene.tsx              # Main Three.js component
  UploadForm.tsx              # Floor plan upload + use case form
  ProgressTracker.tsx         # Pipeline step progress UI
  SceneViewer.tsx             # Wrapper for Three.js + controls UI
lib/
  gemini.ts                   # Gemini API client
  backboard.ts                # Backboard agent orchestration
  storage.ts                  # Vultr Object Storage client
  db.ts                       # PostgreSQL client
  agents/
    agent1-geometry.ts        # Agent 1: floor plan extraction
    agent2-placement.ts       # Agent 2: object placement
    agent3-assembly.ts        # Agent 3: scene assembly
types/
  scene.ts                    # All TypeScript interfaces (the schema)
scripts/
  seed-demo.ts                # Pre-generates the BearHacks demo scene
migrations/
  002_floorplan_ai_schema.sql # PostgreSQL schema
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run seed-demo` | Pre-generate the BearHacks demo scene |

## API Endpoints

- `GET /api/health` — Returns `OK` (200)
- `POST /api/upload` — Upload floor plan image + use case (multipart form)
- `GET /api/job/[jobId]` — Poll job status and progress
- `GET /api/scene/[sceneId]` — Fetch full scene JSON

## Legacy Files

The `frontend/` and `backend/` directories contain the original A.U.R.A codebase. Files in those directories are marked as `DEPRECATED` and are not used by FloorPlan AI. The new single-app structure lives at the root level.
