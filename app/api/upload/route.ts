import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { db } from '@/lib/db';
import { runPipeline } from '@/lib/backboard';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

function getImageExtension(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      throw new Error(`Unsupported mime type: ${mimeType}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('floorplan') as File | null;
    const useCase = formData.get('useCase') as string | null;

    if (!file) return NextResponse.json({ error: 'No floor plan image provided' }, { status: 400 });
    if (!useCase || useCase.trim().length < 10) {
      return NextResponse.json({ error: 'Use case description too short (minimum 10 characters)' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large (max 10MB)' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      return NextResponse.json({ error: 'Invalid file type. Use JPG, PNG, or WebP.' }, { status: 400 });
    }

    const jobId = uuidv4();
    const imageKey = `floorplans/${jobId}.${getImageExtension(file.type)}`;
    const imageBuffer = Buffer.from(await file.arrayBuffer());
    const imageUrl = await storage.uploadImage(imageKey, imageBuffer, file.type);

    await db.createJob(jobId, useCase.trim(), imageKey);

    // Fire pipeline asynchronously — do NOT await this
    runPipeline(jobId, imageUrl, useCase.trim()).catch(err => {
      console.error(`Pipeline failed for job ${jobId}:`, err);
    });

    return NextResponse.json({ jobId }, { status: 202 });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 30;
