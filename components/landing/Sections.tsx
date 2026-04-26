"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight, Boxes, Activity, AlertTriangle,
  GitBranch, Layers, Zap, LineChart, Play,
} from "lucide-react";
import { useModal } from "@/context/ModalContext";

// Desktop: 5-per-row × 2 rows
const DESKTOP_CARDS = [
  { src: "/fp-1.png",  left: 7,  top: 14, rot: -2.5, startAt: 0,    fromX: -1600, fromY: 0    },
  { src: "/fp-2.png",  left: 25, top: 11, rot: 1.8,  startAt: 0.04, fromX: 0,     fromY: -800 },
  { src: "/fp-3.png",  left: 43, top: 13, rot: -1.5, startAt: 0.08, fromX: 0,     fromY: -800 },
  { src: "/fp-4.png",  left: 61, top: 10, rot: 2.8,  startAt: 0.12, fromX: 0,     fromY: -800 },
  { src: "/fp-5.png",  left: 79, top: 12, rot: -3.2, startAt: 0.16, fromX: 1600,  fromY: 0    },
  { src: "/fp-6.png",  left: 7,  top: 55, rot: 2.2,  startAt: 0.05, fromX: -1600, fromY: 0    },
  { src: "/fp-7.png",  left: 25, top: 58, rot: -1.8, startAt: 0.09, fromX: 0,     fromY: 800  },
  { src: "/fp-8.png",  left: 43, top: 56, rot: 1.5,  startAt: 0.13, fromX: 0,     fromY: 800  },
  { src: "/fp-9.png",  left: 61, top: 59, rot: -2.4, startAt: 0.17, fromX: 0,     fromY: 800  },
  { src: "/fp-10.png", left: 79, top: 57, rot: 1.0,  startAt: 0.21, fromX: 1600,  fromY: 0    },
];

