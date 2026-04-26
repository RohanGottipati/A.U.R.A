import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import {
  buildDemoSceneFile,
  isDemoSceneId,
  recallDemoSceneObjects,
  recallDemoUseCase,
} from "@/lib/demo-scene";
import { normalizeSceneFile } from "@/lib/scene-validation";
import { storage } from "@/lib/storage";

export async function GET(_req: NextRequest, { params }: { params: { sceneId: string } }) {
  try {
    // Demo / hardcoded flow: serve the pre-baked scene without DB or storage.
    // See lib/demo-scene.ts.
    if (isDemoSceneId(params.sceneId)) {
      const useCase = recallDemoUseCase(params.sceneId);
      const sceneFile = buildDemoSceneFile(params.sceneId, useCase);
      // Apply any saved-edit overrides for this demo scene id so user edits
      // persist across reloads within the same server lifetime.
      const overrides = recallDemoSceneObjects(params.sceneId);
      if (overrides) {
        sceneFile.configuration = {
          ...sceneFile.configuration,
          objects: overrides,
        };
      }
      return NextResponse.json(normalizeSceneFile(sceneFile));
    }

    const scene = await db.getScene(params.sceneId);
    if (!scene) return NextResponse.json({ error: "Scene not found" }, { status: 404 });

    const sceneData = await storage.getScene(scene.scene_storage_key);
    return NextResponse.json(normalizeSceneFile(sceneData));
  } catch (error) {
    console.error("Scene fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
