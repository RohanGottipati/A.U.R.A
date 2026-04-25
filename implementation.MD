# FloorPlan AI — Full Implementation Guide

> **Purpose:** This document is the single source of truth for building FloorPlan AI at BearHacks. Every feature is described in enough detail for AI agents (Devin, Codex, Amp, Factory AI, Claude) to implement without ambiguity. Read this entire document before writing a single line of code.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [The Central JSON Schema](#2-the-central-json-schema)
3. [Repository Structure](#3-repository-structure)
4. [Person 1 — Backend & AI Pipeline](#4-person-1--backend--ai-pipeline)
5. [Person 2 — Frontend, UI & Three.js](#5-person-2--frontend-ui--threejs)
6. [Person 3 — Vultr Infrastructure](#6-person-3--vultr-infrastructure)
7. [Person 4 — Demo & Polish](#7-person-4--demo--polish)
8. [Environment Variables](#8-environment-variables)
9. [Build Order & Milestones](#9-build-order--milestones)
10. [Inter-Person Dependencies](#10-inter-person-dependencies)

---

## 1. Project Overview

### What We Are Building

FloorPlan AI is a web application that takes any floor plan image and a plain-English description of a use case, and generates a fully configured, walkable 3D visualization of that space in seconds. No technical expertise required. Upload a floor plan, type a sentence, walk through your configured space.

### Use Cases

- **Hackathon organizer:** "Hacking stations along walls, sponsor booths in center, ceremony stage at front"
- **Event planner:** "200 person gala with round tables, a dance floor, and a bar on the east wall"
- **Factory manager:** "Assembly line with 3 workstations, forklift path down center, storage in back"
- **Office designer:** "Open plan with 40 desks, 3 meeting rooms, and a lounge near the entrance"

### The Demo

Upload the BearHacks SSU Atrium floor plan. Type "hackathon with hacking stations along the walls, sponsor booths in the center, and a ceremony stage at the front." The room the judges are sitting in appears in 3D, configured exactly as the hackathon is set up around them.

### Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend Framework | Next.js 14 (App Router) |
| 3D Rendering | Three.js |
| AI Vision + Language | Gemini 2.0 Flash API |
| Agent Orchestration | Backboard (3 agents) |
| Backend Runtime | Node.js on Vultr VPS |
| Database | Vultr Managed PostgreSQL |
| File Storage | Vultr Object Storage (S3-compatible) |
| Network Security | Vultr Firewall |
| Traffic Distribution | Vultr Load Balancer |
| Language | TypeScript throughout |

---

## 2. The Central JSON Schema

**This schema is the single most important thing in the entire project. Every person builds against this contract. Define it first, touch it last.**

This is the data format that:
- Gemini produces as output
- Backboard passes between agents
- Three.js consumes to render the scene
- PostgreSQL stores as metadata
- Object Storage saves as the scene file

### Full Schema Definition

```typescript
// types/scene.ts — shared across the entire codebase

export interface Wall {
  x1: number;  // start x coordinate in meters
  y1: number;  // start y coordinate in meters
  x2: number;  // end x coordinate in meters
  y2: number;  // end y coordinate in meters
  height: number; // wall height in meters, default 3.0
}

export interface Room {
  id: string;        // unique identifier e.g. "room_1"
  name: string;      // human readable e.g. "Main Hall"
  x: number;         // top-left x coordinate in meters
  y: number;         // top-left y coordinate in meters
  width: number;     // room width in meters
  height: number;    // room depth in meters
  type: RoomType;    // classification
}

export type RoomType =
  | "main_hall"
  | "corridor"
  | "bathroom"
  | "storage"
  | "kitchen"
  | "office"
  | "entrance"
  | "unknown";

export interface SceneObject {
  id: string;          // unique identifier e.g. "obj_1"
  type: ObjectType;    // determines shape and color
  roomId: string;      // which room this object belongs to
  x: number;           // center x coordinate in meters
  y: number;           // center y coordinate in meters (depth)
  z: number;           // height off floor in meters, usually 0
  width: number;       // x-axis size in meters
  depth: number;       // y-axis size in meters
  height: number;      // z-axis size in meters
  rotation: number;    // rotation in degrees around y-axis (0-360)
  label: string;       // display label shown in 3D above object
  color?: string;      // optional hex override e.g. "#FF5733"
}

export type ObjectType =
  | "table"           // flat rectangular surface
  | "chair"           // small cube
  | "stage"           // raised rectangular platform
  | "booth"           // tall rectangular structure
  | "desk"            // office desk
  | "podium"          // single speaking podium
  | "screen"          // vertical flat panel
  | "workstation"     // industrial work surface
  | "shelf"           // storage shelf unit
  | "counter"         // counter/bar surface
  | "equipment"       // generic industrial equipment block
  | "plant"           // decorative cylinder
  | "divider"         // room divider panel
  | "entrance_marker";// arrow pointing to entrance

export interface FloorPlan {
  width: number;       // total floor plan width in meters
  depth: number;       // total floor plan depth in meters
  rooms: Room[];
  walls: Wall[];
  scale: number;       // pixels per meter ratio from original image
  confidence: number;  // 0-1, how confident Gemini was in extraction
  notes: string;       // any extraction caveats from Gemini
}

export interface Configuration {
  useCase: string;           // the raw user input text
  useCaseCategory: UseCaseCategory;
  objects: SceneObject[];
  placementNotes: string;    // reasoning from Agent 2
}

export type UseCaseCategory =
  | "event"
  | "hackathon"
  | "office"
  | "factory"
  | "classroom"
  | "retail"
  | "other";

export interface SceneFile {
  version: "1.0";
  sceneId: string;           // uuid
  createdAt: string;         // ISO timestamp
  floorplan: FloorPlan;
  configuration: Configuration;
}
```

### Example Scene File (BearHacks Demo)

```json
{
  "version": "1.0",
  "sceneId": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2024-01-15T10:30:00Z",
  "floorplan": {
    "width": 40,
    "depth": 30,
    "rooms": [
      {
        "id": "room_1",
        "name": "SSU Atrium",
        "x": 0,
        "y": 0,
        "width": 40,
        "height": 30,
        "type": "main_hall"
      }
    ],
    "walls": [
      { "x1": 0, "y1": 0, "x2": 40, "y2": 0, "height": 4 },
      { "x1": 40, "y1": 0, "x2": 40, "y2": 30, "height": 4 },
      { "x1": 40, "y1": 30, "x2": 0, "y2": 30, "height": 4 },
      { "x1": 0, "y1": 30, "x2": 0, "y2": 0, "height": 4 }
    ],
    "scale": 10,
    "confidence": 0.92,
    "notes": "Large open atrium detected. Two entrance points on south wall."
  },
  "configuration": {
    "useCase": "hackathon with hacking stations along the walls, sponsor booths in the center, and a ceremony stage at the front",
    "useCaseCategory": "hackathon",
    "objects": [
      {
        "id": "obj_1",
        "type": "table",
        "roomId": "room_1",
        "x": 3,
        "y": 5,
        "z": 0,
        "width": 2,
        "depth": 1,
        "height": 0.75,
        "rotation": 0,
        "label": "Hacking Station 1"
      },
      {
        "id": "obj_2",
        "type": "stage",
        "roomId": "room_1",
        "x": 20,
        "y": 2,
        "z": 0,
        "width": 10,
        "depth": 4,
        "height": 0.5,
        "rotation": 0,
        "label": "Ceremony Stage"
      },
      {
        "id": "obj_3",
        "type": "booth",
        "roomId": "room_1",
        "x": 15,
        "y": 15,
        "z": 0,
        "width": 2,
        "depth": 2,
        "height": 2,
        "rotation": 0,
        "label": "Sponsor Booth 1"
      }
    ],
    "placementNotes": "Hacking stations placed along north, east, and west walls. Sponsor booths arranged in 2x3 grid in center of room. Ceremony stage placed against north wall with clear sightlines from all positions."
  }
}
```

---

## 3. Repository Structure

```
floorplan-ai/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Landing page
│   ├── upload/
│   │   └── page.tsx              # Upload + use case input page
│   ├── processing/
│   │   └── [jobId]/
│   │       └── page.tsx          # Real-time pipeline progress page
│   ├── scene/
│   │   └── [sceneId]/
│   │       └── page.tsx          # 3D viewer page
│   └── api/
│       ├── upload/
│       │   └── route.ts          # POST: receive floor plan + use case
│       ├── job/
│       │   └── [jobId]/
│       │       └── route.ts      # GET: poll job status
│       └── scene/
│           └── [sceneId]/
│               └── route.ts      # GET: fetch scene JSON
├── components/
│   ├── ThreeScene.tsx            # Main Three.js component
│   ├── UploadForm.tsx            # Floor plan upload + use case form
│   ├── ProgressTracker.tsx       # Pipeline step progress UI
│   ├── SceneViewer.tsx           # Wrapper for Three.js + controls UI
│   └── ui/                       # Shared UI components
├── lib/
│   ├── gemini.ts                 # Gemini API client
│   ├── backboard.ts              # Backboard agent orchestration
│   ├── storage.ts                # Vultr Object Storage client
│   ├── db.ts                     # PostgreSQL client
│   └── agents/
│       ├── agent1-geometry.ts    # Agent 1: floor plan extraction
│       ├── agent2-placement.ts   # Agent 2: object placement
│       └── agent3-assembly.ts    # Agent 3: scene assembly
├── types/
│   └── scene.ts                  # All TypeScript interfaces (the schema)
├── public/
│   └── demo/
│       └── bearhacks-floorplan.jpg  # The BearHacks demo floor plan
├── scripts/
│   └── seed-demo.ts              # Pre-generates the BearHacks demo scene
├── .env.local                    # All environment variables
└── README.md
```

---

## 4. Person 1 — Backend & AI Pipeline

**Your responsibility:** Everything that happens on the server after the floor plan is uploaded. The Gemini API calls, the Backboard agents, the pipeline orchestration, the database writes, and the API routes that the frontend calls.

**You own these files:**
- `lib/gemini.ts`
- `lib/backboard.ts`
- `lib/db.ts`
- `lib/agents/agent1-geometry.ts`
- `lib/agents/agent2-placement.ts`
- `lib/agents/agent3-assembly.ts`
- `app/api/upload/route.ts`
- `app/api/job/[jobId]/route.ts`
- `app/api/scene/[sceneId]/route.ts`
- `types/scene.ts`

---

### 4.1 Database Setup

Run these SQL commands to create the schema in Vultr PostgreSQL. Person 3 will give you the connection string.

```sql
-- Jobs table: tracks pipeline execution state
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending',
    -- pending | agent1_running | agent1_done | agent2_running
    -- agent2_done | agent3_running | complete | failed
  use_case TEXT NOT NULL,
  floorplan_storage_key TEXT NOT NULL,
    -- the key in Vultr Object Storage where the image is saved
  scene_id UUID REFERENCES scenes(id),
  error_message TEXT,
  agent1_output JSONB,
    -- stores FloorPlan object from Agent 1 output
  agent2_output JSONB
    -- stores SceneObject[] array from Agent 2 output
);

-- Scenes table: stores completed scene metadata
CREATE TABLE scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  job_id UUID REFERENCES jobs(id),
  scene_storage_key TEXT NOT NULL,
    -- the key in Vultr Object Storage where the scene JSON is saved
  use_case TEXT NOT NULL,
  use_case_category TEXT NOT NULL,
  floorplan_width NUMERIC,
  floorplan_depth NUMERIC,
  object_count INTEGER,
  share_url TEXT NOT NULL
    -- the full public URL to access this scene
);

-- Index for fast job polling
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created ON jobs(created_at DESC);
```

---

### 4.2 Database Client (`lib/db.ts`)

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export const db = {
  query: (text: string, params?: unknown[]) => pool.query(text, params),

  async createJob(useCaseText: string, floorplanStorageKey: string): Promise<string> {
    const result = await pool.query(
      `INSERT INTO jobs (use_case, floorplan_storage_key)
       VALUES ($1, $2) RETURNING id`,
      [useCaseText, floorplanStorageKey]
    );
    return result.rows[0].id;
  },

  async updateJobStatus(
    jobId: string,
    status: string,
    extras?: { agent1Output?: object; agent2Output?: object; errorMessage?: string; sceneId?: string }
  ): Promise<void> {
    const fields: string[] = ['status = $2', 'updated_at = NOW()'];
    const values: unknown[] = [jobId, status];
    let i = 3;

    if (extras?.agent1Output) { fields.push(`agent1_output = $${i++}`); values.push(JSON.stringify(extras.agent1Output)); }
    if (extras?.agent2Output) { fields.push(`agent2_output = $${i++}`); values.push(JSON.stringify(extras.agent2Output)); }
    if (extras?.errorMessage) { fields.push(`error_message = $${i++}`); values.push(extras.errorMessage); }
    if (extras?.sceneId)      { fields.push(`scene_id = $${i++}`); values.push(extras.sceneId); }

    await pool.query(`UPDATE jobs SET ${fields.join(', ')} WHERE id = $1`, values);
  },

  async getJob(jobId: string) {
    const result = await pool.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
    return result.rows[0] ?? null;
  },

  async createScene(params: {
    jobId: string;
    sceneStorageKey: string;
    useCase: string;
    useCaseCategory: string;
    floorplanWidth: number;
    floorplanDepth: number;
    objectCount: number;
    shareUrl: string;
  }): Promise<string> {
    const result = await pool.query(
      `INSERT INTO scenes
         (job_id, scene_storage_key, use_case, use_case_category,
          floorplan_width, floorplan_depth, object_count, share_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [
        params.jobId, params.sceneStorageKey, params.useCase,
        params.useCaseCategory, params.floorplanWidth, params.floorplanDepth,
        params.objectCount, params.shareUrl
      ]
    );
    return result.rows[0].id;
  },

  async getScene(sceneId: string) {
    const result = await pool.query('SELECT * FROM scenes WHERE id = $1', [sceneId]);
    return result.rows[0] ?? null;
  }
};
```

---

### 4.3 Vultr Object Storage Client (`lib/storage.ts`)

Vultr Object Storage is S3-compatible. Use the `@aws-sdk/client-s3` package.

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const s3 = new S3Client({
  endpoint: process.env.VULTR_STORAGE_ENDPOINT, // e.g. https://ewr1.vultrobjects.com
  region: 'us-east-1', // required by SDK but ignored by Vultr
  credentials: {
    accessKeyId: process.env.VULTR_STORAGE_ACCESS_KEY!,
    secretAccessKey: process.env.VULTR_STORAGE_SECRET_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.VULTR_STORAGE_BUCKET!;

export const storage = {
  // Upload a floor plan image. key = "floorplans/{jobId}.jpg"
  async uploadImage(key: string, buffer: Buffer, contentType: string): Promise<string> {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
    }));
    return `${process.env.VULTR_STORAGE_ENDPOINT}/${BUCKET}/${key}`;
  },

  // Upload a scene JSON file. key = "scenes/{sceneId}.json"
  async uploadScene(key: string, sceneData: object): Promise<string> {
    const body = JSON.stringify(sceneData, null, 2);
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: 'application/json',
      ACL: 'public-read',
    }));
    return `${process.env.VULTR_STORAGE_ENDPOINT}/${BUCKET}/${key}`;
  },

  // Fetch a scene JSON file and parse it
  async getScene(key: string): Promise<object> {
    const response = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
  },

  // Get the public URL for any stored object
  getPublicUrl(key: string): string {
    return `${process.env.VULTR_STORAGE_ENDPOINT}/${BUCKET}/${key}`;
  }
};
```

---

### 4.4 Gemini API Client (`lib/gemini.ts`)

```typescript
import { GoogleGenerativeAI, Part } from '@google/generative-ai';

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash' });

export async function callGemini(prompt: string, imageParts?: Part[]): Promise<string> {
  const parts: Part[] = [{ text: prompt }];
  if (imageParts) parts.unshift(...imageParts);

  const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
  const text = result.response.text();

  if (!text) throw new Error('Gemini returned empty response');
  return text;
}

// Convert a Buffer (image data) into a Gemini Part object
export function imageBufferToPart(buffer: Buffer, mimeType: string): Part {
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType,
    }
  };
}

// Fetch image from Vultr Object Storage URL and convert to Part
export async function imageUrlToPart(url: string): Promise<Part> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image: ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const mimeType = response.headers.get('content-type') ?? 'image/jpeg';
  return imageBufferToPart(buffer, mimeType);
}
```

---

### 4.5 Agent 1 — Geometry Extractor (`lib/agents/agent1-geometry.ts`)

**Agent 1's only job:** Look at the floor plan image. Extract walls, rooms, and dimensions. Output structured FloorPlan JSON. Know nothing about the use case.

```typescript
import { callGemini, imageUrlToPart } from '../gemini';
import { FloorPlan } from '../../types/scene';

const AGENT1_PROMPT = `
You are a floor plan analysis expert. You will receive an image of a floor plan.

Your task is to extract the physical geometry of the space and return it as structured JSON.

INSTRUCTIONS:
1. Identify all rooms, their approximate sizes, and their positions relative to each other.
2. Identify all walls as line segments connecting two points.
3. Estimate the real-world dimensions. If a scale is shown, use it. If not, estimate based on typical room sizes (a standard office room is about 4m x 4m, a large hall is 20m+ wide).
4. Assign a coordinate system where the top-left corner of the floor plan is (0, 0), x increases to the right, and y increases downward.
5. All measurements should be in METERS.
6. Classify each room using one of these types: main_hall, corridor, bathroom, storage, kitchen, office, entrance, unknown.

CRITICAL: Return ONLY a valid JSON object. No markdown, no explanation, no code fences. Just the raw JSON.

Return this exact structure:
{
  "width": <total width in meters as number>,
  "depth": <total depth in meters as number>,
  "rooms": [
    {
      "id": "room_1",
      "name": "<descriptive name>",
      "x": <top-left x in meters>,
      "y": <top-left y in meters>,
      "width": <room width in meters>,
      "height": <room depth in meters>,
      "type": "<room type>"
    }
  ],
  "walls": [
    { "x1": <meters>, "y1": <meters>, "x2": <meters>, "y2": <meters>, "height": 3.0 }
  ],
  "scale": <your estimated pixels-per-meter ratio, or 10 if unknown>,
  "confidence": <0.0 to 1.0 how confident you are in the extraction>,
  "notes": "<any important observations about the floor plan>"
}
`;

export async function runAgent1(floorplanImageUrl: string): Promise<FloorPlan> {
  const imagePart = await imageUrlToPart(floorplanImageUrl);
  const rawResponse = await callGemini(AGENT1_PROMPT, [imagePart]);

  // Strip any accidental markdown fences
  const cleaned = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  let parsed: FloorPlan;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Agent 1 returned invalid JSON: ${cleaned.substring(0, 500)}`);
  }

  // Validation
  if (!parsed.rooms || parsed.rooms.length === 0) {
    throw new Error('Agent 1 detected no rooms in the floor plan');
  }
  if (!parsed.walls || parsed.walls.length === 0) {
    // Generate bounding walls from floor plan dimensions if none detected
    parsed.walls = [
      { x1: 0, y1: 0, x2: parsed.width, y2: 0, height: 3.0 },
      { x1: parsed.width, y1: 0, x2: parsed.width, y2: parsed.depth, height: 3.0 },
      { x1: parsed.width, y1: parsed.depth, x2: 0, y2: parsed.depth, height: 3.0 },
      { x1: 0, y1: parsed.depth, x2: 0, y2: 0, height: 3.0 },
    ];
  }

  return parsed;
}
```

---

### 4.6 Agent 2 — Object Placement Planner (`lib/agents/agent2-placement.ts`)

**Agent 2's only job:** Given the geometry from Agent 1 and the user's use case, decide what objects to place and exactly where. Output an array of SceneObject.

```typescript
import { callGemini } from '../gemini';
import { FloorPlan, SceneObject, UseCaseCategory } from '../../types/scene';

function buildAgent2Prompt(floorplan: FloorPlan, useCase: string): string {
  return `
You are an expert spatial planner who arranges spaces for real-world events and operations.

You will receive:
1. A floor plan geometry (extracted from an image)
2. A use case description from the user

Your task is to decide what objects to place in the space and exactly where, then return structured JSON.

FLOOR PLAN GEOMETRY:
${JSON.stringify(floorplan, null, 2)}

USER USE CASE:
"${useCase}"

PLACEMENT RULES:
- All x and y coordinates must be within the floor plan bounds (0 to ${floorplan.width} for x, 0 to ${floorplan.depth} for y)
- Objects must not overlap each other. Maintain at least 1 meter clearance between objects.
- Leave 1.5 meter clearance from all walls for walkways.
- Place stages and presentation areas against walls, not in the center.
- Place seating facing toward stages or screens.
- For hackathons: hacking stations along walls, booths in center, stage at one end.
- For events: round tables distributed across main area, stage at front, bar against a wall.
- For offices: desks in rows or clusters, meeting rooms separated, lounge near entrance.
- For factories: workstations in sequence along production flow, storage at back.

AVAILABLE OBJECT TYPES AND DEFAULT SIZES:
- table: 2.0m wide, 1.0m deep, 0.75m tall (for dining/work)
- chair: 0.5m wide, 0.5m deep, 0.9m tall
- stage: 8.0m wide, 4.0m deep, 0.5m tall (raised platform)
- booth: 2.0m wide, 2.0m deep, 2.0m tall (sponsor/exhibition)
- desk: 1.5m wide, 0.8m deep, 0.75m tall (office desk)
- podium: 0.6m wide, 0.6m deep, 1.1m tall (speaker podium)
- screen: 3.0m wide, 0.1m deep, 2.0m tall (display screen)
- workstation: 2.0m wide, 1.5m deep, 1.0m tall (industrial)
- shelf: 1.0m wide, 0.4m deep, 2.0m tall (storage)
- counter: 2.0m wide, 0.8m deep, 0.9m tall (bar/reception)
- equipment: 1.5m wide, 1.5m deep, 1.2m tall (generic machinery)
- divider: 3.0m wide, 0.1m deep, 1.8m tall (partition panel)

CATEGORIZE the use case as one of: event, hackathon, office, factory, classroom, retail, other

CRITICAL: Return ONLY a valid JSON object. No markdown, no explanation, no code fences.

Return this exact structure:
{
  "useCaseCategory": "<category>",
  "objects": [
    {
      "id": "obj_1",
      "type": "<object type>",
      "roomId": "<id of the room this object is in>",
      "x": <center x position in meters>,
      "y": <center y position in meters>,
      "z": 0,
      "width": <width in meters>,
      "depth": <depth in meters>,
      "height": <height in meters>,
      "rotation": <0 to 360 degrees>,
      "label": "<descriptive label shown in 3D>"
    }
  ],
  "placementNotes": "<explain your placement decisions in 2-3 sentences>"
}

Place enough objects to make the space look fully configured. For a large hall aim for 15-40 objects. For a small room aim for 5-15 objects.
`;
}

export async function runAgent2(
  floorplan: FloorPlan,
  useCase: string
): Promise<{ objects: SceneObject[]; useCaseCategory: UseCaseCategory; placementNotes: string }> {
  const prompt = buildAgent2Prompt(floorplan, useCase);
  const rawResponse = await callGemini(prompt);

  const cleaned = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  let parsed: { objects: SceneObject[]; useCaseCategory: UseCaseCategory; placementNotes: string };
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Agent 2 returned invalid JSON: ${cleaned.substring(0, 500)}`);
  }

  if (!parsed.objects || parsed.objects.length === 0) {
    throw new Error('Agent 2 placed no objects in the scene');
  }

  // Ensure all objects have IDs
  parsed.objects = parsed.objects.map((obj, i) => ({
    ...obj,
    id: obj.id ?? `obj_${i + 1}`,
  }));

  return parsed;
}
```

---

### 4.7 Agent 3 — Scene Assembler (`lib/agents/agent3-assembly.ts`)

**Agent 3's job:** Take geometry from Agent 1 and placement from Agent 2, validate everything, and produce the final complete SceneFile.

```typescript
import { FloorPlan, SceneObject, SceneFile, UseCaseCategory } from '../../types/scene';
import { v4 as uuidv4 } from 'uuid';

export function runAgent3(params: {
  floorplan: FloorPlan;
  objects: SceneObject[];
  useCaseCategory: UseCaseCategory;
  placementNotes: string;
  useCase: string;
}): SceneFile {
  const { floorplan, objects, useCaseCategory, placementNotes, useCase } = params;

  // Clamp all object positions to floor plan bounds
  const validatedObjects = objects.map(obj => ({
    ...obj,
    x: Math.max(obj.width / 2, Math.min(floorplan.width - obj.width / 2, obj.x)),
    y: Math.max(obj.depth / 2, Math.min(floorplan.depth - obj.depth / 2, obj.y)),
    z: Math.max(0, obj.z),
    rotation: ((obj.rotation % 360) + 360) % 360, // normalize to 0-360
  }));

  const sceneFile: SceneFile = {
    version: '1.0',
    sceneId: uuidv4(),
    createdAt: new Date().toISOString(),
    floorplan,
    configuration: {
      useCase,
      useCaseCategory,
      objects: validatedObjects,
      placementNotes,
    },
  };

  return sceneFile;
}
```

---

### 4.8 Pipeline Orchestrator (`lib/backboard.ts`)

This function runs the full three-agent pipeline. It is called from the upload API route and runs asynchronously (does not block the HTTP response).

```typescript
import { runAgent1 } from './agents/agent1-geometry';
import { runAgent2 } from './agents/agent2-placement';
import { runAgent3 } from './agents/agent3-assembly';
import { storage } from './storage';
import { db } from './db';

export async function runPipeline(jobId: string, floorplanImageUrl: string, useCase: string): Promise<void> {
  try {
    // --- Agent 1 ---
    await db.updateJobStatus(jobId, 'agent1_running');
    const floorplan = await runAgent1(floorplanImageUrl);
    await db.updateJobStatus(jobId, 'agent1_done', { agent1Output: floorplan });

    // --- Agent 2 ---
    await db.updateJobStatus(jobId, 'agent2_running');
    const { objects, useCaseCategory, placementNotes } = await runAgent2(floorplan, useCase);
    await db.updateJobStatus(jobId, 'agent2_done', { agent2Output: { objects, useCaseCategory, placementNotes } });

    // --- Agent 3 ---
    await db.updateJobStatus(jobId, 'agent3_running');
    const sceneFile = runAgent3({ floorplan, objects, useCaseCategory, placementNotes, useCase });

    // --- Save to Object Storage ---
    const sceneKey = `scenes/${sceneFile.sceneId}.json`;
    const shareUrl = await storage.uploadScene(sceneKey, sceneFile);

    // --- Save to Database ---
    const sceneId = await db.createScene({
      jobId,
      sceneStorageKey: sceneKey,
      useCase,
      useCaseCategory,
      floorplanWidth: floorplan.width,
      floorplanDepth: floorplan.depth,
      objectCount: objects.length,
      shareUrl,
    });

    await db.updateJobStatus(jobId, 'complete', { sceneId });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.updateJobStatus(jobId, 'failed', { errorMessage: message });
    throw error;
  }
}
```

---

### 4.9 API Routes

#### Upload Route (`app/api/upload/route.ts`)

Accepts multipart form data containing the floor plan image and use case text. Saves image to Object Storage. Creates a job record. Fires the pipeline asynchronously. Returns the job ID immediately.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { db } from '@/lib/db';
import { runPipeline } from '@/lib/backboard';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('floorplan') as File | null;
    const useCase = formData.get('useCase') as string | null;

    // Validation
    if (!file) return NextResponse.json({ error: 'No floor plan image provided' }, { status: 400 });
    if (!useCase || useCase.trim().length < 10) {
      return NextResponse.json({ error: 'Use case description too short (minimum 10 characters)' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large (max 10MB)' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Use JPG, PNG, or WebP.' }, { status: 400 });
    }

    // Upload image to Object Storage
    const jobId = uuidv4();
    const imageKey = `floorplans/${jobId}.jpg`;
    const imageBuffer = Buffer.from(await file.arrayBuffer());
    const imageUrl = await storage.uploadImage(imageKey, imageBuffer, file.type);

    // Create job record
    await db.createJob(useCase.trim(), imageKey);

    // Fire pipeline asynchronously — do NOT await this
    // The HTTP response returns immediately with the jobId
    runPipeline(jobId, imageUrl, useCase.trim()).catch(err => {
      console.error(`Pipeline failed for job ${jobId}:`, err);
    });

    return NextResponse.json({ jobId }, { status: 202 });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Required for file uploads
export const runtime = 'nodejs';
export const maxDuration = 30;
```

#### Job Status Route (`app/api/job/[jobId]/route.ts`)

The frontend polls this every 2 seconds to check pipeline progress.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Preparing your floor plan...',
  agent1_running: 'Reading floor plan geometry...',
  agent1_done: 'Floor plan extracted!',
  agent2_running: 'Planning object placement...',
  agent2_done: 'Objects placed!',
  agent3_running: 'Assembling 3D scene...',
  complete: 'Scene ready!',
  failed: 'Processing failed',
};

const STATUS_PROGRESS: Record<string, number> = {
  pending: 5,
  agent1_running: 20,
  agent1_done: 40,
  agent2_running: 55,
  agent2_done: 75,
  agent3_running: 90,
  complete: 100,
  failed: 0,
};

export async function GET(_req: NextRequest, { params }: { params: { jobId: string } }) {
  const job = await db.getJob(params.jobId);

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  return NextResponse.json({
    status: job.status,
    label: STATUS_LABELS[job.status] ?? job.status,
    progress: STATUS_PROGRESS[job.status] ?? 0,
    sceneId: job.scene_id ?? null,
    error: job.error_message ?? null,
  });
}
```

#### Scene Route (`app/api/scene/[sceneId]/route.ts`)

Returns the full scene JSON for the 3D viewer to consume.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { storage } from '@/lib/storage';

export async function GET(_req: NextRequest, { params }: { params: { sceneId: string } }) {
  const scene = await db.getScene(params.sceneId);
  if (!scene) return NextResponse.json({ error: 'Scene not found' }, { status: 404 });

  const sceneData = await storage.getScene(scene.scene_storage_key);
  return NextResponse.json(sceneData);
}
```

---

### 4.10 Demo Scene Pre-generation Script (`scripts/seed-demo.ts`)

Run this script before the demo to pre-generate the BearHacks scene so it loads instantly on stage.

```typescript
import { runPipeline } from '../lib/backboard';
import { db } from '../lib/db';
import { storage } from '../lib/storage';
import * as fs from 'fs';
import * as path from 'path';

async function seedDemo() {
  console.log('Seeding BearHacks demo scene...');

  const imagePath = path.join(process.cwd(), 'public/demo/bearhacks-floorplan.jpg');
  const imageBuffer = fs.readFileSync(imagePath);

  // Upload the image
  const imageKey = 'floorplans/demo-bearhacks.jpg';
  const imageUrl = await storage.uploadImage(imageKey, imageBuffer, 'image/jpeg');
  console.log('Image uploaded:', imageUrl);

  // Create job
  const jobId = await db.createJob(
    'hackathon with hacking stations along the walls, sponsor booths in the center, and a ceremony stage at the front',
    imageKey
  );
  console.log('Job created:', jobId);

  // Run pipeline synchronously for seeding
  await runPipeline(jobId, imageUrl,
    'hackathon with hacking stations along the walls, sponsor booths in the center, and a ceremony stage at the front'
  );

  const job = await db.getJob(jobId);
  console.log('Demo scene ready! Scene ID:', job.scene_id);
  console.log('Share URL:', job.scene_id ? `http://your-domain.com/scene/${job.scene_id}` : 'N/A');
}

seedDemo().catch(console.error);
```

---

## 5. Person 2 — Frontend, UI & Three.js

**Your responsibility:** Everything the user sees and interacts with. The landing page, upload form, progress tracking UI, and most critically — the Three.js 3D scene where users walk through their configured space.

**You own these files:**
- `app/page.tsx`
- `app/upload/page.tsx`
- `app/processing/[jobId]/page.tsx`
- `app/scene/[sceneId]/page.tsx`
- `components/ThreeScene.tsx`
- `components/UploadForm.tsx`
- `components/ProgressTracker.tsx`
- `components/SceneViewer.tsx`
- `components/ui/`

---

### 5.1 Landing Page (`app/page.tsx`)

The landing page must be visually stunning. This is what wins Best UI/UX.

**Required sections:**

**Hero Section:**
- Large headline: "Upload any floor plan. Configure any space. In seconds."
- Subheadline: "AI reads your floor plan and use case, then builds a walkable 3D scene of your configured space."
- Single CTA button: "Get Started" → navigates to `/upload`
- Background: dark gradient or subtle animated grid pattern
- Optional: animated demo GIF or looping video of the 3D scene

**How It Works Section:**
Three steps shown as large numbered cards side by side:
1. Upload your floor plan (icon: document upload)
2. Describe your use case (icon: chat bubble)
3. Walk through your space in 3D (icon: 3D cube)

**Use Case Examples Section:**
Four cards showing the different use cases with icons:
- Hackathon (laptop icon)
- Events & Galas (celebration icon)
- Office Planning (building icon)
- Factory Layout (gear icon)

Each card shows a one-sentence example prompt in italics.

**Powered By Section:**
Logo strip showing: Gemini, Three.js, Vultr, Backboard

**Design Requirements:**
- Dark theme (background #0a0a0a or similar)
- Accent color: bright electric blue #3B82F6 or purple #8B5CF6
- Font: Inter or similar clean sans-serif
- All buttons must have hover animations
- Page must be fully responsive (mobile + desktop)

---

### 5.2 Upload Page (`app/upload/page.tsx`)

This page has two inputs: the floor plan image upload and the use case text. It calls the upload API route and then navigates to the processing page.

**Layout:**
Two-column layout on desktop, stacked on mobile.

Left column — Floor Plan Upload:
- Large dashed dropzone area (drag and drop or click to browse)
- Accepts JPG, PNG, WebP files up to 10MB
- On file select: show a thumbnail preview of the uploaded image
- File name and size shown below the preview
- On error: show red error message inline

Right column — Use Case Input:
- Label: "What are you setting up?"
- Large textarea (minimum 4 rows) with placeholder examples that rotate every 3 seconds:
  - "Hackathon with hacking stations along the walls, sponsor booths in the center, and a ceremony stage at the front"
  - "200 person gala with round tables, a dance floor, and a bar on the east wall"
  - "Open office with 40 desks, 3 meeting rooms, and a lounge area near the entrance"
  - "Assembly line with 3 workstations, a forklift path down the center, and storage in the back"
- Character count shown below (minimum 10, maximum 500)

Submit Button:
- Full-width button at the bottom: "Generate My 3D Space →"
- Disabled until both inputs are valid
- On click: POST to `/api/upload`, then navigate to `/processing/{jobId}`
- Loading state: spinner + "Uploading..." text

```typescript
// Key logic in UploadForm.tsx
const handleSubmit = async () => {
  setLoading(true);
  const formData = new FormData();
  formData.append('floorplan', selectedFile);
  formData.append('useCase', useCaseText);

  const response = await fetch('/api/upload', { method: 'POST', body: formData });
  const { jobId } = await response.json();

  router.push(`/processing/${jobId}`);
};
```

---

### 5.3 Processing Page (`app/processing/[jobId]/page.tsx`)

This page shows real-time progress while the AI pipeline runs. It polls the job status API every 2 seconds.

**Layout:**
- Centered vertically and horizontally
- Large progress bar at top (animated fill)
- Current status label in large text below the bar
- Three agent steps shown as a vertical list with icons:
  - Step 1: "Reading floor plan geometry" (Agent 1)
  - Step 2: "Planning object placement" (Agent 2)
  - Step 3: "Assembling 3D scene" (Agent 3)
- Each step shows: waiting (grey circle) → running (spinning blue circle) → done (green checkmark)
- Animated background: subtle particles or flowing grid

**Polling Logic:**
```typescript
// In processing/[jobId]/page.tsx
useEffect(() => {
  const interval = setInterval(async () => {
    const res = await fetch(`/api/job/${jobId}`);
    const data = await res.json();
    setStatus(data.status);
    setProgress(data.progress);
    setLabel(data.label);

    if (data.status === 'complete') {
      clearInterval(interval);
      router.push(`/scene/${data.sceneId}`);
    }
    if (data.status === 'failed') {
      clearInterval(interval);
      setError(data.error);
    }
  }, 2000);

  return () => clearInterval(interval);
}, [jobId]);
```

**Step Status Mapping:**
- Agent 1 running: Step 1 spins, Steps 2+3 grey
- Agent 1 done: Step 1 green, Step 2 starts
- Agent 2 running: Step 1 green, Step 2 spins, Step 3 grey
- Agent 2 done: Steps 1+2 green, Step 3 starts
- Agent 3 running: Steps 1+2 green, Step 3 spins
- Complete: All three green, redirect fires

---

### 5.4 Scene Viewer Page (`app/scene/[sceneId]/page.tsx`)

This page loads the scene JSON and renders it in Three.js. It is the primary product experience.

**Layout:**
- Full screen: Three.js canvas takes the entire viewport
- Floating UI overlay (top-left): Scene title + use case text
- Floating UI overlay (bottom-center): WASD control hints
- Floating UI overlay (top-right): 
  - "Share" button (copies current URL to clipboard)
  - "New Scene" button (navigates back to /upload)
  - "Orbit View" / "Walk Mode" toggle button

**Data Loading:**
```typescript
// In scene/[sceneId]/page.tsx
const [sceneData, setSceneData] = useState<SceneFile | null>(null);

useEffect(() => {
  fetch(`/api/scene/${sceneId}`)
    .then(r => r.json())
    .then(setSceneData);
}, [sceneId]);

if (!sceneData) return <LoadingSpinner />;
return <SceneViewer sceneData={sceneData} />;
```

---

### 5.5 Three.js Scene Component (`components/ThreeScene.tsx`)

This is the most critical frontend component. It receives a `SceneFile` and renders the complete interactive 3D scene.

**Setup:**
```typescript
import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import { SceneFile, SceneObject, Wall } from '@/types/scene';

interface Props {
  sceneData: SceneFile;
  mode: 'walk' | 'orbit';
}
```

**Scene Initialization:**
```typescript
useEffect(() => {
  const canvas = canvasRef.current;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e); // dark blue-grey
  scene.fog = new THREE.Fog(0x1a1a2e, 20, 80); // atmospheric depth

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
  // Start camera in center of the space at eye level
  camera.position.set(
    sceneData.floorplan.width / 2,
    1.7, // eye height in meters
    sceneData.floorplan.depth / 2
  );
  camera.lookAt(sceneData.floorplan.width / 2, 1.7, 0);
}, [sceneData]);
```

**Floor Rendering:**
```typescript
function createFloor(width: number, depth: number): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(width, depth);
  const material = new THREE.MeshLambertMaterial({
    color: 0x2d2d2d, // dark grey floor
  });
  const floor = new THREE.Mesh(geometry, material);
  floor.rotation.x = -Math.PI / 2; // lay flat
  floor.position.set(width / 2, 0, depth / 2);
  floor.receiveShadow = true;
  return floor;
}
```

**Wall Rendering:**
```typescript
function createWall(wall: Wall): THREE.Mesh {
  const dx = wall.x2 - wall.x1;
  const dz = wall.y2 - wall.y1;
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);

  const geometry = new THREE.BoxGeometry(length, wall.height, 0.2);
  const material = new THREE.MeshLambertMaterial({ color: 0x4a4a6a }); // muted blue-grey
  const wallMesh = new THREE.Mesh(geometry, material);

  wallMesh.position.set(
    (wall.x1 + wall.x2) / 2,
    wall.height / 2,
    (wall.y1 + wall.y2) / 2
  );
  wallMesh.rotation.y = -angle;
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  return wallMesh;
}
```

**Object Colors by Type:**
```typescript
const OBJECT_COLORS: Record<string, number> = {
  table:        0x8B6914, // warm brown
  chair:        0x4a7c59, // muted green
  stage:        0x2c5282, // deep blue raised platform
  booth:        0x7b2d8b, // purple
  desk:         0x6b8cae, // steel blue
  podium:       0xd69e2e, // gold
  screen:       0x1a1a2a, // near-black panel
  workstation:  0x4a5568, // industrial grey
  shelf:        0x744210, // dark wood brown
  counter:      0x975a16, // medium brown
  equipment:    0x2d3748, // dark machinery grey
  divider:      0xe2e8f0, // light partition
  plant:        0x276749, // green
  entrance_marker: 0xe53e3e, // red arrow
};
```

**Object Rendering:**
```typescript
function createObject(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();

  // Main geometry
  let geometry: THREE.BufferGeometry;
  switch (obj.type) {
    case 'plant':
      geometry = new THREE.CylinderGeometry(obj.width / 2, obj.width / 2, obj.height, 8);
      break;
    case 'podium':
      geometry = new THREE.CylinderGeometry(obj.width / 3, obj.width / 2, obj.height, 8);
      break;
    default:
      geometry = new THREE.BoxGeometry(obj.width, obj.height, obj.depth);
  }

  const color = OBJECT_COLORS[obj.type] ?? 0x718096;
  const material = new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Position: scene uses Y-up, Three.js uses Y-up
  // Floor plan x → Three.js x, Floor plan y → Three.js z
  mesh.position.set(0, obj.height / 2 + obj.z, 0);
  group.position.set(obj.x, 0, obj.y);
  group.rotation.y = (obj.rotation * Math.PI) / 180;
  group.add(mesh);

  // Label
  const label = createTextLabel(obj.label);
  label.position.set(0, obj.height + 0.3, 0);
  group.add(label);

  return group;
}
```

**Text Labels (CSS2DRenderer):**
Use Three.js CSS2DRenderer for crisp text labels that always face the camera.

```typescript
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';

