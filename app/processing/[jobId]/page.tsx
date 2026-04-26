"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import ProgressTracker from "@/components/ProgressTracker";

export default function ProcessingPage() {
  const params = useParams();
  const jobId = params.jobId as string;

  return (
    <div className="relative min-h-screen bg-[#050507] text-white overflow-hidden">
      <div className="grain" />

      {/* Ambient backdrop */}
      <div className="absolute inset-0 grid-bg pointer-events-none opacity-60" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 20%, rgba(0,240,255,0.10) 0%, transparent 65%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.10]"
        style={{
          backgroundImage: "url('/blueprint-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(5,5,7,0.55) 0%, rgba(5,5,7,0.85) 70%, #050507 100%)",
        }}
      />

      {/* Top status bar */}
      <header className="relative z-10 px-5 md:px-10 pt-6 pb-3">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
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
              <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] blink" />
              Pipeline live
            </span>
            <span className="text-white/20">·</span>
            <span className="text-white/40">JOB {jobId.slice(0, 8)}</span>
          </div>
        </div>
      </header>

      <section className="relative z-10 px-5 md:px-10 pt-10 pb-12">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] uppercase text-white/40 hover:text-white transition mb-8"
          >
            <span aria-hidden>&larr;</span>
            Cancel & re-upload
          </Link>

          <div className="tagline mb-5 inline-flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] blink" />
            Step 02 of 03 · Pipeline running
          </div>

          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl tracking-tight font-medium leading-[1.05] max-w-3xl">
            Building your{" "}
            <span className="text-white/55">walkable scene.</span>
          </h1>
          <p className="mt-5 max-w-xl text-white/55 text-base">
            Three agents are reading your floor plan, planning the layout, and assembling a real-time 3D world. Stay on this page — we&apos;ll redirect you the moment it&apos;s ready.
          </p>
        </div>
      </section>

      <section className="relative z-10 px-5 md:px-10 pb-24">
        <div className="mx-auto max-w-5xl">
          <ProgressTracker jobId={jobId} />
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/5 px-5 md:px-10 py-6">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-[10px] tracking-[0.3em] uppercase text-white/30">
          <span>JOB {jobId}</span>
          <span>NODE 0xFLR-AX23 · v0.4.1</span>
        </div>
      </footer>
    </div>
  );
}
