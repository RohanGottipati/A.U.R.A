# A.U.R.A

Architectural Understanding & Rendering Agent

Upload any floor plan image. Describe your use case in plain English. Walk through a fully configured 3D scene in seconds.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | Next.js 14 (App Router) |
| 3D Rendering | Three.js + React Three Fiber + Drei |
| Animation | Framer Motion |
| AI Vision + Language | Gemini 2.5 Flash API |
| Agent Orchestration | Backboard (3 sequential agents) |
| Database | PostgreSQL (Vultr Managed) |
| File Storage | Vultr Object Storage (S3-compatible) |
| UI Primitives | Radix UI, Lucide React |
| Language | TypeScript throughout |

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Copy the environment template
cp .env.example .env.local
# Fill in all required variables (see Environment section below)

# 3. Run the database migrations
psql "$DATABASE_URL" < migrations/002_floorplan_ai_schema.sql
psql "$DATABASE_URL" < migrations/003_add_image_hash.sql

# 4. (Optional) Create Backboard assistants
npm run setup-backboard

# 5. Validate the setup
npm run check

# 6. Start the dev server
npm run dev
```

App runs on [http://localhost:3000](http://localhost:3000).

## Environment

The root `.env.example` is the only active environment template for FloorPlan AI.

**Required variables:**
- `APP_BASE_URL` — Public base URL (e.g. `http://localhost:3000`)
- `GEMINI_API_KEY` — Google Gemini API key
- `DATABASE_URL` — Vultr PostgreSQL connection string (`sslmode=require`)
- `VULTR_STORAGE_ENDPOINT` — Vultr Object Storage S3-compatible endpoint
- `VULTR_STORAGE_BUCKET` — Storage bucket name
- `VULTR_STORAGE_ACCESS_KEY` — S3 access key
- `VULTR_STORAGE_SECRET_KEY` — S3 secret key
- `BACKBOARD_API_KEY` — Backboard platform API key

**Optional variables:**
- `BACKBOARD_AGENT1_ASSISTANT_ID` — Pre-created Backboard assistant for Agent 1
- `BACKBOARD_AGENT2_ASSISTANT_ID` — Pre-created Backboard assistant for Agent 2
- `BACKBOARD_AGENT3_ASSISTANT_ID` — Pre-created Backboard assistant for Agent 3
- `BACKBOARD_LLM_PROVIDER` — LLM provider for Backboard (default: `google`)
- `BACKBOARD_MODEL_NAME` — Model name (default: `gemini-2.5-flash`)
- `GEMINI_MODEL` — Override Gemini model (default: `gemini-2.5-flash`)

## Project Structure