function createTextLabel(text: string): CSS2DObject {
  const div = document.createElement('div');
  div.textContent = text;
  div.style.cssText = `
    background: rgba(0,0,0,0.7);
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    font-family: Inter, sans-serif;
    white-space: nowrap;
    pointer-events: none;
  `;
  return new CSS2DObject(div);
}
```

**Lighting Setup:**
```typescript
// Ambient light — fills the scene with soft base illumination
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

// Directional light — simulates overhead lighting
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
dirLight.shadow.camera.near = 0.1;
dirLight.shadow.camera.far = 100;
dirLight.shadow.camera.left = -50;
dirLight.shadow.camera.right = 50;
dirLight.shadow.camera.top = 50;
dirLight.shadow.camera.bottom = -50;
scene.add(dirLight);

// Point lights at corners for atmosphere
const pointLight1 = new THREE.PointLight(0x4fc3f7, 0.5, 30);
pointLight1.position.set(5, 4, 5);
scene.add(pointLight1);
```

**WASD First-Person Controls:**
```typescript
const keys: Record<string, boolean> = {};
document.addEventListener('keydown', e => { keys[e.code] = true; });
document.addEventListener('keyup', e => { keys[e.code] = false; });

// Mouse look
let yaw = 0;
let pitch = 0;
canvas.addEventListener('click', () => canvas.requestPointerLock());
document.addEventListener('mousemove', e => {
  if (document.pointerLockElement === canvas) {
    yaw -= e.movementX * 0.002;
    pitch -= e.movementY * 0.002;
    pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch)); // clamp up/down
  }
});

