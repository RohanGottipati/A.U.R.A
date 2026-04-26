"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import UploadForm from "@/components/UploadForm";

export default function UploadPage() {
  return (
    <div className="relative min-h-screen bg-[#050507] text-white overflow-hidden">
      <div className="grain" />

      {/* Ambient backdrop */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.18]"
        style={{
          backgroundImage: "url('/blueprint-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 grid-bg-fine pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,240,255,0.10) 0%, transparent 60%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(5,5,7,0.4) 0%, rgba(5,5,7,0.7) 60%, #050507 100%)",
        }}
      />

      {/* Top status bar */}
      <header className="relative z-10 px-5 md:px-10 pt-6 pb-3">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 group"
          >
            <span className="block w-2.5 h-2.5 rounded-full bg-[#00f0ff] shadow-[0_0_12px_#00f0ff]" />
            <span className="font-heading font-medium tracking-[0.18em] text-white text-sm">
              A.U.R.A
            </span>
            <span className="hidden sm:inline font-mono text-[10px] tracking-[0.32em] text-white/30 ml-1">
              / SIM ENGINE
            </span>
          </Link>

          <div className="hidden sm:flex items-center gap-4 font-mono text-[10px] tracking-[0.3em] uppercase text-white/40">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ffaa] blink" />
              Pipeline online
            </span>
            <span className="text-white/20">·</span>
            <span>v0.4.1</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-5 md:px-10 pt-10 pb-12">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] uppercase text-white/40 hover:text-white transition mb-8"
          >
            <span aria-hidden>&larr;</span>
            Back to home
          </Link>

          <div className="tagline mb-5 inline-flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] blink" />
            New simulation · Step 01 of 03
          </div>

          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl tracking-tight font-medium leading-[1.05] max-w-3xl">
            Feed the engine your{" "}
            <span className="text-white/55">floor plan.</span>
          </h1>
          <p className="mt-5 max-w-xl text-white/55 text-base">
            Drop a blueprint, describe how the space should behave, and we&apos;ll spin up a walkable 3D simulation in under a minute.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-[0.28em] uppercase text-white/40">
            <span className="px-2.5 py-1 rounded border border-white/10">JPG</span>
            <span className="px-2.5 py-1 rounded border border-white/10">PNG</span>
            <span className="px-2.5 py-1 rounded border border-white/10">WEBP</span>
            <span className="text-white/25">/</span>
            <span>≤ 10 MB</span>
            <span className="text-white/25">/</span>
            <span>min 10 chars brief</span>
          </div>
        </div>
      </section>

      {/* Form panel */}
      <section className="relative z-10 px-5 md:px-10 pb-20">
        <div className="mx-auto max-w-6xl">
          <div className="glass rounded-2xl p-5 sm:p-8 relative">
            {/* Corner brackets */}
            <span className="absolute top-0 left-0 w-5 h-5 border-t border-l border-[#00f0ff]/40 rounded-tl-2xl" />
            <span className="absolute top-0 right-0 w-5 h-5 border-t border-r border-[#00f0ff]/40 rounded-tr-2xl" />
            <span className="absolute bottom-0 left-0 w-5 h-5 border-b border-l border-[#00f0ff]/40 rounded-bl-2xl" />
            <span className="absolute bottom-0 right-0 w-5 h-5 border-b border-r border-[#00f0ff]/40 rounded-br-2xl" />

            <div className="flex items-center justify-between mb-6 pb-5 border-b border-white/5">
              <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] uppercase text-[#00f0ff]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] blink" />
                FLR // Intake terminal
              </div>
              <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/30">
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
              accent="#00f0ff"
              active
            />
            <PipelineCard
              stage="02"
              title="Placement agent"
              sub="Lays out objects per brief"
              accent="#0a84ff"
            />
            <PipelineCard
              stage="03"
              title="Scene assembler"
              sub="Builds the walkable 3D world"
              accent="#00ffaa"
            />
          </div>
        </div>
      </section>

      {/* Footer hint */}
      <footer className="relative z-10 border-t border-white/5 px-5 md:px-10 py-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-[10px] tracking-[0.3em] uppercase text-white/30">
          <span>STATUS · AWAITING UPLOAD</span>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 hover:text-white transition"
          >
            View landing
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </footer>
    </div>
  );
}

function PipelineCard({
  stage,
  title,
  sub,
  accent,
  active = false,
}: {
  stage: string;
  title: string;
  sub: string;
  accent: string;
  active?: boolean;
}) {
  return (
    <div
      className="relative rounded-xl glass p-5 transition-all"
      style={{
        boxShadow: active
          ? `0 0 0 1px ${accent}55, 0 0 32px ${accent}22`
          : undefined,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[10px] tracking-[0.32em] text-white/40">
          STAGE {stage}
        </span>
        <span
          className={`w-1.5 h-1.5 rounded-full ${active ? "blink" : ""}`}
          style={{
            background: active ? accent : "rgba(255,255,255,0.18)",
            boxShadow: active ? `0 0 12px ${accent}` : undefined,
          }}
        />
      </div>
      <div className="font-heading text-base tracking-tight text-white">
        {title}
      </div>
      <div className="font-mono text-[10px] tracking-[0.18em] text-white/45 mt-1">
        {sub}
      </div>
    </div>
  );
}
