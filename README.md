# A.U.R.A

A.U.R.A is now organized as a small npm workspace with separate frontend and backend Next.js apps.

## Structure

```text
A.U.R.A/
  frontend/  # Next.js UI app on http://localhost:3000
  backend/   # Next.js API app on http://localhost:3001
```

- `frontend/` contains the landing page, dashboard, run-progress UI, fonts, styling, and the browser-facing API client.
- `backend/` contains the API routes, Prisma schema/client, pipeline scaffolding, backend-only types, and auth/database env settings.
- The repo root keeps the shared workspace scripts and docs.

## Getting Started

```bash
# 1. Install workspace dependencies from the repo root
npm install

# 2. Review the shared env reference at .env.local.example

# 3. Create app-specific env files that the apps actually load
cp frontend/.env.local.example frontend/.env.local
cp backend/.env.local.example backend/.env.local

# 4. Generate Prisma client and sync the database
npm run db:generate -w backend
npm run db:push -w backend

# 5. Start both apps from the repo root
npm run dev
```

Frontend runs on [http://localhost:3000](http://localhost:3000). Backend runs on [http://localhost:3001](http://localhost:3001).
The repo-root `.env.local.example` is a shared reference template; Next still reads `frontend/.env.local` and `backend/.env.local` for runtime configuration.

## Root Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend and backend together |
| `npm run dev:frontend` | Start only the frontend app |
| `npm run dev:backend` | Start only the backend app |
| `npm run build` | Build backend, then frontend |
| `npm run lint` | Lint backend, then frontend |

## Backend Scripts

| Command | Description |
|---------|-------------|
| `npm run db:generate -w backend` | Generate Prisma client |
| `npm run db:push -w backend` | Push schema to the configured database |
| `npm run db:studio -w backend` | Open Prisma Studio |

## Current API Surface

- `GET /api/health`
- `GET /api/jobs`
- `POST /api/jobs`
- `GET /api/jobs/[jobId]`

The frontend reads the backend base URL from `NEXT_PUBLIC_API_BASE_URL`.
