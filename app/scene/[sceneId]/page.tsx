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
      <div className="relative min-h-screen bg-[#050507] text-white overflow-hidden flex items-center justify-center">
        <div className="grain" />
        <div className="absolute inset-0 pointer-events-none bp-bg" />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(4,4,9,0.10)" }} />
        <div
          className="absolute top-0 left-0 right-0 pointer-events-none"
          style={{
            height: "280px",
            background: "linear-gradient(to bottom, #040409 0%, rgba(4,4,9,0.65) 30%, rgba(4,4,9,0.15) 70%, transparent 100%)",
            zIndex: 1,
          }}
        />
        <div className="absolute inset-0 grid-bg-fine pointer-events-none" />

        <div className="relative z-10 px-5 w-full max-w-lg mx-auto">
          <div className="glass rounded-2xl p-8 relative overflow-hidden">
            <span className="bracket-tl rounded-tl-2xl" />
            <span className="bracket-tr rounded-tr-2xl" />
            <span className="bracket-bl rounded-bl-2xl" />
            <span className="bracket-br rounded-br-2xl" />

            <div className="tagline mb-6 inline-flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff3b30]" />
              Scene not found
            </div>

            <h1 className="font-heading text-2xl sm:text-3xl tracking-tight font-bold text-white mb-3">
              This scene doesn&apos;t exist.
            </h1>
            <p className="font-mono text-[11px] tracking-[0.2em] text-white/50 mb-8 leading-relaxed">
              {error}
            </p>

            <a
              href="/upload"
              className="cta-primary inline-flex items-center gap-2 px-6 py-3 rounded-full font-mono text-[10px] tracking-[0.28em] uppercase"
            >
              Create new scene
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!sceneData) {
    return (
      <div className="relative min-h-screen bg-[#050507] text-white overflow-hidden flex items-center justify-center">
        <div className="grain" />
        <div className="absolute inset-0 pointer-events-none bp-bg" />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(4,4,9,0.10)" }} />
        <div
          className="absolute top-0 left-0 right-0 pointer-events-none"
          style={{
            height: "280px",
            background: "linear-gradient(to bottom, #040409 0%, rgba(4,4,9,0.65) 30%, rgba(4,4,9,0.15) 70%, transparent 100%)",
            zIndex: 1,
          }}
        />
        <div className="absolute inset-0 grid-bg-fine pointer-events-none" />

        <div className="relative z-10 px-5 w-full max-w-lg mx-auto">
          <div className="glass rounded-2xl p-8 relative overflow-hidden">
            <span className="bracket-tl rounded-tl-2xl" />
            <span className="bracket-tr rounded-tr-2xl" />
            <span className="bracket-bl rounded-bl-2xl" />
            <span className="bracket-br rounded-br-2xl" />

            <div className="tagline mb-6 inline-flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] blink" />
              Fetching scene data
            </div>

            <h1 className="font-heading text-2xl sm:text-3xl tracking-tight font-bold text-white mb-3">
              Loading scene&hellip;
            </h1>
            <p className="font-mono text-[11px] tracking-[0.2em] text-white/40 mb-8">
              Retrieving geometry and object manifest.
            </p>

            {/* Animated progress bar */}
            <div className="relative h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 w-1/2 rounded-full"
                style={{
                  background: "linear-gradient(90deg, #0a84ff, #00f0ff)",
                  boxShadow: "0 0 18px rgba(0,240,255,0.45)",
                  animation: "shimmer 1.6s ease-in-out infinite",
                  backgroundSize: "200% 100%",
                  backgroundImage: "linear-gradient(90deg, #0a84ff 0%, #00f0ff 50%, #0a84ff 100%)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <SceneViewer sceneData={sceneData} />;
}
