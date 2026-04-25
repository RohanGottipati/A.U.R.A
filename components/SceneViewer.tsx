'use client';

import { useState, useCallback } from 'react';
import ThreeScene from './ThreeScene';
import { SceneFile } from '@/types/scene';

interface Props {
  sceneData: SceneFile;
}

export default function SceneViewer({ sceneData }: Props) {
  const [mode, setMode] = useState<'walk' | 'orbit'>('orbit');
  const [shareTooltip, setShareTooltip] = useState('Share');

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    setShareTooltip('Link copied!');
    setTimeout(() => setShareTooltip('Share'), 2000);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#1a1a2e]">
      <ThreeScene sceneData={sceneData} mode={mode} />

      {/* Top-left overlay: Scene info */}
      <div className="absolute left-4 top-4 z-10 max-w-sm rounded-xl bg-black/60 p-4 backdrop-blur-sm">
        <h2 className="text-lg font-semibold text-white">
          {sceneData.configuration.useCaseCategory.charAt(0).toUpperCase() +
            sceneData.configuration.useCaseCategory.slice(1)}{' '}
          Layout
        </h2>
        <p className="mt-1 text-sm text-white/60">{sceneData.configuration.useCase}</p>
        <p className="mt-2 text-xs text-white/40">
          {sceneData.configuration.objects.length} objects &middot;{' '}
          {sceneData.floorplan.width}m &times; {sceneData.floorplan.depth}m
        </p>
      </div>

      {/* Top-right overlay: Actions */}
      <div className="absolute right-4 top-4 z-10 flex gap-2">
        <button
          onClick={() => setMode(mode === 'walk' ? 'orbit' : 'walk')}
          className="rounded-lg bg-black/60 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-black/80"
        >
          {mode === 'walk' ? 'Orbit View' : 'Walk Mode'}
        </button>
        <button
          onClick={handleShare}
          className="rounded-lg bg-accent/80 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-accent"
        >
          {shareTooltip}
        </button>
        <a
          href="/upload"
          className="rounded-lg bg-black/60 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-black/80"
        >
          New Scene
        </a>
      </div>

      {/* Bottom-center overlay: Controls hint */}
      <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-black/60 px-6 py-3 text-center backdrop-blur-sm">
        {mode === 'walk' ? (
          <p className="text-sm text-white/60">
            <span className="font-medium text-white">WASD</span> to move &middot;{' '}
            <span className="font-medium text-white">Mouse</span> to look &middot;{' '}
            Click to lock cursor
          </p>
        ) : (
          <p className="text-sm text-white/60">
            <span className="font-medium text-white">Left-click + drag</span> to rotate &middot;{' '}
            <span className="font-medium text-white">Scroll</span> to zoom &middot;{' '}
            <span className="font-medium text-white">Right-click + drag</span> to pan
          </p>
        )}
      </div>
    </div>
  );
}
