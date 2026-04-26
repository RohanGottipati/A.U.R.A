import type { SceneFile, SceneObject } from "@/types/scene";

// ─────────────────────────────────────────────────────────────────────────────
// Hardcoded "Test.webp" demo flow
// ─────────────────────────────────────────────────────────────────────────────
// When the user uploads a file literally named `Test.webp` (the asset that
// lives at /public/Test.webp), we bypass the real Gemini pipeline entirely and
// drive a deterministic, fast-but-realistic loading sequence followed by a
// pre-baked 3D scene. The user-supplied API key is ignored. This is purely a
// presentation flow for demos / screen-recordings — the rest of the app is
// untouched.

export const DEMO_JOB_PREFIX = "demo-";
export const DEMO_SCENE_PREFIX = "demo-scene-";
export const DEMO_FLOORPLAN_FILENAME = "Test.webp";
export const DEMO_FLOORPLAN_PUBLIC_URL = "/Test.webp";
export const DEMO_DEFAULT_USE_CASE =
  "Single-story 2400 SF residence — master suite with walk-in closet and ensuite bath, open kitchen / dining with centre island, living room with L-shaped sofa facing a wall-mounted TV, two additional bedrooms sharing a full bathroom, dedicated office / 4th bedroom, and a laundry room. Porch off the living room.";

export function isDemoJobId(jobId: string): boolean {
  return jobId.startsWith(DEMO_JOB_PREFIX) && !jobId.startsWith(DEMO_SCENE_PREFIX);
}
export function isDemoSceneId(sceneId: string): boolean {
  return sceneId.startsWith(DEMO_SCENE_PREFIX);
}

export function demoSceneIdForJob(jobId: string): string {
  // Deterministic: same jobId → same sceneId, so polling + redirect line up.
  return `${DEMO_SCENE_PREFIX}${jobId.slice(DEMO_JOB_PREFIX.length)}`;
}

function parseStartedAt(jobId: string): number | null {
  const tail = jobId.slice(DEMO_JOB_PREFIX.length);
  const ts = Number.parseInt(tail, 10);
  if (!Number.isFinite(ts) || ts <= 0) return null;
  return ts;
}

// In-memory side table so the user's actual scene brief (typed in the upload
// form) propagates into the rendered scene's sidebar. Best-effort: serverless
// cold starts will fall back to DEMO_DEFAULT_USE_CASE, which still reads as a
// coherent hackathon brief alongside the hardcoded objects.
const demoUseCases = new Map<string, string>();

// Edited copies of the demo scene live here when the user clicks "Save". The
// scene endpoint checks this map first so demo saves persist across refreshes
// (within the same server lifetime — there's no DB / object storage backing
// the demo flow).
const demoSceneOverrides = new Map<string, SceneObject[]>();

export function rememberDemoSceneObjects(
  sceneId: string,
  objects: SceneObject[],
): void {
  demoSceneOverrides.set(sceneId, objects.map((o) => ({ ...o })));
}

export function recallDemoSceneObjects(sceneId: string): SceneObject[] | null {
  const stored = demoSceneOverrides.get(sceneId);
  return stored ? stored.map((o) => ({ ...o })) : null;
}

export function rememberDemoUseCase(jobId: string, useCase: string): void {
  const cleaned = useCase.trim();
  if (cleaned) demoUseCases.set(jobId, cleaned);
}

export function recallDemoUseCase(jobOrSceneId: string): string {
  // The scene endpoint receives the sceneId (`demo-scene-<ts>`) but our map is
  // keyed by jobId (`demo-<ts>`). Translate either direction transparently.
  let jobId = jobOrSceneId;
  if (jobOrSceneId.startsWith(DEMO_SCENE_PREFIX)) {
    jobId = `${DEMO_JOB_PREFIX}${jobOrSceneId.slice(DEMO_SCENE_PREFIX.length)}`;
  }
  return demoUseCases.get(jobId) ?? DEMO_DEFAULT_USE_CASE;
}

// ─── Synthetic pipeline status timeline ─────────────────────────────────────
//
// Polling fires every 2s on the client (see ProgressTracker). With this
// timeline the user sees the bar jump 5% → 55% at the first poll (~2s), then
// 90% at the second (~4s), then 100% / redirect at the third (~6s). Total
// perceived load: ~6 seconds — quick but with three visible "stage" beats.

