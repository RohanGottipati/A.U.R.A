"use client";

import UploadForm from "@/components/UploadForm";

export default function UploadPage() {
  return (
    <div className="relative min-h-screen bg-[#050507] text-white overflow-hidden">
      <div className="grain" />

      {/* Full-opacity fixed blueprint — matches landing section treatment */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "url('/blueprint-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundAttachment: "fixed",
          backgroundRepeat: "no-repeat",
        }}
      />
      {/* Minimal dark tint */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "rgba(4,4,9,0.10)" }}
      />
      {/* Section-entry bridge */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: "220px",
          background:
            "linear-gradient(to bottom, #040409 0%, rgba(4,4,9,0.60) 30%, rgba(4,4,9,0.10) 70%, transparent 100%)",
        }}
      />
      <div className="absolute inset-0 grid-bg-fine pointer-events-none" />

      {/* Hero */}
      <section className="relative z-10 px-5 md:px-10 pt-14 pb-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 inline-flex items-center gap-2 font-sans text-xs font-bold tracking-widest uppercase text-white/70">
            <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
            New simulation · Step 01 of 03
          </div>

          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl tracking-tight font-bold leading-[1.05] max-w-3xl">
            Feed the engine your{" "}
            <span className="text-white/65">floor plan.</span>
          </h1>
          <p className="mt-5 max-w-xl text-white/80 text-base font-medium">
            Drop a blueprint, describe how the space should behave, and we&apos;ll spin up a walkable 3D simulation in under a minute.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-2 font-sans text-xs font-bold tracking-wider uppercase text-white/65">
            <span className="px-2.5 py-1 rounded-full border border-white/20">JPG</span>
            <span className="px-2.5 py-1 rounded-full border border-white/20">PNG</span>
            <span className="px-2.5 py-1 rounded-full border border-white/20">WEBP</span>
            <span className="text-white/35">·</span>
            <span>≤ 10 MB</span>
            <span className="text-white/35">·</span>
            <span>min 10 chars brief</span>
          </div>
        </div>
      </section>

      {/* Form panel */}
      <section className="relative z-10 px-5 md:px-10 pb-20">
        <div className="mx-auto max-w-6xl">
          <div className="glass rounded-2xl p-5 sm:p-8 relative">
            <div className="flex items-center justify-between mb-6 pb-5 border-b border-white/10">
              <div className="flex items-center gap-2 font-sans text-xs font-bold tracking-wider uppercase text-white">
                <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                Intake terminal
              </div>
              <span className="font-sans text-xs font-semibold text-white/40">
                NODE 0xFLR-AX23
              </span>
            </div>

            <UploadForm />
          </div>

          {/* Pipeline preview */}
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <PipelineCard
              stage="01"
              title="Geometry agent"
              sub="Reads walls, doors, scale"
              active
            />
            <PipelineCard
              stage="02"
              title="Placement agent"
              sub="Lays out objects per brief"
            />
            <PipelineCard
              stage="03"
              title="Scene assembler"
              sub="Builds the walkable 3D world"
            />
          </div>
        </div>
      </section>

    </div>
  );
}

function PipelineCard({
  stage,
  title,
  sub,
  active = false,
}: {
  stage: string;
  title: string;
  sub: string;
  active?: boolean;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border bg-[#0a0a0f]/60 backdrop-blur-sm p-5 transition-all duration-500"
      style={{
        borderColor: active ? "rgba(255,255,255,0.25)" : "#1a1a26",
      }}
    >
      <div className="absolute inset-0 grid-bg-fine opacity-20 pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <span className="font-sans text-xs font-bold tracking-wider uppercase text-white/60">
            Stage {stage}
          </span>
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: active ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.2)" }}
          />
        </div>
        <div className="font-heading text-base font-bold tracking-tight text-white leading-snug">
          {title}
        </div>
        <div className="font-sans text-xs font-semibold text-white/60 mt-1.5">
          {sub}
        </div>
      </div>
    </div>
  );
}
