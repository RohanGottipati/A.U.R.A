"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import SceneViewer from "@/components/SceneViewer";
import { SceneFile } from "@/types/scene";

export default function ScenePage() {
  const params = useParams();
  const sceneId = params.sceneId as string;
  const [sceneData, setSceneData] = useState<SceneFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/scene/${sceneId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Scene not found");
        return r.json();
      })
      .then(setSceneData)
      .catch((e) => setError(e.message));
  }, [sceneId]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400">Scene Not Found</h1>
          <p className="mt-2 text-foreground/60">{error}</p>
          <a href="/upload" className="mt-4 inline-block rounded-lg bg-accent px-6 py-3 text-white">
            Create New Scene
          </a>
        </div>
      </main>
    );
  }

  if (!sceneData) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-10 w-10 animate-spin text-accent" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="mt-4 text-foreground/60">Loading scene...</p>
        </div>
      </main>
    );
  }

  return <SceneViewer sceneData={sceneData} />;
}