// Mobile: 2-per-row × 5 rows — cards are wide enough to read
const MOBILE_CARDS = [
  { src: "/fp-1.png",  left: 3,  top: 2,  rot: -2,   startAt: 0,    fromX: -500, fromY: 0 },
  { src: "/fp-2.png",  left: 52, top: 2,  rot: 1.5,  startAt: 0.04, fromX: 500,  fromY: 0 },
  { src: "/fp-3.png",  left: 3,  top: 21, rot: -1.5, startAt: 0.08, fromX: -500, fromY: 0 },
  { src: "/fp-4.png",  left: 52, top: 21, rot: 2,    startAt: 0.12, fromX: 500,  fromY: 0 },
  { src: "/fp-5.png",  left: 3,  top: 40, rot: 2.5,  startAt: 0.1,  fromX: -500, fromY: 0 },
  { src: "/fp-6.png",  left: 52, top: 40, rot: -1.8, startAt: 0.14, fromX: 500,  fromY: 0 },
  { src: "/fp-7.png",  left: 3,  top: 59, rot: -2.2, startAt: 0.12, fromX: -500, fromY: 0 },
  { src: "/fp-8.png",  left: 52, top: 59, rot: 1.2,  startAt: 0.16, fromX: 500,  fromY: 0 },
  { src: "/fp-9.png",  left: 3,  top: 78, rot: 1.8,  startAt: 0.14, fromX: -500, fromY: 0 },
  { src: "/fp-10.png", left: 52, top: 78, rot: -2,   startAt: 0.18, fromX: 500,  fromY: 0 },
];

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function lerpChannel(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

export function ProblemSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const el = sectionRef.current;
      if (!el) return;
      const scrolled = -el.getBoundingClientRect().top;
      const total = el.offsetHeight - window.innerHeight;
      setProgress(Math.min(1, Math.max(0, scrolled / total)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Last card finishes at startAt(0.21) + duration(0.28) = 0.49 — glass starts after that
  const glassOpacity = easeOutCubic(Math.min(1, Math.max(0, (progress - 0.50) / 0.16)));

  // Text + inner box fade OUT before the blue transition begins
  const rawTextFade = Math.min(1, Math.max(0, (progress - 0.77) / 0.10));
  const textAlpha = 1 - rawTextFade * rawTextFade * (3 - 2 * rawTextFade);

  // Blue transition: only starts after text is fully gone. Smoothstep S-curve for scroll-driven feel.
  const rawBlue = Math.min(1, Math.max(0, (progress - 0.88) / 0.12));
  const blueT = rawBlue * rawBlue * (3 - 2 * rawBlue);

  // Overlay alpha gently softens as it goes full-blue
  const overlayAlpha = (0.35 - blueT * 0.08).toFixed(3);

  // Interpolated color channels
  const overlayBg = `rgba(${lerpChannel(90, 0, blueT)},${lerpChannel(0, 18, blueT)},${lerpChannel(0, 80, blueT)},${overlayAlpha})`;
  const boxBorder = `rgba(${lerpChannel(255, 30, blueT)},${lerpChannel(60, 100, blueT)},${lerpChannel(60, 255, blueT)},0.22)`;
  const boxShadow = `0 0 120px rgba(${lerpChannel(180, 0, blueT)},${lerpChannel(0, 60, blueT)},${lerpChannel(0, 210, blueT)},0.25), inset 0 0 80px rgba(${lerpChannel(140, 0, blueT)},${lerpChannel(0, 30, blueT)},${lerpChannel(0, 100, blueT)},0.08)`;
  const boxBg = `rgba(${lerpChannel(100, 0, blueT)},${lerpChannel(0, 25, blueT)},${lerpChannel(0, 90, blueT)},0.12)`;
  const cornerColor = `rgba(${lerpChannel(248, 60, blueT)},${lerpChannel(113, 130, blueT)},${lerpChannel(113, 255, blueT)},0.6)`;

  const cards = isMobile ? MOBILE_CARDS : DESKTOP_CARDS;
  const cardWidth = isMobile ? "44%" : "17%";

  return (
    <section ref={sectionRef} id="problem" style={{ height: "calc(2880px + 100vh)" }} className="relative">
      <div
        className="sticky top-0 h-screen overflow-hidden"
        style={{
          backgroundColor: "#050507",
          backgroundImage: "url('/blueprint-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundAttachment: "fixed",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(4,4,9,0.10)" }} />

        {cards.map((card) => {
          const raw = Math.min(1, Math.max(0, (progress - card.startAt) / 0.28));
          const ease = easeOutCubic(raw);
          return (
            <div
              key={card.src}
              className="absolute"
              style={{
                left: `${card.left}%`,
                top: `${card.top}%`,
                width: cardWidth,
                opacity: ease,
                transform: `translate(${card.fromX * (1 - ease)}px, ${card.fromY * (1 - ease)}px) rotate(${card.rot}deg)`,
                willChange: "transform, opacity",
              }}
            >
              <div className="bg-white p-1.5 pb-5 shadow-[0_8px_40px_rgba(0,0,0,0.75)]">
                <div className="overflow-hidden bg-[#f0ede8] aspect-[4/3]">
                  <img src={card.src} alt="" className="w-full h-full object-contain" />
                </div>
              </div>
              <div
                className="absolute -top-1.5 left-1/2 w-7 h-2.5 bg-yellow-50/70 border border-yellow-200/50"
                style={{ transform: `translateX(-50%) rotate(${-card.rot * 0.3}deg)` }}
              />
            </div>
          );
        })}

        {/* Full-screen red glass overlay — only mounts once glass has started appearing */}
        {glassOpacity > 0.01 && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ opacity: glassOpacity }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: overlayBg,
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
            }}
          />
          <div
            className="relative z-10 px-6 sm:px-10 py-10 sm:py-14 text-center mx-auto"
            style={{
              width: "min(860px, 90vw)",
              border: `1px solid ${boxBorder}`,
              boxShadow: boxShadow,
              background: boxBg,
              opacity: textAlpha,
              willChange: "opacity",
            }}
          >
            <span className="absolute top-0 left-0 w-5 h-5 border-t border-l" style={{ borderColor: cornerColor }} />
            <span className="absolute top-0 right-0 w-5 h-5 border-t border-r" style={{ borderColor: cornerColor }} />
            <span className="absolute bottom-0 left-0 w-5 h-5 border-b border-l" style={{ borderColor: cornerColor }} />
            <span className="absolute bottom-0 right-0 w-5 h-5 border-b border-r" style={{ borderColor: cornerColor }} />
            <h2 className="font-heading text-2xl sm:text-4xl lg:text-[3.5rem] tracking-tight font-bold leading-[1.7] lg:leading-[1.1] text-white">
              {"Static plans hide "}
              <span className="text-white whitespace-nowrap">dynamic failures.</span>
              {" By the time the space is built, "}
              <span className="text-white">the mistakes are already concrete.</span>
            </h2>
          </div>
        </div>
        )}

      </div>
    </section>
  );
}

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-28 md:py-44 px-5 md:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
          <div>
            
            <h2 className="font-heading text-3xl sm:text-5xl tracking-tight font-medium leading-tight max-w-2xl">
              Floor plans that{" "}
              <span className="text-white/55">behave like the real thing.</span>
            </h2>
          </div>
          <p className="text-white/50 max-w-md text-sm leading-relaxed">
            A.U.R.A ingests any blueprint and turns it into a live, navigable environment with crowd dynamics, flow analytics, and adaptive layout suggestions.
          </p>
        </div>

        <div className="grid md:grid-cols-6 gap-4">
          <BentoCard className="md:col-span-4 md:row-span-2 min-h-[280px] md:min-h-[440px]" icon={<Layers className="w-4 h-4" />} eyebrow="Geometry → Volume" title="From blueprint to walkable space." body="Lines self-label and extrude. Walls, stages, mezzanines and barriers form in seconds. No CAD. No modeling required.">
            <BlueprintToVolumeVisual />
          </BentoCard>
          <BentoCard className="md:col-span-2 min-h-[160px] md:min-h-[212px]" icon={<Activity className="w-4 h-4" />} eyebrow="Crowd dynamics" title="Simulate 50,000 people." body="Agent-based flow with realistic gating, queueing and dwell time.">
            <CrowdDotsVisual />
          </BentoCard>
          <BentoCard className="md:col-span-2 min-h-[160px] md:min-h-[212px]" icon={<AlertTriangle className="w-4 h-4" />} eyebrow="Pressure points" title="See the risk before it happens." body="Bottlenecks pulse red. Evacuation breakdowns surface instantly." accent="#ff3b30">
            <PressureVisual />
          </BentoCard>
          <BentoCard className="md:col-span-3 min-h-[160px] md:min-h-[212px]" icon={<GitBranch className="w-4 h-4" />} eyebrow="Optimization" title="Layout that adapts itself." body="A.U.R.A proposes path widths, gate counts, vendor placements that improve flow by up to 32%." accent="#00ffaa">
            <OptimizationVisual />
          </BentoCard>
          <BentoCard className="md:col-span-3 min-h-[160px] md:min-h-[212px]" icon={<LineChart className="w-4 h-4" />} eyebrow="Live metrics" title="Quantify a space, not just draw it." body="Flow efficiency, congestion risk, lighting exposure, usability score — all measurable, all comparable.">
            <MetricsVisual />
          </BentoCard>
        </div>
      </div>
    </section>
  );
}

