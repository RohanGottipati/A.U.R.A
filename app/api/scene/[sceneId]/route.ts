import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { storage } from '@/lib/storage';

export async function GET(_req: NextRequest, { params }: { params: { sceneId: string } }) {
  const scene = await db.getScene(params.sceneId);
  if (!scene) return NextResponse.json({ error: 'Scene not found' }, { status: 404 });

  const sceneData = await storage.getScene(scene.scene_storage_key);
  return NextResponse.json(sceneData);
}