// In animation loop
function updateFirstPerson(camera: THREE.Camera) {
  const speed = 0.08;
  const direction = new THREE.Vector3();

  if (keys['KeyW'] || keys['ArrowUp'])    direction.z -= 1;
  if (keys['KeyS'] || keys['ArrowDown'])  direction.z += 1;
  if (keys['KeyA'] || keys['ArrowLeft'])  direction.x -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) direction.x += 1;

  direction.normalize().multiplyScalar(speed);
  direction.applyEuler(new THREE.Euler(0, yaw, 0));

  camera.position.add(direction);
  camera.position.y = 1.7; // lock eye height

  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
}
```

**Orbit Controls (when mode = 'orbit'):**
```typescript
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(sceneData.floorplan.width / 2, 0, sceneData.floorplan.depth / 2);
controls.maxPolarAngle = Math.PI / 2.1; // prevent going below floor
controls.enableDamping = true;
controls.dampingFactor = 0.05;
```

**Animation Loop:**
```typescript
function animate() {
  requestAnimationFrame(animate);
  if (mode === 'walk') updateFirstPerson(camera);
  if (mode === 'orbit') controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera); // CSS2DRenderer for labels
}
animate();
```

**Window Resize Handler:**
```typescript
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});
```

---

### 5.6 Share Functionality

When the user clicks the "Share" button:

```typescript
const handleShare = async () => {
  const url = window.location.href; // e.g. https://yourdomain.com/scene/{sceneId}
  await navigator.clipboard.writeText(url);
  setShareTooltip('Link copied!');
  setTimeout(() => setShareTooltip('Share'), 2000);
};
```

The scene is permanently stored in Vultr Object Storage, so the URL works forever. Anyone who opens the URL gets the full 3D scene loaded.

---

### 5.7 Required npm Packages (Frontend)

```json
{
  "dependencies": {
    "next": "14.2.0",
    "react": "18.3.0",
    "react-dom": "18.3.0",
    "three": "^0.165.0",
    "typescript": "5.4.0",
    "@types/three": "^0.165.0",
    "tailwindcss": "^3.4.0",
    "uuid": "^9.0.0",
    "@types/uuid": "^9.0.0"
  }
}
```

---

## 6. Person 3 — Vultr Infrastructure

**Your responsibility:** All Vultr services — reconfiguring the existing VPS, Object Storage, and PostgreSQL for this project, and setting up the Firewall and Load Balancer. You also handle deployment of the Next.js app.

**Goal:** By Hour 4, every other person should have working connection strings and can connect to your infrastructure.

---

### 6.1 Existing Services to Reconfigure

You have three existing Vultr services. Each needs to be reconfigured for this project specifically.

**Existing VPS:**
- Wipe or reconfigure the existing application running on it
- Install Node.js 20 LTS
- Install PM2 (process manager)
- Clone the project repository
- Set up environment variables
- Configure Nginx as reverse proxy

**Existing PostgreSQL:**
- Connect and drop any existing tables/databases from the previous project
- Create a new database: `floorplan_ai`
- Create a new user with full access to that database
- Run the SQL schema from Section 4.1
- Provide the connection string to Person 1

**Existing Object Storage:**
- Delete any existing buckets or objects from the previous project
- Create a new bucket: `floorplan-ai-storage`
- Set the bucket to allow public reads (for shareable scene URLs)
- Generate new access key and secret key
- Note the endpoint URL (format: `https://{region}.vultrobjects.com`)
- Provide credentials to Person 1

