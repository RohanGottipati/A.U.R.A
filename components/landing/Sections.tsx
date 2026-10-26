"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Play } from "lucide-react";
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
    video: "/screen1.mov",
  },
  {
    title: "Automatically organize and size",
    accent: "your layout.",
    body: "Intelligently structure rooms, components, and proportions from raw plans.",
    tags: ["Layout Structuring", "Space Planning", "Accuracy"],
    video: "/vid2.mp4",
  },
  {
    title: "Explore your space with",
    accent: "real-time navigation.",
    body: "Walk through or orbit your environment to understand scale and flow.",
    tags: ["Walkthroughs", "Reviews", "Spatial Understanding"],
    video: "/vid3.mov",
  },
  {
    title: "Collaborate and share",
    accent: "spaces instantly.",
    body: "Send interactive 3D environments to teammates or stakeholders in seconds.",
    tags: ["Teams", "Clients", "Approvals"],
    video: "/vid4.mp4",
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
                    className="w-full"
                    style={{ aspectRatio: "16/9", background: "#0d0d10" }}
                  >
                    <video
                      src={slide.video}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-cover"
                    />
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
