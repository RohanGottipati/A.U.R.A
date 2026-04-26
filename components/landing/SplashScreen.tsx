"use client";

import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [phase, setPhase] = useState<"visible" | "fading" | "gone">("visible");

  useEffect(() => {
    // Reset scroll to top before locking — prevents browser scroll restoration
    // from initializing scroll-driven animations in a mid-state on cached loads
    window.scrollTo(0, 0);
    document.body.style.overflow = "hidden";

    const fadeTimer = setTimeout(() => setPhase("fading"), 3000);
    const goneTimer = setTimeout(() => {
      setPhase("gone");
      document.body.style.overflow = "";
    }, 3700);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(goneTimer);
      document.body.style.overflow = "";
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        backgroundImage: "url('/blueprint-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        opacity: phase === "fading" ? 0 : 1,
        transition: "opacity 700ms cubic-bezier(0.4, 0, 0.2, 1)",
        pointerEvents: phase === "fading" ? "none" : "all",
      }}
    >
      {/* Dark overlay matching the blueprint sections */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(1, 8, 22, 0.45)" }}
      />
      {/* Grain — matches every other blueprint page */}
      <div className="grain" />

      <div className="relative z-10 flex flex-col items-center gap-10 text-center px-8">
        {/* Down arrow key cap */}
        <div
          className="flex items-center justify-center rounded-xl border-2 border-white/70 bg-white/10 backdrop-blur-sm"
          style={{
            width: 88,
            height: 88,
            boxShadow: "0 6px 0 rgba(255,255,255,0.25), 0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
        </div>

        {/* Instruction text */}
        <h1
          className="font-heading text-white font-bold leading-tight tracking-tight"
          style={{ fontSize: "clamp(3rem, 7vw, 6rem)", maxWidth: 800 }}
        >
          Use the down arrow key for a smooth UI
        </h1>

        {/* Subtle countdown hint */}
        <p className="font-mono text-white/40 text-sm tracking-[0.25em] uppercase">
          Loading in 3s…
        </p>
      </div>
    </div>
  );
}