interface DemoStatusFrame {
  status: string;
  label: string;
  progress: number;
}

const DEMO_TIMELINE: ReadonlyArray<{ untilMs: number; frame: DemoStatusFrame }> = [
  { untilMs: 1500, frame: { status: "agent1_running", label: "Reading floor plan geometry…", progress: 20 } },
  { untilMs: 3000, frame: { status: "agent2_running", label: "Planning object placement…", progress: 55 } },
  { untilMs: 4500, frame: { status: "agent3_running", label: "Assembling 3D scene…", progress: 90 } },
];
const DEMO_TIMELINE_COMPLETE: DemoStatusFrame = {
  status: "complete",
  label: "Scene ready!",
  progress: 100,
};

export interface DemoJobStatus {
  status: string;
  label: string;
  progress: number;
  sceneId: string | null;
  error: string | null;
}

export function getDemoJobStatus(jobId: string): DemoJobStatus | null {
  if (!isDemoJobId(jobId)) return null;

  const startedAt = parseStartedAt(jobId);
  if (startedAt == null) {
    return {
      status: "failed",
      label: "Demo session expired",
      progress: 0,
      sceneId: null,
      error: "Demo job id was malformed; re-upload Test.webp to retry.",
    };
  }

  const elapsed = Math.max(0, Date.now() - startedAt);
  for (const slot of DEMO_TIMELINE) {
    if (elapsed < slot.untilMs) {
      return { ...slot.frame, sceneId: null, error: null };
    }
  }
  return {
    ...DEMO_TIMELINE_COMPLETE,
    sceneId: demoSceneIdForJob(jobId),
    error: null,
  };
}

// ─── Hardcoded scene file ───────────────────────────────────────────────────
//
// Built to mirror /public/Test.webp — the 60' × 40' (18.3m × 12.2m) ground
// floor plan, ~2400 SF, three bedrooms / three bathrooms / kitchen-dining /
// living room / laundry / office. North is +y of zero (top of the image), the
// porch sits on the south side. Coordinates are in metres, top-left origin.

const FT = 0.3048;
const FLOOR_W = 60 * FT;   // 18.288 m
const FLOOR_D = 40 * FT;   // 12.192 m
const WALL_H = 2.7;        // 2.7 m / ~9 ft ceilings

// Room rectangles (top-left x, y; width, height).
const ROOMS = [
  {
    id: "room_master_bath",
    name: "Master Bathroom",
    x: 0,             y: 0,
    width: 2.40,      height: 2.40,
    type: "bathroom" as const,
  },
  {
    id: "room_walk_closet",
    name: "Walk-In Closet",
    x: 0,             y: 2.40,
    width: 2.10,      height: 2.60,
    type: "storage" as const,
  },
  {
    id: "room_master_bedroom",
    name: "Master Bedroom",
    x: 2.40,          y: 0,
    width: 4.60,      height: 3.40,
    type: "unknown" as const,
  },
  {
    id: "room_bath_small",
    name: "Bathroom",
    x: 2.10,          y: 3.40,
    width: 2.40,      height: 1.60,
    type: "bathroom" as const,
  },
  {
    id: "room_laundry",
    name: "Laundry",
    x: 0,             y: 5.00,
    width: 3.70,      height: 3.00,
    type: "storage" as const,
  },
  {
    id: "room_office",
    name: "Office / Bedroom",
    x: 3.70,          y: 5.00,
    width: 3.30,      height: 4.50,
    type: "office" as const,
  },
  {
    id: "room_kitchen",
    name: "Kitchen / Dining",
    x: 7.00,          y: 0,
    width: 6.10,      height: 6.40,
    type: "kitchen" as const,
  },
  {
    id: "room_living",
    name: "Living Room",
    x: 7.00,          y: 6.40,
    width: 6.10,      height: 5.79,
    type: "main_hall" as const,
  },
  {
    id: "room_bedroom_3",
    name: "Bedroom #3",
    x: 13.10,         y: 0,
    width: 5.19,      height: 4.40,
    type: "unknown" as const,
  },
  {
    id: "room_bath_main",
    name: "Bathroom",
    x: 14.60,         y: 4.40,
    width: 3.69,      height: 4.00,
    type: "bathroom" as const,
  },
  {
    id: "room_bedroom_2",
    name: "Bedroom #2",
    x: 13.10,         y: 8.40,
    width: 5.19,      height: 3.79,
    type: "unknown" as const,
  },
];