---

### 6.2 VPS Configuration

**Step 1 — Connect to VPS:**
```bash
ssh root@{YOUR_VPS_IP}
```

**Step 2 — Install Node.js 20:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs
node --version  # should be v20.x.x
```

**Step 3 — Install PM2:**
```bash
npm install -g pm2
```

**Step 4 — Install Nginx:**
```bash
sudo apt update
sudo apt install -y nginx
```

**Step 5 — Clone Repository:**
```bash
cd /var/www
git clone https://github.com/YOUR_ORG/floorplan-ai.git
cd floorplan-ai
npm install
```

**Step 6 — Create Environment File:**
```bash
nano /var/www/floorplan-ai/.env.local
# Paste all environment variables from Section 8
```

**Step 7 — Build the Next.js App:**
```bash
cd /var/www/floorplan-ai
npm run build
```

**Step 8 — Start with PM2:**
```bash
pm2 start npm --name "floorplan-ai" -- start
pm2 save
pm2 startup  # follow the printed command to enable auto-restart
```

**Step 9 — Configure Nginx:**

Create the Nginx config file:
```bash
sudo nano /etc/nginx/sites-available/floorplan-ai
```

Paste this configuration:
```nginx
server {
    listen 80;
    server_name YOUR_VPS_IP;  # replace with IP or domain

    client_max_body_size 20M;  # allow up to 20MB uploads

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;  # allow long AI processing requests
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/floorplan-ai /etc/nginx/sites-enabled/
sudo nginx -t  # test config
sudo systemctl reload nginx
```

**Step 10 — Verify:**
```bash
curl http://YOUR_VPS_IP
# Should return the Next.js HTML
```

---

### 6.3 PostgreSQL Configuration

Connect to the Vultr Managed PostgreSQL instance using the admin credentials from the Vultr dashboard.

```bash
psql "postgresql://admin:{PASSWORD}@{HOST}:{PORT}/defaultdb?sslmode=require"
```

Run these commands:
```sql
-- Create the project database
CREATE DATABASE floorplan_ai;

-- Create the application user
CREATE USER floorplan_app WITH PASSWORD 'GENERATE_STRONG_PASSWORD_HERE';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE floorplan_ai TO floorplan_app;

-- Connect to the new database
\c floorplan_ai

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO floorplan_app;

-- Now run the schema from Section 4.1
-- (paste the full CREATE TABLE statements here)
```

**Connection string format for Person 1:**
```
DATABASE_URL=postgresql://floorplan_app:{PASSWORD}@{HOST}:{PORT}/floorplan_ai?sslmode=require
```

---

### 6.4 Object Storage Configuration

In the Vultr Control Panel:

1. Navigate to Object Storage
2. Delete or empty any existing buckets from the previous project
3. Create a new bucket named: `floorplan-ai-storage`
4. Region: choose the same region as your VPS to minimize latency
5. After creation, go to bucket settings and set Access Control to "Public Read"
6. Navigate to Object Storage → Access Keys
7. Generate a new access key pair
8. Copy the Access Key, Secret Key, and Endpoint URL

**Credentials format for Person 1:**
```
VULTR_STORAGE_ENDPOINT=https://ewr1.vultrobjects.com
VULTR_STORAGE_BUCKET=floorplan-ai-storage
VULTR_STORAGE_ACCESS_KEY=your_access_key_here
VULTR_STORAGE_SECRET_KEY=your_secret_key_here
```

---

### 6.5 Firewall Configuration

In the Vultr Control Panel, navigate to Firewall and create a new Firewall Group called `floorplan-ai-firewall`.

Add these rules:

| Protocol | Port | Source | Description |
|---|---|---|---|
| TCP | 22 | Your team's IP addresses only | SSH access |
| TCP | 80 | 0.0.0.0/0 | HTTP traffic |
| TCP | 443 | 0.0.0.0/0 | HTTPS traffic |
| TCP | 3000 | 127.0.0.1/32 | Next.js internal only |

**Block everything else** — no other inbound ports should be open. This ensures the raw Node.js port (3000) is never directly accessible from outside; all traffic goes through Nginx.

Attach this Firewall Group to the VPS instance in the VPS settings.

---

### 6.6 Load Balancer Configuration

In the Vultr Control Panel, navigate to Load Balancers and create a new Load Balancer.

**Settings:**
- Region: same as VPS
- Label: `floorplan-ai-lb`
- Protocol: HTTP
- Port: 80
- Backend Protocol: HTTP
- Backend Port: 80 (Nginx)
- Health Check Path: `/api/health` (a simple route that returns 200 OK)
- Health Check Interval: 10 seconds

**Add your VPS as a backend instance.**

**Health check route** — add this to the API routes (quick task, tell Person 1):
```typescript
// app/api/health/route.ts
export async function GET() {
  return new Response('OK', { status: 200 });
}
```

After setup, the Load Balancer will provide an IP address. Point your demo domain or use that IP as the public endpoint. Update the Nginx `server_name` to match.

---

### 6.7 Deployment Updates

Every time the team pushes code, run these commands on the VPS to deploy:

```bash
cd /var/www/floorplan-ai
git pull origin main
npm install
npm run build
pm2 restart floorplan-ai
```

Set up a deployment script at `/var/www/deploy.sh`:
```bash
#!/bin/bash
set -e
cd /var/www/floorplan-ai
git pull origin main
npm install --production
npm run build
pm2 restart floorplan-ai
echo "Deployment complete at $(date)"
```

```bash
chmod +x /var/www/deploy.sh
```

Team members can trigger a deploy by running:
```bash
ssh root@{VPS_IP} '/var/www/deploy.sh'
```

---

## 7. Person 4 — Demo & Polish

**Your time is limited. These are your tasks in priority order. Do not move to the next task until the current one is complete.**

---

### Task 1 — BearHacks Floor Plan Preparation (Priority: Critical)

Obtain the SSU Atrium floor plan. If you do not have a digital copy:
- Search the university website or email the event organizers
- Take a clear overhead photo if a physical copy is available
- As a last resort, create a simplified hand-drawn version and photograph it — Gemini can still extract the geometry

Save the floor plan as: `public/demo/bearhacks-floorplan.jpg`

Requirements for the image:
- Clear, readable — walls and rooms visible
- Minimum 800x600 pixels
- JPG or PNG format
- Under 5MB

---

### Task 2 — Demo Scene Pre-generation (Priority: Critical)

Once Person 1 has the pipeline working and Person 3 has infrastructure live, run the demo seed script:

```bash
cd /var/www/floorplan-ai
npx ts-node scripts/seed-demo.ts
```

This generates the BearHacks scene in advance. Write down the Scene ID it outputs. This is your demo URL:
```
http://{YOUR_DOMAIN}/scene/{SCENE_ID}
```

Test the scene thoroughly:
- Walk through it in first-person
- Switch to orbit mode and inspect from above
- Verify hacking stations are along walls
- Verify sponsor booths are in the center
- Verify the ceremony stage is at the front
- Verify all labels are readable

If the AI placement is off, re-run the seed script — it generates a new scene each time.

---

### Task 3 — Demo Rehearsal Script (Priority: High)

Write a 3-minute verbal demo script. Practice it until you can deliver it without notes.

```
"We're FloorPlan AI. The problem: configuring any space — 
an event, a hackathon, a factory — requires expensive software, 
technical expertise, or just your imagination staring at a flat PDF.

We fix that. Upload any floor plan. Describe what you need in plain English. 
Walk through your configured space in 3D. In seconds.

Here's the room you're sitting in right now. [show BearHacks floor plan]

We type: 'hackathon with hacking stations along the walls, 
sponsor booths in the center, and a ceremony stage at the front.'

[navigate to pre-generated scene]

There it is. The SSU Atrium — configured for BearHacks — in 3D. 
We can walk through it, look around, see every object labeled.

This works for any use case. Events, offices, factories. 
Same product, any space, any configuration, any use case.

Built on Vultr compute, Vultr Object Storage, Vultr PostgreSQL. 
Every scene is shareable — anyone on your team can walk through it 
from anywhere in the world via a single link.

That's FloorPlan AI."
```

---

### Task 4 — Backup Demo Preparation (Priority: High)

Prepare a fully offline backup in case the live internet connection fails during the demo.

1. After Task 2, export the pre-generated scene JSON locally
2. Create a static HTML file that embeds the scene JSON directly and renders it with Three.js from a CDN
3. Host it via `npx serve` or Python's `http.server` locally
4. Test it works with no internet by disconnecting from WiFi

This is your failsafe. If anything breaks during the live demo, open this file.

---

### Task 5 — Demo Video Recording (Priority: Medium, if time allows)

Record a 60-90 second screen recording showing:
1. The landing page (5 seconds)
2. Uploading the BearHacks floor plan (10 seconds)
3. Typing the use case prompt (10 seconds)
4. The progress indicators running (10 seconds)
5. The 3D scene loading (5 seconds)
6. Walking through the space in first-person (30 seconds)
7. Switching to orbit view (15 seconds)
8. Clicking the share button (5 seconds)

Use QuickTime (Mac) or OBS (Windows/Linux). Export as MP4. Submit as required by BearHacks.

---

## 8. Environment Variables

Create a `.env.local` file in the project root. Person 3 provides the Vultr values. Person 1 provides the Gemini API key. All team members need a copy of this file.

```bash
# ==========================================
# GEMINI API
# ==========================================
GEMINI_API_KEY=your_gemini_api_key_here

# ==========================================
# VULTR POSTGRESQL
# ==========================================
DATABASE_URL=postgresql://floorplan_app:PASSWORD@HOST:PORT/floorplan_ai?sslmode=require

# ==========================================
# VULTR OBJECT STORAGE
# ==========================================
VULTR_STORAGE_ENDPOINT=https://ewr1.vultrobjects.com
VULTR_STORAGE_BUCKET=floorplan-ai-storage
VULTR_STORAGE_ACCESS_KEY=your_access_key
VULTR_STORAGE_SECRET_KEY=your_secret_key

# ==========================================
# APP CONFIG
# ==========================================
NEXT_PUBLIC_APP_URL=http://YOUR_VPS_IP_OR_DOMAIN
NODE_ENV=production
```

---

## 9. Build Order & Milestones

**Follow this order exactly. Every milestone must be verified before moving forward.**

### Hours 1–2: Foundation

- [ ] **All:** Clone repo, install dependencies, copy env file
- [ ] **Person 1:** Write `types/scene.ts` — the full schema. This is reviewed by everyone before anything else is built.
- [ ] **Person 3:** Reconfigure existing Vultr services. Have PostgreSQL connection string and Object Storage credentials ready by Hour 2.
- [ ] **Person 2:** Set up Next.js project structure. Create all empty page and component files with placeholder content.

**Milestone:** Connection strings work. Schema is agreed upon. Everyone can run `npm run dev`.

---

### Hours 3–6: Core Pipeline

- [ ] **Person 1:** Implement `lib/db.ts`, `lib/storage.ts`, `lib/gemini.ts`
- [ ] **Person 1:** Implement Agent 1. Test it against a sample floor plan image. Verify it returns valid FloorPlan JSON.
- [ ] **Person 1:** Implement Agent 2. Test it with Agent 1's output. Verify object placement JSON.
- [ ] **Person 1:** Implement Agent 3 + full pipeline in `lib/backboard.ts`
- [ ] **Person 1:** Implement all three API routes
- [ ] **Person 3:** VPS running, Nginx configured, app deployed

**Milestone:** POST to `/api/upload` with a floor plan image and use case text returns a job ID. Polling `/api/job/{id}` shows status progressing. Scene JSON appears in Object Storage.

---

### Hours 7–12: 3D Rendering

- [ ] **Person 2:** Implement `components/ThreeScene.tsx` — floor, walls, and objects rendering from scene JSON
- [ ] **Person 2:** WASD navigation and mouse look working
- [ ] **Person 2:** Orbit controls working
- [ ] **Person 2:** Object labels rendering
- [ ] **Person 2:** Scene viewer page (`/scene/[sceneId]`) loading scene from API

**Milestone:** Opening `/scene/{sceneId}` shows a 3D scene you can walk through. Objects are placed correctly. Labels are visible.

---

### Hours 13–16: UI & Polish

- [ ] **Person 2:** Landing page — complete with all sections, animations, fully responsive
- [ ] **Person 2:** Upload page — drag and drop working, preview showing, form submitting
- [ ] **Person 2:** Processing page — real-time progress polling, step indicators, animations
- [ ] **Person 3:** Firewall configured, Load Balancer live
- [ ] **Person 4:** BearHacks floor plan image ready in `public/demo/`

**Milestone:** Full user flow works end-to-end. Upload → processing → 3D scene. Landing page is beautiful.

---

### Hours 17–20: Demo Preparation

- [ ] **Person 4:** Run `seed-demo.ts`. Demo scene URL confirmed working.
- [ ] **Person 4:** Walk through demo scene. Verify layout is correct for BearHacks.
- [ ] **All:** Full end-to-end run-through with a different floor plan to verify it works for new inputs
- [ ] **Person 4:** Demo rehearsal complete
- [ ] **Person 4:** Backup offline demo ready
- [ ] **Person 4:** Demo video recorded if time allows

**Milestone:** You can demo the full product in under 3 minutes without notes. The BearHacks scene loads instantly. The judges see their own room in 3D.

---

## 10. Inter-Person Dependencies

This table shows who is blocked waiting for whom. Coordinate on these first.

| Who is blocked | Waiting for | What they need | By when |
|---|---|---|---|
| Person 1 | Person 3 | DATABASE_URL connection string | Hour 2 |
| Person 1 | Person 3 | Vultr Object Storage credentials | Hour 2 |
| Person 2 | Person 1 | `/api/upload` route working | Hour 6 |
| Person 2 | Person 1 | `/api/job/[jobId]` route working | Hour 6 |
| Person 2 | Person 1 | `/api/scene/[sceneId]` route working | Hour 6 |
| Person 2 | Person 1 | Example scene JSON to develop against | Hour 4 |
| Person 4 | Person 1 + 3 | Pipeline + infrastructure fully working | Hour 16 |
| Person 4 | Person 2 | Scene viewer showing correct demo layout | Hour 16 |

**For Person 2, Hour 4 unblock:** Person 1 should produce one valid example scene JSON file and commit it to the repo at `public/demo/example-scene.json`. Person 2 loads this hardcoded file locally to develop the Three.js renderer without waiting for the full pipeline.

---

*This document was created for BearHacks. Every section is authoritative. Do not deviate from the JSON schema in Section 2. If you need to make changes, update this document first so all agents and team members are in sync.*