```
app/                              # Next.js App Router
  page.tsx                        # Landing page (animated, scroll-driven)
  upload/page.tsx                 # Upload + use case input
  processing/[jobId]/page.tsx     # Real-time pipeline progress
  scene/[sceneId]/page.tsx        # 3D viewer page
  api/
    upload/route.ts               # POST: receive floor plan + use case
    job/[jobId]/route.ts          # GET: poll job status
    scene/[sceneId]/route.ts      # GET: fetch scene JSON
    scene/save/route.ts           # POST: save an edited scene
    health/route.ts               # GET: health check

components/
  ThreeScene.tsx                  # Main Three.js scene renderer
  UploadForm.tsx                  # Floor plan upload + use case form
  ProgressTracker.tsx             # Pipeline step progress UI
  SceneViewer.tsx                 # Three.js wrapper + walk/orbit controls + save
  SceneSidebar.tsx                # Object list, add objects, inspector panel
  Inspector.tsx                   # Selected object property editor
  MiniMap.tsx                     # Top-down 2D minimap overlay
  landing/
    Navigation.tsx                # Top navigation bar for landing page
    SplashScreen.tsx              # Animated intro splash screen
    ScrollSimulation.tsx          # Scroll-driven animation controller
    Sections.tsx                  # All landing page content sections
    WaitlistModal.tsx             # Waitlist sign-up modal
    three/
      FestivalScene.tsx           # Three.js festival/crowd 3D scene (landing)
      CrowdSystem.tsx             # Crowd particle system for festival scene
  ui/
    dialog.tsx                    # Radix UI dialog primitive wrapper

context/
  ModalContext.tsx                # Global modal state (waitlist)

hooks/
  useScrollProgress.ts            # Scroll position + section tracking hook

lib/
  env.ts                          # Validated runtime environment access
  gemini.ts                       # Gemini API client + helpers
  backboard.ts                    # Pipeline orchestration (all 3 agents)
  backboard-client.ts             # HTTP client for Backboard API
  backboard-agents.ts             # Agent slot definitions + system prompts
  storage.ts                      # Vultr Object Storage client (S3)
  db.ts                           # PostgreSQL client + query methods
  utils.ts                        # Shared utility functions (cn, etc.)
  festivalData.ts                 # Static data for the landing festival scene
  local-dev-fallback.ts           # Local dev mode when infra is unavailable
  placement-resolver.ts           # Post-process AI object placements
  scene-validation.ts             # Parse + normalize scene JSON from agents
  agents/
    agent1-geometry.ts            # Agent 1: floor plan geometry extraction (Gemini Vision)
    agent2-placement.ts           # Agent 2: object placement (Backboard → Gemini → heuristic)
    agent3-assembly.ts            # Agent 3: scene assembly (pure TypeScript)
    fallback.ts                   # Rule-based fallback geometry + placement

types/
  scene.ts                        # All TypeScript interfaces (the scene schema)

public/
  demo/
    example-scene.json            # Checked-in sample scene for local frontend work
  blueprint-bg.png                # Background image asset
  fp-1.png … fp-10.png           # Sample floor plan images
  floorplan-12.png … floorplan-21.png  # Additional sample floor plan images

scripts/
  seed-demo.ts                    # Pre-generates a demo scene via the pipeline
  setup-backboard.ts              # Creates Backboard assistants + prints IDs for .env.local

migrations/
  002_floorplan_ai_schema.sql     # Core PostgreSQL schema (jobs + scenes tables)
  003_add_image_hash.sql          # Adds image_hash column for content-addressed caching

legacy/
  aura-backend/                   # Archived A.U.R.A backend (inactive)
  aura-frontend/                  # Archived A.U.R.A frontend (inactive)
```

## AI Pipeline

Uploads trigger a three-stage async pipeline:

1. **Agent 1 — Geometry Extraction** (`lib/agents/agent1-geometry.ts`)
   Sends the floor plan image directly to Gemini Vision. Returns structured JSON describing rooms, walls, doors, and dimensions.

2. **Agent 2 — Object Placement** (`lib/agents/agent2-placement.ts`)
   Takes the geometry JSON + use case text. Tries Backboard first; falls back to direct Gemini; falls back to a rule-based heuristic engine. Returns a placement plan (what objects go where).

3. **Agent 3 — Scene Assembly** (`lib/agents/agent3-assembly.ts`)
   Pure TypeScript. Clamps sizes, resolves 3D coordinates, validates and normalizes everything into a final `SceneFile` JSON. No LLM involved.

The completed scene JSON is uploaded to Vultr Object Storage and metadata is saved to PostgreSQL. Duplicate uploads (same image + use case) are short-circuited via a SHA-256 image hash cache (`migrations/003_add_image_hash.sql`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server on port 3000 |
| `npm run build` | Build for production |
| `npm run start` | Start the production server on port 3000 |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run check` | Run lint + typecheck together |
| `npm run seed-demo` | Pre-generate a demo scene via the pipeline |
| `npm run setup-backboard` | Create Backboard assistants and print env var IDs |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Returns `OK` (200) |
| `POST` | `/api/upload` | Upload floor plan image + use case (multipart/form-data) → `{ jobId }` |
| `GET` | `/api/job/[jobId]` | Poll job status, progress %, step label, and `sceneId` on completion |
| `GET` | `/api/scene/[sceneId]` | Fetch full normalized scene JSON |
| `POST` | `/api/scene/save` | Save an edited scene → `{ newSceneId, shareUrl }` |

## Local Development Fallback

When `NODE_ENV !== 'production'`, if Vultr or the database is unreachable, the app falls back to serving `public/demo/example-scene.json` and tracking job state in `.next/local-dev-jobs.json`. This keeps the frontend fully usable without live infrastructure.

## Legacy Files

The archived A.U.R.A codebase lives under `legacy/`. It is kept for reference only and is not part of the active FloorPlan AI setup, env flow, or tooling.