// Wall segments — outer perimeter is broken at the front double-doors and the
// porch entry; interior partitions match the room rectangles above with door
// gaps that exactly fit the door SceneObjects defined further down.
//
// Convention used throughout this file:
//   • DOOR (0.9 m wide) lives in a 0.95 m wall gap
//   • DOOR_DBL (1.8 m wide) lives in a 1.85 m wall gap
//   • Every door object's centre coordinates are the midpoint of its gap, so
//     the slab and the wall opening are pixel-aligned — no floating doors and
//     no doors clipping into walls.
function w(x1: number, y1: number, x2: number, y2: number, height: number = WALL_H) {
  return { x1, y1, x2, y2, height };
}

// Wall geometry for the floor plan. Door gaps are kept consistent with the
// door SceneObjects defined further down — every gap is sized to fit exactly
// one door (0.95 m for a single, 1.85 m for a double).
const WALLS = [
  // ── Outer perimeter ──────────────────────────────────────────────────
  // North wall — solid (no front entry on this side; access is from the
  // porch double-door on the south wall).
  w(0, 0, 18.29, 0),
  // East wall — solid full height.
  w(18.29, 0,     18.29, 12.19),
  // South wall: porch double-door into the living room.
  w(18.29, 12.19, 12.35, 12.19),
  w(10.50, 12.19, 0,     12.19),
  // West wall — solid.
  w(0,     12.19, 0,     0),

  // ── Master suite ─────────────────────────────────────────────────────
  // Master bath east wall (door at y = 1.00..1.95 → master bedroom)
  w(2.40, 0,    2.40, 1.00),
  w(2.40, 1.95, 2.40, 2.40),
  // Master bath south wall (door at x = 0.60..1.55 → walk-in closet)
  w(0,    2.40, 0.60, 2.40),
  w(1.55, 2.40, 2.40, 2.40),
  // Walk-in closet east wall — solid (closet only entered via master bath)
  w(2.10, 2.40, 2.10, 5.00),
  // Master bedroom west wall (segment between closet and corridor_w)
  w(2.40, 2.40, 2.40, 3.40),
  // Master bedroom south wall (door at x = 5.50..6.45 → corridor_w)
  w(2.40, 3.40, 5.50, 3.40),
  w(6.45, 3.40, 7.00, 3.40),
  // Bath_small east wall (door at y = 3.70..4.65 → corridor_w)
  w(4.50, 3.40, 4.50, 3.70),
  w(4.50, 4.65, 4.50, 5.00),

  // ── West wing mid-row (y = 5.00) ────────────────────────────────────
  // Walk-in closet south + bath_small south + corridor_w south — all solid.
  w(0,    5.00, 2.10, 5.00),
  w(2.10, 5.00, 4.50, 5.00),
  w(4.50, 5.00, 7.00, 5.00),

  // ── Laundry / Office / south foyer ───────────────────────────────────
  // Laundry/office shared wall (door at y = 6.50..7.45)
  w(3.70, 5.00, 3.70, 6.50),
  w(3.70, 7.45, 3.70, 8.00),
  // Office's west wall continues south to seal off the foyer below laundry
  w(3.70, 8.00, 3.70, 9.50),
  // Laundry south wall — solid (laundry doesn't open to the foyer)
  w(0,    8.00, 3.70, 8.00),
  // Office south wall (door at x = 4.50..5.45 → south foyer)
  w(3.70, 9.50, 4.50, 9.50),
  w(5.45, 9.50, 7.00, 9.50),

  // ── West wing / centre divider (x = 7.00, full height) ──────────────
  w(7.00, 0,    7.00, 4.05),                       // master bedroom + corridor_w (north)
  w(7.00, 5.00, 7.00, 9.00),                       // gap y = 4.05..5.00 → corridor_w↔kitchen
  w(7.00, 9.95, 7.00, 12.19),                      // gap y = 9.00..9.95 → office↔living

  // ── Centre / east divider (x = 13.10, full height) ─────────────────
  w(13.10, 0,    13.10, 5.50),                     // kitchen east + bedroom 3 west
  w(13.10, 6.45, 13.10, 12.19),                    // gap y = 5.50..6.45 → living↔east corridor

  // ── East wing partitions ────────────────────────────────────────────
  // Bedroom #3 south wall (door at x = 13.55..14.50 → east corridor)
  w(13.10, 4.40, 13.55, 4.40),
  w(14.50, 4.40, 18.29, 4.40),
  // East corridor / bath_main divider (door at y = 6.00..6.95)
  w(14.60, 4.40, 14.60, 6.00),
  w(14.60, 6.95, 14.60, 8.40),
  // Bedroom #2 north wall (door at x = 13.55..14.50 → east corridor)
  w(13.10, 8.40, 13.55, 8.40),
  w(14.50, 8.40, 18.29, 8.40),
];

