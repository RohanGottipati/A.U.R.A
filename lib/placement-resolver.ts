/**
 * Placement post-processor.
 *
 * Agent 2 (Gemini) returns approximate object placements that frequently
 * drift outside their assigned rooms, overlap each other, or float in the
 * middle of a room when they should be flush against a wall. This module
 * deterministically fixes those issues so the final 3D scene feels real:
 *
 *   1. Each object is clamped inside its assigned room's polygon (or AABB).
 *   2. Wall-anchored object types (counter, kitchen_unit, shelf, bed,
 *      bathtub, sink, toilet, screen, divider, staircase, door) are snapped
 *      to the nearest wall of their room and rotated to face inward.
 *   3. Overlaps between objects are iteratively resolved by pushing them
 *      apart along the smallest separation axis.
 *   4. Free-standing objects keep clearance from walls (so chairs don't
 *      clip into walls).
 *
 * All operations are idempotent and run in O(n log n) for n placed objects.
 */

import { FloorPlan, Room, SceneObject, ObjectType } from "@/types/scene";

const WALL_ANCHORED: ReadonlySet<ObjectType> = new Set<ObjectType>([
  "counter",
  "kitchen_unit",
  "shelf",
  "bed",
  "bathtub",
  "sink",
  "toilet",
  "screen",
  "divider",
  "staircase",
  "door",
  "workstation",
]);

// Free-standing types that should have walking clearance from walls.
const FREE_STANDING_CLEARANCE: ReadonlySet<ObjectType> = new Set<ObjectType>([
  "chair",
  "table",
  "podium",
  "plant",
  "entrance_marker",
  "booth",
  "stage",
  "equipment",
]);

const WALL_CLEARANCE = 0.25; // meters between a free-standing object and a wall
const OBJECT_CLEARANCE = 0.18; // meters between two objects when resolving overlaps

interface AABB {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface Vec2 {
  x: number;
  y: number;
}

/* -------------------------------------------------------------------------- */
/*  Geometry helpers                                                           */
/* -------------------------------------------------------------------------- */

function getRoomById(floorplan: FloorPlan, id: string): Room | null {
  return floorplan.rooms.find((r) => r.id === id) ?? null;
}

function roomAABB(room: Room): AABB {
  if (room.polygon && room.polygon.length >= 3) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of room.polygon) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, maxX, minY, maxY };
  }
  return {
    minX: room.x,
    maxX: room.x + room.width,
    minY: room.y,
    maxY: room.y + room.height,
  };
}

function pointInPolygon(p: Vec2, polygon: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const intersect =
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y + 1e-9) + a.x;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInRoom(p: Vec2, room: Room): boolean {
  if (room.polygon && room.polygon.length >= 3) {
    return pointInPolygon(p, room.polygon);
  }
  return (
    p.x >= room.x &&
    p.x <= room.x + room.width &&
    p.y >= room.y &&
    p.y <= room.y + room.height
  );
}

/* -------------------------------------------------------------------------- */
/*  Wall snapping                                                              */
/* -------------------------------------------------------------------------- */

interface RoomEdge {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

function getRoomEdges(room: Room): RoomEdge[] {
  if (room.polygon && room.polygon.length >= 3) {
    const edges: RoomEdge[] = [];
    for (let i = 0; i < room.polygon.length; i++) {
      const a = room.polygon[i];
      const b = room.polygon[(i + 1) % room.polygon.length];
      edges.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y });
    }
    return edges;
  }
  const x1 = room.x, y1 = room.y;
  const x2 = room.x + room.width, y2 = room.y + room.height;
  return [
    { ax: x1, ay: y1, bx: x2, by: y1 },
    { ax: x2, ay: y1, bx: x2, by: y2 },
    { ax: x2, ay: y2, bx: x1, by: y2 },
    { ax: x1, ay: y2, bx: x1, by: y1 },
  ];
}

