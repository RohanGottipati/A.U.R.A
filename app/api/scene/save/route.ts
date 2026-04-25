import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { normalizeSceneFile } from "@/lib/scene-validation";
import { SceneFile, SceneObject } from "@/types/scene";

interface SaveRequestBody {
  originalSceneId: string;
  objects: SceneObject[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<SaveRequestBody>;
    const { originalSceneId, objects } = body;

    if (!originalSceneId || !Array.isArray(objects)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const originalScene = await db.getScene(originalSceneId);
    if (!originalScene) {
      return NextResponse.json({ error: "Original scene not found" }, { status: 404 });
    }

    const originalRaw = await storage.getScene(originalScene.scene_storage_key);
    const originalData: SceneFile = normalizeSceneFile(originalRaw);

    const newSceneId = uuidv4();
    const newSceneFile: SceneFile = {
      version: "1.0",
      sceneId: newSceneId,
      createdAt: new Date().toISOString(),
      floorplan: originalData.floorplan,
      configuration: {
        ...originalData.configuration,
        objects,
      },
      ...(originalData.floorplanImageUrl
        ? { floorplanImageUrl: originalData.floorplanImageUrl }
        : {}),
    };

    const sceneKey = `scenes/${newSceneId}.json`;
    const shareUrl = await storage.uploadScene(sceneKey, newSceneFile);

    await db.createScene({
      sceneId: newSceneId,
      jobId: originalScene.job_id,
      sceneStorageKey: sceneKey,
      useCase: originalData.configuration.useCase,
      useCaseCategory: originalData.configuration.useCaseCategory,
      floorplanWidth: originalData.floorplan.width,
      floorplanDepth: originalData.floorplan.depth,
      objectCount: objects.length,
      shareUrl,
    });

    return NextResponse.json({ newSceneId, shareUrl });
  } catch (error) {
    console.error("[Save] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