function obj(
  id: string,
  type: SceneObject["type"],
  roomId: string,
  x: number,
  y: number,
  rotation: number,
  size: { width: number; depth: number; height: number },
  label: string,
): SceneObject {
  return {
    id, type, roomId, x, y, z: 0,
    width: size.width, depth: size.depth, height: size.height,
    rotation, label,
  };
}

// Standard furniture footprints (all metres).
const TABLE_DINING = { width: 2.4,  depth: 1.1,  height: 0.75 };
const CHAIR        = { width: 0.5,  depth: 0.5,  height: 0.9  };
const COUCH_3SEAT  = { width: 2.4,  depth: 0.95, height: 0.85 };
const COUCH_2SEAT  = { width: 1.7,  depth: 0.95, height: 0.85 };
const COFFEE_TABLE = { width: 1.2,  depth: 0.7,  height: 0.4  };
const SCREEN_TV    = { width: 1.6,  depth: 0.1,  height: 1.0  };
const BED_KING     = { width: 2.0,  depth: 2.1,  height: 0.65 };
const BED_QUEEN    = { width: 1.6,  depth: 2.0,  height: 0.6  };
const NIGHTSTAND   = { width: 0.5,  depth: 0.4,  height: 0.55 };
const DESK         = { width: 1.5,  depth: 0.8,  height: 0.75 };
const SHELF        = { width: 1.0,  depth: 0.4,  height: 1.8  };
const SHELF_LONG   = { width: 1.6,  depth: 0.4,  height: 1.8  };
const COUNTER_ISLD = { width: 2.6,  depth: 1.0,  height: 0.9  };
const PLANT        = { width: 0.6,  depth: 0.6,  height: 1.5  };
const TOILET       = { width: 0.5,  depth: 0.7,  height: 0.85 };
const SINK         = { width: 0.7,  depth: 0.5,  height: 0.9  };
const BATHTUB      = { width: 1.7,  depth: 0.75, height: 0.55 };
const DOOR         = { width: 0.9,  depth: 0.1,  height: 2.05 };
const DOOR_DBL     = { width: 1.8,  depth: 0.1,  height: 2.05 };
const W_D_UNIT     = { width: 1.4,  depth: 0.7,  height: 0.95 }; // washer + dryer pair