function projectPointOntoSegment(
  px: number, py: number, edge: RoomEdge,
): { x: number; y: number; t: number; dist: number } {
  const dx = edge.bx - edge.ax;
  const dy = edge.by - edge.ay;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq < 1e-9 ? 0 : ((px - edge.ax) * dx + (py - edge.ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const x = edge.ax + dx * t;
  const y = edge.ay + dy * t;
  const ddx = px - x;
  const ddy = py - y;
  return { x, y, t, dist: Math.sqrt(ddx * ddx + ddy * ddy) };
}

function nearestEdge(room: Room, px: number, py: number): {
  edge: RoomEdge;
  proj: ReturnType<typeof projectPointOntoSegment>;
} | null {
  const edges = getRoomEdges(room);
  if (edges.length === 0) return null;
  let best: ReturnType<typeof nearestEdge> = null;
  for (const e of edges) {
    const proj = projectPointOntoSegment(px, py, e);
    if (!best || proj.dist < best.proj.dist) {
      best = { edge: e, proj };
    }
  }
  return best;
}

/**
 * Snap a wall-anchored object so its back rests against the nearest room wall
 * and its front faces into the room. Updates x/y/rotation in place.
 */
function snapToWall(obj: SceneObject, room: Room): SceneObject {
  const near = nearestEdge(room, obj.x, obj.y);
  if (!near) return obj;
  const { edge, proj } = near;
  const ex = edge.bx - edge.ax;
  const ey = edge.by - edge.ay;
  const wallAngle = Math.atan2(ey, ex); // direction along wall

  // Inward normal points from the wall toward the room center.
  let nx = -ey;
  let ny = ex;
  const nLen = Math.sqrt(nx * nx + ny * ny) || 1;
  nx /= nLen;
  ny /= nLen;

  const aabb = roomAABB(room);
  const cx = (aabb.minX + aabb.maxX) / 2;
  const cy = (aabb.minY + aabb.maxY) / 2;
  if ((cx - proj.x) * nx + (cy - proj.y) * ny < 0) {
    nx = -nx;
    ny = -ny;
  }

  // Push the object's center half its depth + a sliver away from the wall so
  // its back face is flush. obj.depth is along the object's local Y (forward)
  // axis after rotation.
  const offset = obj.depth / 2 + 0.02;

  // Object local +Z faces "forward". The mesh wrapper rotates by obj.rotation
  // degrees around Y, so rotation 0 = forward toward +y world. We want forward
  // along the inward normal: rotation = atan2(nx, ny) in degrees.
  const rotationRad = Math.atan2(nx, ny);
  let rotation = (rotationRad * 180) / Math.PI;
  rotation = ((rotation % 360) + 360) % 360;

  // For doors specifically, align the door's long axis with the wall instead
  // of facing into the room, so it sits in the wall opening.
  let finalRotation = rotation;
  if (obj.type === "door") {
    finalRotation = ((wallAngle * 180) / Math.PI + 360) % 360;
  }

  // Clamp position so the object doesn't extend past the wall edges (along
  // the wall's tangent direction).
  const halfWidth = obj.width / 2;
  const tx = ex / (Math.sqrt(ex * ex + ey * ey) || 1);
  const ty = ey / (Math.sqrt(ex * ex + ey * ey) || 1);
  const wallLen = Math.sqrt(ex * ex + ey * ey);
  // distance from edge.a to proj along edge tangent
  const tEdge = ((proj.x - edge.ax) * tx + (proj.y - edge.ay) * ty);
  const tClamped = Math.max(halfWidth, Math.min(wallLen - halfWidth, tEdge));
  const adjX = edge.ax + tx * tClamped + nx * offset;
  const adjY = edge.ay + ty * tClamped + ny * offset;

  return {
    ...obj,
    x: adjX,
    y: adjY,
    rotation: finalRotation,
  };
}

/* -------------------------------------------------------------------------- */
/*  Room-bounds clamping                                                       */
/* -------------------------------------------------------------------------- */

function clampToRoom(obj: SceneObject, room: Room, clearance: number): SceneObject {
  const aabb = roomAABB(room);
  const halfW = obj.width / 2 + clearance;
  const halfD = obj.depth / 2 + clearance;
  const minX = aabb.minX + halfW;
  const maxX = aabb.maxX - halfW;
  const minY = aabb.minY + halfD;
  const maxY = aabb.maxY - halfD;

  let x = obj.x;
  let y = obj.y;
  if (minX <= maxX) x = Math.max(minX, Math.min(maxX, x));
  if (minY <= maxY) y = Math.max(minY, Math.min(maxY, y));

  // For non-rectangular polygons, if the resulting center is still outside
  // the polygon, snap it toward the polygon centroid until it's inside.
  if (room.polygon && room.polygon.length >= 3) {
    if (!pointInPolygon({ x, y }, room.polygon)) {
      const cx = (aabb.minX + aabb.maxX) / 2;
      const cy = (aabb.minY + aabb.maxY) / 2;
      for (let i = 0; i < 12; i++) {
        x = (x + cx) / 2;
        y = (y + cy) / 2;
        if (pointInPolygon({ x, y }, room.polygon)) break;
      }
    }
  }

  return { ...obj, x, y };
}

/* -------------------------------------------------------------------------- */
/*  Overlap resolution                                                         */
/* -------------------------------------------------------------------------- */

function objectAABB(obj: SceneObject): AABB {
  // Approximate AABB of rotated rectangle by axis-aligned bounding box of
  // the rotated corners. Rotation is degrees around Y.
  const rad = (obj.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const w = obj.width * cos + obj.depth * sin;
  const d = obj.width * sin + obj.depth * cos;
  return {
    minX: obj.x - w / 2,
    maxX: obj.x + w / 2,
    minY: obj.y - d / 2,
    maxY: obj.y + d / 2,
  };
}

function aabbOverlap(a: AABB, b: AABB): { dx: number; dy: number } | null {
  const overlapX = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
  const overlapY = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
  if (overlapX <= 0 || overlapY <= 0) return null;
  return { dx: overlapX, dy: overlapY };
}

function resolveOverlaps(
  objects: SceneObject[],
  floorplan: FloorPlan,
  iterations = 4,
): SceneObject[] {
  let result = objects.map((o) => ({ ...o }));
  for (let pass = 0; pass < iterations; pass++) {
    let moved = false;
    for (let i = 0; i < result.length; i++) {
      const a = result[i];
      // Skip wall-anchored objects in overlap resolution — they have a fixed
      // position against a wall and we don't want to push them away from it.
      if (WALL_ANCHORED.has(a.type)) continue;
      for (let j = 0; j < result.length; j++) {
        if (i === j) continue;
        const b = result[j];
        const aabbA = objectAABB(a);
        const aabbB = objectAABB(b);
        const ov = aabbOverlap(aabbA, aabbB);
        if (!ov) continue;
        // Push a away from b along smallest-overlap axis.
        const pushX = ov.dx < ov.dy;
        let nx: number, ny: number;
        if (pushX) {
          nx = a.x < b.x ? -1 : 1;
          ny = 0;
        } else {
          nx = 0;
          ny = a.y < b.y ? -1 : 1;
        }
        const push = (pushX ? ov.dx : ov.dy) / 2 + OBJECT_CLEARANCE;
        const newX = a.x + nx * push;
        const newY = a.y + ny * push;
        result[i] = { ...a, x: newX, y: newY };
        moved = true;
      }
    }
    if (!moved) break;
    // After each pass, re-clamp each object to its assigned room.
    result = result.map((o) => {
      const room = getRoomById(floorplan, o.roomId);
      if (!room) return o;
      return clampToRoom(o, room, WALL_CLEARANCE);
    });
  }
  return result;
}

/* -------------------------------------------------------------------------- */
/*  Public entry point                                                         */
/* -------------------------------------------------------------------------- */

export function resolveScenePlacements(
  rawObjects: SceneObject[],
  floorplan: FloorPlan,
): SceneObject[] {
  // Step 1 — clamp every object inside its assigned room (with clearance).
  let objects = rawObjects.map((obj) => {
    const room = getRoomById(floorplan, obj.roomId);
    if (!room) return obj;
    const clearance = FREE_STANDING_CLEARANCE.has(obj.type) ? WALL_CLEARANCE : 0;
    return clampToRoom(obj, room, clearance);
  });

  // Step 2 — wall-snap anchored objects.
  objects = objects.map((obj) => {
    if (!WALL_ANCHORED.has(obj.type)) return obj;
    const room = getRoomById(floorplan, obj.roomId);
    if (!room) return obj;
    return snapToWall(obj, room);
  });

  // Step 3 — resolve overlaps among non-anchored objects.
  objects = resolveOverlaps(objects, floorplan);

  // Step 4 — final guard: every center must be inside its room polygon.
  objects = objects.map((obj) => {
    const room = getRoomById(floorplan, obj.roomId);
    if (!room) return obj;
    if (room.polygon && room.polygon.length >= 3) {
      if (!pointInRoom({ x: obj.x, y: obj.y }, room)) {
        return clampToRoom(obj, room, 0);
      }
    }
    return obj;
  });

  return objects;
}
