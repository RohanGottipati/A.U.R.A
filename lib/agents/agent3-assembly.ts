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

  const validatedObjects = objects.map(obj => ({
    ...obj,
    x: Math.max(obj.width / 2, Math.min(floorplan.width - obj.width / 2, obj.x)),
    y: Math.max(obj.depth / 2, Math.min(floorplan.depth - obj.depth / 2, obj.y)),
    z: Math.max(0, obj.z),
    rotation: ((obj.rotation % 360) + 360) % 360,
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