function buildObjects(): SceneObject[] {
  const out: SceneObject[] = [];

  // ── Master Bathroom ────────────────────────────────────────────────
  out.push(obj("obj_mb_toilet", "toilet", "room_master_bath", 0.45, 1.95, 90, TOILET, "Toilet"));
  out.push(obj("obj_mb_vanity", "sink",   "room_master_bath", 1.85, 0.35, 0,   { width: 0.5, depth: 0.5, height: 0.9 }, "Vanity Sink"));
  out.push(obj("obj_mb_vanity2","sink",   "room_master_bath", 1.20, 0.35, 0,   { width: 0.5, depth: 0.5, height: 0.9 }, "Vanity Sink"));
  out.push(obj("obj_mb_tub",    "bathtub","room_master_bath", 0.50, 0.80, 90,  { width: 1.6, depth: 0.7, height: 0.55 }, "Soaking Tub"));

  // ── Walk-In Closet ────────────────────────────────────────────────
  out.push(obj("obj_wc_shelf1", "shelf",   "room_walk_closet", 0.30, 3.20, 90, { width: 1.4, depth: 0.4, height: 2.0 }, "Closet Shelves"));
  out.push(obj("obj_wc_shelf2", "shelf",   "room_walk_closet", 1.85, 3.20, 270,{ width: 1.4, depth: 0.4, height: 2.0 }, "Closet Shelves"));
  out.push(obj("obj_wc_wardr",  "shelf",   "room_walk_closet", 1.05, 4.70, 0,  { width: 1.6, depth: 0.4, height: 2.0 }, "Wardrobe"));

  // ── Master Bedroom ────────────────────────────────────────────────
  out.push(obj("obj_mb_bed",   "bed",   "room_master_bedroom", 4.70, 1.10, 0, BED_KING,    "King Bed"));
  out.push(obj("obj_mb_ns_l", "shelf", "room_master_bedroom", 3.55, 0.30, 0, NIGHTSTAND,  "Nightstand"));
  out.push(obj("obj_mb_ns_r", "shelf", "room_master_bedroom", 5.85, 0.30, 0, NIGHTSTAND,  "Nightstand"));
  out.push(obj("obj_mb_dresser","shelf","room_master_bedroom", 6.55, 1.70, 270, { width: 1.4, depth: 0.5, height: 1.0 }, "Dresser"));
  out.push(obj("obj_mb_plant",  "plant","room_master_bedroom", 6.65, 3.10, 0, PLANT, "Floor Plant"));

  // ── Small Bathroom ────────────────────────────────────────────────
  out.push(obj("obj_bs_toilet", "toilet", "room_bath_small", 2.45, 4.60, 270, TOILET, "Toilet"));
  out.push(obj("obj_bs_sink",   "sink",   "room_bath_small", 4.20, 4.20, 270, SINK,   "Sink"));
  out.push(obj("obj_bs_shelf",  "shelf",  "room_bath_small", 2.90, 3.60, 0,   { width: 0.6, depth: 0.3, height: 1.0 }, "Linen Shelf"));

  // ── Laundry ───────────────────────────────────────────────────────
  out.push(obj("obj_l_wd",     "equipment", "room_laundry", 1.10, 5.40, 0, W_D_UNIT, "Washer / Dryer"));
  out.push(obj("obj_l_counter","counter",   "room_laundry", 2.70, 5.40, 0, { width: 1.8, depth: 0.6, height: 0.9 }, "Folding Counter"));
  out.push(obj("obj_l_sink",   "sink",      "room_laundry", 0.40, 7.55, 90, SINK, "Utility Sink"));
  out.push(obj("obj_l_shelf",  "shelf",     "room_laundry", 3.45, 7.40, 270, SHELF, "Storage Shelf"));

  // ── Office / Bedroom ──────────────────────────────────────────────
  out.push(obj("obj_o_desk",   "desk",   "room_office", 5.20, 5.50, 0, DESK, "Desk"));
  out.push(obj("obj_o_chair",  "chair",  "room_office", 5.20, 6.20, 180, CHAIR, "Office Chair"));
  out.push(obj("obj_o_screen", "screen", "room_office", 5.20, 5.10, 0, { width: 1.0, depth: 0.1, height: 0.6 }, "Monitor"));
  out.push(obj("obj_o_shelf",  "shelf",  "room_office", 6.75, 7.20, 270, SHELF_LONG, "Bookshelf"));
  out.push(obj("obj_o_chair2", "chair",  "room_office", 4.10, 8.00, 0, { width: 0.7, depth: 0.7, height: 0.85 }, "Reading Chair"));
  out.push(obj("obj_o_plant",  "plant",  "room_office", 3.95, 8.65, 0, PLANT, "Plant"));

  // ── Kitchen / Dining ──────────────────────────────────────────────
  // Kitchen run along the north wall (with stove + sink built in).
  out.push(obj("obj_k_run",    "kitchen_unit", "room_kitchen", 9.20, 0.40, 180, { width: 4.4, depth: 0.7, height: 0.9 }, "Kitchen Counter Run"));
  out.push(obj("obj_k_run2",   "kitchen_unit", "room_kitchen", 7.45, 1.85, 270, { width: 2.4, depth: 0.65, height: 0.9 }, "Stove + Cabinets"));
  // Centre island
  out.push(obj("obj_k_island", "counter",      "room_kitchen", 9.40, 2.80, 0, COUNTER_ISLD, "Kitchen Island"));
  // Dining table near south end of kitchen (4 chairs)
  out.push(obj("obj_k_table",  "table",        "room_kitchen", 11.10, 4.40, 0, TABLE_DINING, "Dining Table"));
  out.push(obj("obj_k_chair1", "chair",        "room_kitchen", 11.10, 3.65, 180, CHAIR, "Chair"));
  out.push(obj("obj_k_chair2", "chair",        "room_kitchen", 11.10, 5.15, 0,   CHAIR, "Chair"));
  out.push(obj("obj_k_chair3", "chair",        "room_kitchen", 10.20, 4.40, 90,  CHAIR, "Chair"));
  out.push(obj("obj_k_chair4", "chair",        "room_kitchen", 12.00, 4.40, 270, CHAIR, "Chair"));
  out.push(obj("obj_k_plant",  "plant",        "room_kitchen", 12.55, 0.45, 0,   PLANT, "Plant"));

  // ── Living Room ───────────────────────────────────────────────────
  // L-shaped sofa (3-seat against south, 2-seat perpendicular) facing the TV
  out.push(obj("obj_lr_sofa3", "chair", "room_living", 9.40,  11.50, 0, COUCH_3SEAT, "3-Seat Sofa"));
  out.push(obj("obj_lr_sofa2", "chair", "room_living", 11.55, 10.40, 90, COUCH_2SEAT, "Loveseat"));
  out.push(obj("obj_lr_armch", "chair", "room_living", 8.10,  9.30, 90, { width: 0.9, depth: 0.95, height: 0.85 }, "Armchair"));
  // Coffee table in the centre
  out.push(obj("obj_lr_coffee","table", "room_living", 9.80,  10.30, 0, COFFEE_TABLE, "Coffee Table"));
  // TV mounted on the west wall facing east
  out.push(obj("obj_lr_tv",    "screen", "room_living", 7.15,  9.30, 90, SCREEN_TV, "Smart TV"));
  // Side / accent furniture
  out.push(obj("obj_lr_shelf", "shelf",  "room_living", 7.30,  11.80, 0, { width: 0.8, depth: 0.4, height: 1.4 }, "Media Console"));
  out.push(obj("obj_lr_plant1","plant",  "room_living", 12.70, 11.80, 0, PLANT, "Plant"));
  out.push(obj("obj_lr_plant2","plant",  "room_living", 12.70, 6.80,  0, PLANT, "Plant"));

  // ── Bedroom #3 ────────────────────────────────────────────────────
  out.push(obj("obj_b3_bed",   "bed",   "room_bedroom_3", 16.50, 1.30, 0, BED_QUEEN, "Queen Bed"));
  out.push(obj("obj_b3_ns",    "shelf", "room_bedroom_3", 17.85, 0.45, 0, NIGHTSTAND, "Nightstand"));
  out.push(obj("obj_b3_dresser","shelf","room_bedroom_3", 13.85, 1.10, 90, { width: 1.4, depth: 0.5, height: 1.0 }, "Dresser"));
  out.push(obj("obj_b3_chair", "chair", "room_bedroom_3", 13.65, 3.80, 90, { width: 0.7, depth: 0.7, height: 0.85 }, "Reading Chair"));

  // ── Main Bathroom ─────────────────────────────────────────────────
  // Double-vanity along east wall, tub on the far east wall, toilet on south wall.
  out.push(obj("obj_bm_van1", "sink",    "room_bath_main", 14.90, 4.75, 0, SINK,   "Vanity Sink"));
  out.push(obj("obj_bm_van2", "sink",    "room_bath_main", 15.95, 4.75, 0, SINK,   "Vanity Sink"));
  out.push(obj("obj_bm_tub",  "bathtub", "room_bath_main", 17.30, 5.20, 90,BATHTUB, "Bathtub"));
  out.push(obj("obj_bm_toi",  "toilet",  "room_bath_main", 15.10, 8.00, 0, TOILET, "Toilet"));
  out.push(obj("obj_bm_shelf","shelf",   "room_bath_main", 17.85, 7.95, 0, { width: 0.6, depth: 0.3, height: 1.4 }, "Linen Shelf"));

  // ── Bedroom #2 ────────────────────────────────────────────────────
  out.push(obj("obj_b2_bed",     "bed",   "room_bedroom_2", 16.50, 9.80, 0, BED_KING, "King Bed"));
  out.push(obj("obj_b2_ns_l",   "shelf", "room_bedroom_2", 15.30, 8.95, 0, NIGHTSTAND, "Nightstand"));
  out.push(obj("obj_b2_ns_r",   "shelf", "room_bedroom_2", 17.70, 8.95, 0, NIGHTSTAND, "Nightstand"));
  out.push(obj("obj_b2_wardrobe","shelf","room_bedroom_2", 13.85, 11.45, 0, { width: 1.5, depth: 0.5, height: 2.0 }, "Wardrobe"));
  out.push(obj("obj_b2_chair",  "chair","room_bedroom_2", 13.85, 9.10, 90, { width: 0.7, depth: 0.7, height: 0.85 }, "Reading Chair"));
  out.push(obj("obj_b2_plant",  "plant","room_bedroom_2", 14.95, 11.85, 0, PLANT, "Plant"));

  // ── Doors ─────────────────────────────────────────────────────────
  // Convention: each door is centred in its wall gap (gap and door dimensions
  // share a 5 cm tolerance, so the slab fits cleanly inside the opening).
  //
  //   • Rotation 0   = door on a horizontal wall, slab swings south into +y
  //   • Rotation 180 = door on a horizontal wall, slab swings north into -y
  //   • Rotation 90  = door on a vertical wall, slab swings west into -x
  //   • Rotation 270 = door on a vertical wall, slab swings east into +x
  //
  // Porch entry (the only exterior door — south side of the living room).
  out.push(obj("obj_door_porch", "door", "room_living", 11.425, 12.19, 180, DOOR_DBL, "Porch Door"));

  // Master suite (interior 0.9 m doors).
  out.push(obj("obj_door_mb_mbath", "door", "room_master_bath",    2.40, 1.475, 90,  DOOR, "Bath Door"));
  out.push(obj("obj_door_mb_wc",    "door", "room_walk_closet",    1.075, 2.40, 0,   DOOR, "Closet Door"));
  out.push(obj("obj_door_mb_corr",  "door", "room_master_bedroom", 5.975, 3.40, 180, DOOR, "Bedroom Door"));

  // West-wing corridor + utility doors.
  out.push(obj("obj_door_bs_corr", "door", "room_bath_small", 4.50, 4.175, 90,  DOOR, "Bath Door"));
  out.push(obj("obj_door_corr_k",  "door", "room_kitchen",    7.00, 4.525, 90,  DOOR, "Kitchen Door"));
  out.push(obj("obj_door_l_o",     "door", "room_office",     3.70, 6.975, 90,  DOOR, "Laundry Door"));
  out.push(obj("obj_door_o_lr",    "door", "room_living",     7.00, 9.475, 90,  DOOR, "Office Door"));
  out.push(obj("obj_door_o_foyer", "door", "room_office",     4.975, 9.50, 180, DOOR, "Foyer Door"));

  // East wing.
  out.push(obj("obj_door_lr_ec", "door", "room_living",    13.10,  5.975, 90,  DOOR, "Corridor Door"));
  out.push(obj("obj_door_ec_b3", "door", "room_bedroom_3", 14.025, 4.40,  180, DOOR, "Bedroom Door"));
  out.push(obj("obj_door_ec_bm", "door", "room_bath_main", 14.60,  6.475, 270, DOOR, "Bath Door"));
  out.push(obj("obj_door_ec_b2", "door", "room_bedroom_2", 14.025, 8.40,  0,   DOOR, "Bedroom Door"));

  return out;
}