function BentoCard({ className, icon, eyebrow, title, body, accent = "#00f0ff", children }: {
  className?: string; icon: React.ReactNode; eyebrow: string; title: string;
  body: string; accent?: string; children?: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`relative overflow-hidden rounded-xl border border-[#1a1a26] bg-[#0a0a0f]/60 backdrop-blur-sm hover:border-[#2a2a40] transition-all duration-500 group ${className}`}
      style={{ boxShadow: hover ? `0 24px 60px -20px rgba(0,240,255,0.12)` : "none" }}
    >
      <div className="absolute inset-0 grid-bg-fine opacity-30 pointer-events-none" />
      <div className="relative h-full p-7 flex flex-col">
        <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.28em] uppercase mb-5" style={{ color: accent }}>
          <span className="opacity-80">{icon}</span>
          {eyebrow}
        </div>
        <h3 className="font-heading text-xl md:text-2xl tracking-tight text-white leading-snug max-w-md">{title}</h3>
        <p className="text-white/45 text-sm mt-3 max-w-md leading-relaxed">{body}</p>
        <div className="flex-1" />
        <div className="mt-6 -mx-7 -mb-7 relative">{children}</div>
      </div>
    </div>
  );
}

function BlueprintToVolumeVisual() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhase((p) => (p + 1) % 3), 2400);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="relative h-56 md:h-64 overflow-hidden border-t border-white/5">
      <svg viewBox="0 0 600 240" className="w-full h-full">
        <defs>
          <linearGradient id="vol" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#00f0ff" stopOpacity="0.85" />
            <stop offset="1" stopColor="#0a84ff" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        {Array.from({ length: 12 }).map((_, i) => <line key={i} x1={50 + i * 50} y1={50} x2={50 + i * 50} y2={210} stroke="#1a2230" strokeWidth="1" />)}
        {Array.from({ length: 5 }).map((_, i) => <line key={i} x1={50} y1={50 + i * 40} x2={550} y2={50 + i * 40} stroke="#1a2230" strokeWidth="1" />)}
        <g style={{ transition: "all 1.4s cubic-bezier(0.16,1,0.3,1)", transform: phase === 0 ? "translate(0,0) scale(1)" : "translate(0,-12px) scale(1)" }}>
          {[
            { x: 100, y: 90, w: 140, h: 40 },
            { x: 280, y: 70, w: 200, h: 60 },
            { x: 100, y: 160, w: 100, h: 40 },
            { x: 280, y: 160, w: 80, h: 40 },
            { x: 400, y: 160, w: 80, h: 40 },
          ].map((r, i) => {
            const lift = phase >= 1 ? 14 : 0;
            return (
              <g key={i}>
                <rect x={r.x} y={r.y - lift} width={r.w} height={r.h} fill={phase >= 1 ? "url(#vol)" : "transparent"} stroke="#00f0ff" strokeOpacity={phase === 0 ? 0.9 : 0.6} strokeWidth="1.2" style={{ transition: "all 0.9s ease" }} />
                {phase >= 1 && <polygon points={`${r.x},${r.y - lift + r.h} ${r.x + r.w},${r.y - lift + r.h} ${r.x + r.w + 6},${r.y + r.h + 6} ${r.x + 6},${r.y + r.h + 6}`} fill="#0a1a26" stroke="#00f0ff" strokeOpacity="0.4" strokeWidth="1" />}
              </g>
            );
          })}
        </g>
        {phase === 2 && Array.from({ length: 50 }).map((_, i) => (
          <circle key={i} cx={80 + ((i * 47) % 480)} cy={80 + ((i * 31) % 130)} r="1.6" fill="#00f0ff" opacity="0.6">
            <animate attributeName="opacity" values="0.2;0.9;0.2" dur={`${1.5 + (i % 5) * 0.2}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </svg>
      <div className="absolute bottom-3 left-7 font-mono text-[9px] tracking-[0.3em] text-white/35 uppercase">
        {phase === 0 ? "01 / blueprint" : phase === 1 ? "02 / extruding" : "03 / live"}
      </div>
    </div>
  );
}

function CrowdDotsVisual() {
  return (
    <div className="relative h-32 overflow-hidden border-t border-white/5">
      <div className="absolute inset-0 grid-bg-fine opacity-40" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="grid grid-cols-12 gap-1 px-6">
          {Array.from({ length: 84 }).map((_, i) => (
            <span key={i} className="w-1 h-1 rounded-full bg-[#00f0ff]" style={{ animation: `pulse-soft ${1.4 + (i % 5) * 0.2}s ease-in-out infinite`, animationDelay: `${(i % 11) * 0.07}s`, opacity: 0.6 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PressureVisual() {
  return (
    <div className="relative h-32 overflow-hidden border-t border-white/5">
      <svg viewBox="0 0 400 120" className="w-full h-full">
        <defs>
          <radialGradient id="redGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff3b30" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#ff3b30" stopOpacity="0" />
          </radialGradient>
        </defs>
        {Array.from({ length: 16 }).map((_, i) => <line key={i} x1={20 + i * 24} y1={20} x2={20 + i * 24} y2={100} stroke="#1a2230" strokeWidth="0.5" />)}
        <circle cx="120" cy="60" r="38" fill="url(#redGlow)"><animate attributeName="r" values="32;42;32" dur="2.4s" repeatCount="indefinite" /></circle>
        <circle cx="280" cy="50" r="28" fill="url(#redGlow)"><animate attributeName="r" values="22;32;22" dur="2s" repeatCount="indefinite" /></circle>
        <circle cx="120" cy="60" r="3" fill="#ff3b30" />
        <circle cx="280" cy="50" r="3" fill="#ff3b30" />
      </svg>
    </div>
  );
}

function OptimizationVisual() {
  return (
    <div className="relative h-32 overflow-hidden border-t border-white/5">
      <svg viewBox="0 0 400 120" className="w-full h-full">
        <g stroke="#ff3b30" strokeWidth="1.5" fill="none" opacity="0.35">
          <path d="M 30 80 Q 100 40 200 80 T 370 80" strokeDasharray="3 3" />
        </g>
        <g stroke="#00ffaa" strokeWidth="1.5" fill="none">
          <path d="M 30 60 Q 100 50 200 60 T 370 60">
            <animate attributeName="d" values="M 30 60 Q 100 50 200 60 T 370 60;M 30 60 Q 100 70 200 60 T 370 60;M 30 60 Q 100 50 200 60 T 370 60" dur="6s" repeatCount="indefinite" />
          </path>
        </g>
        {Array.from({ length: 8 }).map((_, i) => (
          <circle key={i} cx={50 + i * 42} cy={60 + Math.sin(i) * 4} r="2.4" fill="#00ffaa">
            <animate attributeName="cx" values={`${50 + i * 42};${380 + i * 0};${50 + i * 42}`} dur={`${5 + i * 0.3}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </svg>
      <div className="absolute top-3 left-4 font-mono text-[9px] tracking-[0.3em] text-[#00ffaa]">FLOW +32%</div>
    </div>
  );
}

function MetricsVisual() {
  return (
    <div className="relative h-32 overflow-hidden border-t border-white/5 grid grid-cols-4">
      {[
        { l: "FLOW", v: 91, c: "#00f0ff" },
        { l: "WAIT", v: 22, c: "#ffb020" },
        { l: "RISK", v: 14, c: "#ff3b30" },
        { l: "USE", v: 88, c: "#00ffaa" },
      ].map((m) => (
        <div key={m.l} className="px-4 py-3 border-l border-white/5 first:border-l-0 flex flex-col justify-between">
          <div className="font-mono text-[9px] tracking-[0.3em] text-white/40">{m.l}</div>
          <div className="font-heading text-2xl text-white" style={{ color: m.c }}>
            {m.v}<span className="text-xs text-white/30">{m.l === "WAIT" ? "min" : "%"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

const USE_CASES = [
  { id: "events", cat: "01", title: "Festivals & Live Events", body: "Plan ingress, evacuation, vendor flow and pyrotechnic safety zones for tens of thousands of people.", accent: "#00f0ff" },
  { id: "clinic", cat: "02", title: "Hospitals & Clinics", body: "Test triage flow, surgical pathing, and emergency lockdowns before a single wall is studded.", accent: "#0a84ff" },
  { id: "warehouse", cat: "03", title: "Warehouse & Logistics", body: "Optimize pick paths, forklift conflicts, and dock door scheduling at peak throughput.", accent: "#00ffaa" },
  { id: "manufacturing", cat: "04", title: "Manufacturing Floors", body: "Simulate line-balancing, WIP buffers, and operator congestion before retooling.", accent: "#ffb020" },
  { id: "evacuation", cat: "05", title: "Emergency Evacuation", body: "Stress-test fire, seismic and active-threat egress routes against full-occupancy crowds.", accent: "#ff3b30" },
] as const;

export function UseCasesSection() {
  return (
    <section id="use-cases" className="relative py-28 md:py-44 px-5 md:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
          <div>
            
            <h2 className="font-heading text-3xl sm:text-5xl tracking-tight font-medium leading-tight max-w-3xl">
              Anywhere geometry meets{" "}
              <span className="text-white/55">human behavior.</span>
            </h2>
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {USE_CASES.map((u) => <UseCaseCard key={u.id} u={u} />)}
        </div>
      </div>
    </section>
  );
}

function UseCaseCard({ u }: { u: typeof USE_CASES[number] }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative overflow-hidden rounded-xl border border-[#1a1a26] bg-[#0a0a0f]/60 backdrop-blur-sm hover:border-[#2a2a40] transition-all duration-500 cursor-default group"
      style={{ transform: hover ? "translateY(-4px)" : "translateY(0)", boxShadow: hover ? `0 30px 60px -30px ${u.accent}26` : "0 0 0 rgba(0,0,0,0)" }}
    >
      <div className="aspect-[4/3] relative overflow-hidden border-b border-white/5">
        <UseCasePreview accent={u.accent} variant={u.id} active={hover} />
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.3em] uppercase mb-3">
          <span style={{ color: u.accent }}>USE CASE / {u.cat}</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-white/30 group-hover:text-white transition" style={{ transform: hover ? "translate(2px,-2px)" : "none", transition: "transform 0.4s" }} />
        </div>
        <h3 className="font-heading text-xl tracking-tight text-white">{u.title}</h3>
        <p className="text-white/50 text-sm mt-2 leading-relaxed">{u.body}</p>
      </div>
    </div>
  );
}

function UseCasePreview({ accent, variant, active }: { accent: string; variant: string; active: boolean }) {
  return (
    <div className="absolute inset-0 grid-bg-fine opacity-40">
      <svg viewBox="0 0 400 300" className="w-full h-full relative z-10">
        {variant === "events" && (
          <g stroke={accent} strokeWidth="1.2" fill="none">
            <rect x="40" y="40" width="320" height="220" />
            <rect x="120" y="60" width="160" height="40" />
            <rect x="60" y="200" width="60" height="40" />
            <rect x="280" y="200" width="60" height="40" />
            <line x1="160" y1="260" x2="200" y2="260" strokeWidth="2" />
            <line x1="220" y1="260" x2="260" y2="260" strokeWidth="2" />
            {active && Array.from({ length: 20 }).map((_, i) => (
              <circle key={i} cx={80 + ((i * 17) % 240)} cy={140 + ((i * 23) % 100)} r="1.4" fill={accent}>
                <animate attributeName="opacity" values="0.3;1;0.3" dur={`${1 + (i % 4) * 0.2}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </g>
        )}
        {variant === "clinic" && (
          <g stroke={accent} strokeWidth="1.2" fill="none">
            <rect x="40" y="40" width="320" height="220" />
            <line x1="200" y1="40" x2="200" y2="260" strokeDasharray="3 3" />
            <line x1="40" y1="150" x2="360" y2="150" strokeDasharray="3 3" />
            <rect x="60" y="60" width="120" height="70" />
            <rect x="220" y="60" width="120" height="70" />
            <rect x="60" y="170" width="120" height="70" />
            <rect x="220" y="170" width="120" height="70" />
            {active && <path d="M 70 270 Q 150 150 350 80" stroke={accent} strokeDasharray="2 4" opacity="0.8"><animate attributeName="stroke-dashoffset" values="0;-30" dur="3s" repeatCount="indefinite" /></path>}
          </g>
        )}
        {variant === "warehouse" && (
          <g stroke={accent} strokeWidth="1.2" fill="none">
            <rect x="40" y="40" width="320" height="220" />
            {Array.from({ length: 6 }).map((_, i) => <rect key={i} x={70 + i * 45} y={70} width="20" height="160" />)}
            {active && <circle r="3" fill={accent}><animateMotion dur="5s" repeatCount="indefinite" path="M 60 250 L 60 60 L 100 60 L 100 250 L 145 250 L 145 60 L 190 60 L 190 250 Z" /></circle>}
          </g>
        )}
        {variant === "manufacturing" && (
          <g stroke={accent} strokeWidth="1.2" fill="none">
            <rect x="40" y="40" width="320" height="220" />
            <path d="M 60 100 H 340" /><path d="M 60 160 H 340" /><path d="M 60 220 H 340" />
            {[100, 160, 220].map((y, idx) => Array.from({ length: 6 }).map((_, i) => <rect key={`${idx}-${i}`} x={70 + i * 50} y={y - 10} width="36" height="20" />))}
            {active && [100, 160, 220].map((y, i) => <circle key={i} r="2.5" fill={accent}><animateMotion dur={`${4 + i}s`} repeatCount="indefinite" path={`M 60 ${y} L 340 ${y}`} /></circle>)}
          </g>
        )}
        {variant === "evacuation" && (
          <g stroke={accent} strokeWidth="1.2" fill="none">
            <rect x="40" y="40" width="320" height="220" />
            <line x1="180" y1="40" x2="220" y2="40" strokeWidth="2" />
            <line x1="40" y1="140" x2="40" y2="160" strokeWidth="2" />
            <line x1="360" y1="140" x2="360" y2="160" strokeWidth="2" />
            <path d="M 200 200 Q 100 150 60 150" strokeDasharray="3 4" />
            <path d="M 200 200 Q 300 150 340 150" strokeDasharray="3 4" />
            <path d="M 200 200 L 200 50" strokeDasharray="3 4" />
            <circle cx="200" cy="200" r="4" fill={accent} style={{ animation: active ? "pulse-soft 1.5s ease-in-out infinite" : "none" }} />
          </g>
        )}
      </svg>
    </div>
  );
}

export function TechArchitecture() {
  return (
    <section id="architecture" className="relative py-28 md:py-44 px-5 md:px-10">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="tagline mb-5">[ Architecture ]</div>
          <h2 className="font-heading text-3xl sm:text-5xl tracking-tight font-medium leading-tight max-w-3xl mx-auto">
            Built on a real-time spatial simulation pipeline.
          </h2>
          <p className="mt-5 max-w-xl mx-auto text-white/50 text-sm">
            Distributed compute orchestrates agent-based crowd models, geometric extrusion, and adaptive optimization loops — all in real time.
          </p>
        </div>

        <div className="relative rounded-2xl border border-[#1a1a26] bg-[#070710]/60 backdrop-blur-sm p-6 md:p-12">
          <div className="absolute inset-0 grid-bg-fine opacity-25 rounded-2xl pointer-events-none" />
          <div className="relative grid md:grid-cols-3 gap-4 items-stretch">
            <Node stage="01" title="Blueprint Ingest" sub="DXF · PDF · IFC" icon={<Layers className="w-4 h-4" />} />
            <Node stage="02" title="Geometry Engine" sub="Wall extrusion · zone graph" icon={<Boxes className="w-4 h-4" />} />
            <Node stage="03" title="Agent Simulation" sub="Behaviour · queueing · evac" icon={<Activity className="w-4 h-4" />} highlight />
          </div>
          <div className="relative mt-6 grid md:grid-cols-3 gap-4">
            <Node stage="04" title="Realtime Renderer" sub="GPU · WebGL · stream" icon={<Zap className="w-4 h-4" />} />
            <Node stage="05" title="Optimization Loop" sub="Layout adapts to flow" icon={<GitBranch className="w-4 h-4" />} />
            <Node stage="06" title="Insight Layer" sub="Risk · efficiency · usability" icon={<LineChart className="w-4 h-4" />} />
          </div>
          <div className="mt-10 text-center">
            <div className="font-mono text-[10px] tracking-[0.3em] text-white/30">END-TO-END LATENCY</div>
            <div className="font-heading text-3xl text-[#00f0ff] mt-1">&lt; 180 ms</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Node({ stage, title, sub, icon, highlight }: { stage: string; title: string; sub: string; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`relative rounded-xl p-5 border transition group ${highlight ? "border-[#00f0ff]/40 bg-[#00f0ff]/5" : "border-white/10 bg-[#0a0a14]"} hover:border-[#2a2a40]`}>
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[10px] tracking-[0.32em] text-white/35">{stage}</span>
        <span className="text-[#00f0ff]">{icon}</span>
      </div>
      <div className="font-heading text-base tracking-tight text-white">{title}</div>
      <div className="font-mono text-[10px] tracking-[0.18em] text-white/45 mt-1">{sub}</div>
    </div>
  );
}


export function FinalCTA() {
  const { openModal } = useModal();
  return (
    <section className="relative py-32 md:py-52 px-5 md:px-10 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-50 pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0,240,255,0.08) 0%, transparent 70%)" }} />
      <div className="max-w-5xl mx-auto relative z-10 text-center">
        <h2 className="font-heading text-4xl sm:text-6xl lg:text-7xl tracking-tight font-medium leading-[1.02]">
          Stop guessing.
          <br />
          <span className="text-white/55">Start simulating.</span>
        </h2>
        <p className="mt-6 max-w-xl mx-auto text-white/50 text-base">
          Join architects, ops leads and event producers building spaces that work the first time.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => openModal("geminiKey")}
            className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#1a4fd6] text-white font-extrabold text-sm tracking-[-0.01em] transition-all duration-300 hover:bg-[#1d57f0] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Try with your API key
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => openModal("demo")}
            className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#0a0a0f] text-white/90 font-extrabold text-sm tracking-[-0.01em] border border-white/10 transition-all duration-300 hover:bg-[#111118] hover:border-white/20 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Play className="w-3.5 h-3.5" />
            Watch demo
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Feature Stack Section ────────────────────────────────────────────────────

const FEATURE_SLIDES = [
  {
    title: "Turn blueprints into immersive",
    accent: "3D environments.",
    body: "Instantly convert floor plans into fully explorable 3D spaces.",
    tags: ["Visualization", "Design Reviews", "Planning"],
  },
  {
    title: "Automatically organize and size",
    accent: "your layout.",
    body: "Intelligently structure rooms, components, and proportions from raw plans.",
    tags: ["Layout Structuring", "Space Planning", "Accuracy"],
  },
  {
    title: "Explore your space with",
    accent: "real-time navigation.",
    body: "Walk through or orbit your environment to understand scale and flow.",
    tags: ["Walkthroughs", "Reviews", "Spatial Understanding"],
  },
  {
    title: "Collaborate and share",
    accent: "spaces instantly.",
    body: "Send interactive 3D environments to teammates or stakeholders in seconds.",
    tags: ["Teams", "Clients", "Approvals"],
  },
];

// Renders title + accent char-by-char based on charProgress (0→1)
function TypedHeading({
  title,
  accent,
  charProgress,
}: {
  title: string;
  accent: string;
  charProgress: number;
}) {
  const titleWithSpace = title + " ";
  const totalLen = titleWithSpace.length + accent.length;
  const visible = Math.round(charProgress * totalLen);

  return (
    <>
      {Array.from(titleWithSpace).map((char, i) => (
        <span key={i} style={{ opacity: i < visible ? 1 : 0 }}>
          {char}
        </span>
      ))}
      <span
        style={{
          textDecoration: "underline",
          textDecorationColor: "rgba(255,255,255,0.55)",
          textUnderlineOffset: "6px",
          textDecorationThickness: "2px",
        }}
      >
        {Array.from(accent).map((char, j) => {
          const gi = titleWithSpace.length + j;
          return (
            <span key={j} style={{ opacity: gi < visible ? 1 : 0 }}>
              {char}
            </span>
          );
        })}
      </span>
    </>
  );
}

export function FeatureStackSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const N = FEATURE_SLIDES.length;

  useEffect(() => {
    const onScroll = () => {
      const el = sectionRef.current;
      if (!el) return;
      const scrolled = -el.getBoundingClientRect().top;
      const total = el.offsetHeight - window.innerHeight;
      setProgress(Math.min(1, Math.max(0, scrolled / total)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Each card owns exactly 1/N of total progress — equal scroll per card.
  const slotSize = 1 / N;
  // Entry and exit each take 38% of one slot; they overlap at the hand-off point
  // so the incoming card starts rising as the outgoing text begins falling.
  const transDur = slotSize * 0.38;

  return (
    <section ref={sectionRef} style={{ height: `calc(11700px + 100vh)` }} className="relative">
      <div className="sticky top-0 h-screen overflow-hidden">
        {FEATURE_SLIDES.map((slide, i) => {
          // ── Entry: card rises from below ───────────────────────────────
          // Starts half a transDur before this card's slot begins so the
          // transition straddles the slot boundary (same budget for every card).
          const entryStart = i === 0 ? -1 : i * slotSize - transDur * 0.5;
          const rawEntry = i === 0 ? 1 : Math.min(1, Math.max(0, (progress - entryStart) / transDur));
          const entryT = rawEntry * rawEntry * (3 - 2 * rawEntry); // smoothstep

          const ty = i === 0 ? 0 : (1 - entryT) * 100; // vh — slides up from bottom

          // ── Exit: text falls off as next card rises ────────────────────
          const exitStart = i < N - 1 ? (i + 1) * slotSize - transDur * 0.5 : 2;
          const rawExit = i < N - 1 ? Math.min(1, Math.max(0, (progress - exitStart) / transDur)) : 0;
          const exitT = rawExit * rawExit * (3 - 2 * rawExit);

          const scale = 1 - exitT * 0.05;
          // Text opacity + downward drift — "words falling off the screen"
          const textOpacity = 1 - exitT;
          const textFallY = exitT * 72; // px — gravity pull

          // ── Typing: characters appear as the card enters ───────────────
          // Delay the start slightly so a few chars appear only once the
          // card is already ~25% into frame (feels more intentional).
          const typingRaw = i === 0 ? 1 : Math.min(1, Math.max(0, (rawEntry - 0.25) / 0.75));
          const charProgress = typingRaw * typingRaw * (3 - 2 * typingRaw);
          // Body paragraph waits until heading is ~60% typed
          const bodyOpacity = Math.min(1, Math.max(0, (charProgress - 0.58) / 0.42));

          return (
            <div
              key={i}
              className="absolute inset-0 flex flex-col items-center justify-center px-5"
              style={{
                zIndex: i + 1,
                transform: `translateY(${ty}vh) scale(${scale})`,
                willChange: "transform",
              }}
            >
              {/* Ambient glow */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse 70% 50% at 50% 65%, rgba(26,79,214,0.07) 0%, transparent 70%)",
                }}
              />

              {/* Heading — types in on entry, falls off on exit */}
              <div
                className="relative z-10 text-center mb-5"
                style={{
                  opacity: textOpacity,
                  transform: `translateY(${textFallY}px)`,
                  willChange: "opacity, transform",
                }}
              >
                <h2 className="font-heading text-3xl sm:text-4xl lg:text-[2.8rem] font-bold tracking-tight text-white leading-snug">
                  <TypedHeading
                    title={slide.title}
                    accent={slide.accent}
                    charProgress={i === 0 ? 1 : charProgress}
                  />
                </h2>
                <p
                  className="mt-3 text-white/50 text-base sm:text-lg max-w-xl mx-auto leading-relaxed"
                  style={{ opacity: bodyOpacity }}
                >
                  {slide.body}
                </p>
              </div>

              {/* macOS-style window */}
              <div
                className="relative z-10 w-full"
                style={{ maxWidth: "min(800px, 84vw)" }}
              >
                <div
                  className="rounded-xl overflow-hidden"
                  style={{
                    border: "1px solid rgba(255,255,255,0.09)",
                    boxShadow: "0 24px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04)",
                    background: "#1c1c20",
                  }}
                >
                  <div
                    className="flex items-center gap-2 px-4"
                    style={{
                      height: "36px",
                      background: "#242428",
                      borderBottom: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                    <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                    <span className="w-3 h-3 rounded-full bg-[#28c940]" />
                  </div>
                  <div
                    className="w-full flex items-center justify-center"
                    style={{
                      aspectRatio: "16/9",
                      background: "linear-gradient(160deg, #1e1e25 0%, #26262e 100%)",
                    }}
                  >
                    <span className="font-mono text-[10px] tracking-[0.35em] uppercase text-white/18">
                      Video placeholder
                    </span>
                  </div>
                </div>
              </div>

              {/* Tags — appear after body, fall off on exit */}
              <div
                className="relative z-10 flex items-center justify-center gap-2.5 mt-6 flex-wrap"
                style={{
                  opacity: textOpacity * bodyOpacity,
                  transform: `translateY(${textFallY}px)`,
                  willChange: "opacity, transform",
                }}
              >
                <span className="text-white/50 text-sm font-medium flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ opacity: 0.6 }}>
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  Perfect for:
                </span>
                {slide.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3.5 py-1.5 rounded-full text-sm text-white/75 font-medium"
                    style={{
                      border: "1px solid rgba(255,255,255,0.13)",
                      background: "rgba(255,255,255,0.04)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="relative border-t border-white/5 py-10 px-5 md:px-10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <span className="block w-2 h-2 rounded-full bg-[#00f0ff] shadow-[0_0_12px_#00f0ff]" />
          <span className="font-heading tracking-[0.18em] text-sm">A.U.R.A</span>
          <span className="font-mono text-[10px] tracking-[0.3em] text-white/30">&#47;&#47; SIM ENGINE</span>
        </div>
        <div className="font-mono text-[10px] tracking-[0.28em] text-white/30 flex flex-wrap gap-6">
          <span>v0.4.1</span>
          <span>NODE 0xFLR-AX23</span>
          <span>© 2031 A.U.R.A LABS</span>
        </div>
      </div>
    </footer>
  );
}
