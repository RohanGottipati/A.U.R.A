import { v4 as uuidv4 } from "uuid";

import { FloorPlan, ObjectType, SceneFile, SceneObject, UseCaseCategory } from "../../types/scene";
import { normalizeSceneFile } from "../scene-validation";
import { resolveScenePlacements } from "../placement-resolver";

// Real-world dimension envelope (in meters) per object type.
// Each axis is [min, max]. Anything Agent 2 returns outside this range is
// snapped back to the closest valid value so the rendered scene stays at a
// believable physical scale regardless of LLM drift.
const SIZE_RANGES: Record<ObjectType, { width: [number, number]; depth: [number, number]; height: [number, number] }> = {
  table:           { width: [0.8, 3.0],  depth: [0.6, 2.0],  height: [0.7, 0.85] },
  chair:           { width: [0.4, 0.7],  depth: [0.4, 0.7],  height: [0.8, 1.1] },
  stage:           { width: [3.0, 14.0], depth: [2.0, 8.0],  height: [0.3, 0.8] },
  booth:           { width: [1.5, 3.5],  depth: [1.5, 3.5],  height: [1.8, 2.6] },
  desk:            { width: [1.2, 2.0],  depth: [0.6, 1.0],  height: [0.7, 0.85] },
  podium:          { width: [0.5, 0.8],  depth: [0.5, 0.8],  height: [1.0, 1.3] },
  screen:          { width: [1.5, 5.0],  depth: [0.05, 0.2], height: [1.2, 2.5] },
  workstation:     { width: [1.5, 3.0],  depth: [1.0, 2.0],  height: [0.9, 1.2] },
  shelf:           { width: [0.8, 1.5],  depth: [0.3, 0.5],  height: [1.5, 2.2] },
  counter:         { width: [1.5, 4.0],  depth: [0.6, 1.0],  height: [0.85, 1.0] },
  equipment:       { width: [0.8, 2.5],  depth: [0.8, 2.5],  height: [0.9, 1.6] },
  divider:         { width: [1.5, 4.0],  depth: [0.05, 0.2], height: [1.4, 2.0] },
  plant:           { width: [0.4, 1.0],  depth: [0.4, 1.0],  height: [0.8, 2.0] },
  entrance_marker: { width: [0.5, 1.2],  depth: [0.5, 1.2],  height: [1.0, 1.6] },
  toilet:          { width: [0.45, 0.6], depth: [0.6, 0.8],  height: [0.75, 0.95] },
  sink:            { width: [0.5, 1.0],  depth: [0.4, 0.6],  height: [0.85, 0.95] },
  door:            { width: [0.8, 1.0],  depth: [0.05, 0.15], height: [2.0, 2.2] },
  staircase:       { width: [1.0, 1.5],  depth: [2.4, 4.0],  height: [1.2, 3.0] },
  bed:             { width: [1.0, 2.0],  depth: [1.9, 2.2],  height: [0.5, 0.7] },
  kitchen_unit:    { width: [1.5, 3.5],  depth: [0.55, 0.75], height: [0.85, 0.95] },
  bathtub:         { width: [1.4, 1.9],  depth: [0.7, 0.85], height: [0.5, 0.7] },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function clampToRealistic(obj: SceneObject): SceneObject {
  const range = SIZE_RANGES[obj.type];
  if (!range) return obj;
  return {
    ...obj,
    width:  clamp(obj.width,  range.width[0],  range.width[1]),
    depth:  clamp(obj.depth,  range.depth[0],  range.depth[1]),
    height: clamp(obj.height, range.height[0], range.height[1]),
  };
}

export function runAgent3(params: {
  floorplan: FloorPlan;
  objects: SceneObject[];
  useCaseCategory: UseCaseCategory;
  placementNotes: string;
  useCase: string;
  floorplanImageUrl?: string;
}): SceneFile {
  const { floorplan, objects, useCaseCategory, placementNotes, useCase, floorplanImageUrl } = params;

  const sizedObjects = objects.map((raw) => {
    const obj = clampToRealistic(raw);
    return {
      ...obj,
      x: Math.max(obj.width / 2, Math.min(floorplan.width - obj.width / 2, obj.x)),
      y: Math.max(obj.depth / 2, Math.min(floorplan.depth - obj.depth / 2, obj.y)),
      z: Math.max(0, obj.z),
      rotation: ((obj.rotation % 360) + 360) % 360,
    };
  });

  // Apply deterministic placement post-processing: snap wall-anchored objects
  // to walls, clamp every object inside its assigned room polygon, and
  // separate any overlapping pairs. This is what makes the scene feel real
  // when Agent 2's coordinates drift.
  const validatedObjects = resolveScenePlacements(sizedObjects, floorplan);

  const sceneFile = {
    version: '1.0' as const,
    sceneId: uuidv4(),
    createdAt: new Date().toISOString(),
    floorplan,
    configuration: {
      useCase,
      useCaseCategory,
      objects: validatedObjects,
      placementNotes,
    },
    ...(floorplanImageUrl ? { floorplanImageUrl } : {}),
  };

  return normalizeSceneFile(sceneFile);
}