const DEMO_OBJECTS = buildObjects();

export function buildDemoSceneFile(sceneId: string, useCase: string): SceneFile {
  return {
    version: "1.0",
    sceneId,
    createdAt: new Date().toISOString(),
    floorplan: {
      width: FLOOR_W,
      depth: FLOOR_D,
      rooms: ROOMS,
      walls: WALLS,
      scale: 30,
      confidence: 0.97,
      notes:
        "Single-story residence — 60' × 40' (2400 SF). Ground floor only. Master suite in the NW corner, kitchen/dining and living room down the centre, two additional bedrooms with a shared bath on the east. Porch off the south side of the living room.",
      staircases: [],
    },
    configuration: {
      useCase,
      useCaseCategory: "other",
      // Clone so downstream mutations don't poison the shared array.
      objects: DEMO_OBJECTS.map((o) => ({ ...o })),
      placementNotes:
        "Master bedroom anchors the NW corner with its ensuite + walk-in closet wrapping the west wall. Kitchen run + island span the north of the central great-room; dining table sits at the kitchen's south boundary. Living room opens onto the porch via a south-facing double door, with the L-shaped sofa around a coffee table facing a wall-mounted TV. Bedroom 3 (NE) and Bedroom 2 (SE) flank the shared main bath; both rooms have the bed centred against the far wall with nightstands and a dresser.",
    },
    floorplanImageUrl: DEMO_FLOORPLAN_PUBLIC_URL,
  };
}
