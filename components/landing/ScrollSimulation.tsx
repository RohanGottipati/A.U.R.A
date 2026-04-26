"use client";

import { useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useScrollProgress, smoothstep } from "@/hooks/useScrollProgress";
import { useModal } from "@/context/ModalContext";

const VIDEO_CLIPS = [
  { src: "https://customer-assets.emergentagent.com/job_flow-alive/artifacts/syhkm5s8_Video_UI_Animation_Desk_to_Blueprint.mp4", start: 0.00, end: 0.33, scrubStartSec: 0, scrubEndSec: undefined as number | undefined },
  { src: "https://customer-assets.emergentagent.com/job_flow-alive/artifacts/am78i96w_Blueprint_to_D_Video_Generation.mp4", start: 0.33, end: 0.66, scrubStartSec: 1, scrubEndSec: 3.5 },
  { src: "https://customer-assets.emergentagent.com/job_flow-alive/artifacts/90z2vdde_invideo-ai-1080%20Watch%20a%20Warehouse%20Rise%20from%20a%20Blueprint%202026-04-25.mp4", start: 0.66, end: 1.0, scrubStartSec: 0, scrubEndSec: undefined as number | undefined },
];
const VIDEO_CROSSFADE = 0.04;

function clipOpacity(p: number, idx: number) {
  const c = VIDEO_CLIPS[idx];
  const fadeIn = idx === 0 ? 1 : smoothstep(c.start - VIDEO_CROSSFADE, c.start, p);
  const fadeOut = idx === VIDEO_CLIPS.length - 1 ? 1 : 1 - smoothstep(c.end - VIDEO_CROSSFADE, c.end, p);
  return Math.max(0, Math.min(1, fadeIn * fadeOut));
}

export default function ScrollSimulation() {
  const sectionRef = useRef<HTMLElement>(null);
  const [, progressRef] = useScrollProgress(sectionRef);
  const { openModal } = useModal();

  const v0Ref = useRef<HTMLVideoElement>(null);
  const v1Ref = useRef<HTMLVideoElement>(null);
  const v2Ref = useRef<HTMLVideoElement>(null);
  const videoRefs = useMemo(() => [v0Ref, v1Ref, v2Ref], []);

  const l0Ref = useRef<HTMLDivElement>(null);
  const l1Ref = useRef<HTMLDivElement>(null);
  const l2Ref = useRef<HTMLDivElement>(null);
  const videoLayerRefs = useMemo(() => [l0Ref, l1Ref, l2Ref], []);

  const videoDurations = useRef([0, 0, 0]);
  const videoPrimed = useRef([false, false, false]);
  const videoSeeking = useRef([false, false, false]);
  const videoLastTarget = useRef([-1, -1, -1]);

  const heroLayerRef = useRef<HTMLDivElement>(null);
  const darkOverlayRef = useRef<HTMLDivElement>(null);
  const scrollCueRef = useRef<HTMLDivElement>(null);

  const mousePos = useRef({ x: typeof window !== "undefined" ? window.innerWidth / 2 : 500, y: typeof window !== "undefined" ? window.innerHeight / 2 : 400 });
  const bubblePos = useRef({ x: typeof window !== "undefined" ? window.innerWidth / 2 : 500, y: typeof window !== "undefined" ? window.innerHeight / 2 : 400 });
  const hasMoved = useRef(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      hasMoved.current = true;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    const cleanups: (() => void)[] = [];
    videoRefs.forEach((ref, i) => {
      const v = ref.current;
      if (!v) return;
      const onMeta = () => { videoDurations.current[i] = v.duration || 0; };
      v.addEventListener("loadedmetadata", onMeta);
      v.addEventListener("durationchange", onMeta);

      const prime = async () => {
        if (videoPrimed.current[i]) return;
        try {
          v.muted = true;
          v.playsInline = true;
          const playPromise = v.play();
          if (playPromise && typeof playPromise.then === "function") {
            await playPromise;
          }
          v.pause();
          v.currentTime = 0;
          videoPrimed.current[i] = true;
        } catch {
          // Autoplay may be blocked before user gesture — mark as primed anyway
          // so the scroll-driven currentTime updates can still take effect.
          // Setting currentTime works without play() once metadata is loaded.
          if (v.readyState >= 1) {
            videoPrimed.current[i] = true;
          }
        }
      };
      // Try priming on every signal that the video is ready, not just `canplay`,
      // because on first uncached load `canplay` may fire late (or after the user
      // has already started scrolling).
      v.addEventListener("loadedmetadata", prime);
      v.addEventListener("loadeddata", prime);
      v.addEventListener("canplay", prime);
      v.addEventListener("canplaythrough", prime);
      // Kick it off immediately in case the video is already ready (cached).
      if (v.readyState >= 1) {
        videoDurations.current[i] = v.duration || 0;
        prime();
      } else {
        try { v.load(); } catch { /* ignore */ }
      }

      const onPlay = () => { if (videoPrimed.current[i]) { try { v.pause(); } catch { /* ignore */ } } };
      v.addEventListener("play", onPlay);

      const onSeeking = () => { videoSeeking.current[i] = true; };
      const onSeeked = () => { videoSeeking.current[i] = false; };
      v.addEventListener("seeking", onSeeking);
      v.addEventListener("seeked", onSeeked);

      cleanups.push(() => {
        v.removeEventListener("loadedmetadata", onMeta);
        v.removeEventListener("durationchange", onMeta);
        v.removeEventListener("loadedmetadata", prime as EventListener);
        v.removeEventListener("loadeddata", prime as EventListener);
        v.removeEventListener("canplay", prime as EventListener);
        v.removeEventListener("canplaythrough", prime as EventListener);
        v.removeEventListener("play", onPlay);
        v.removeEventListener("seeking", onSeeking);
        v.removeEventListener("seeked", onSeeked);
      });
    });
    return () => cleanups.forEach((fn) => fn());
  }, [videoRefs]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = progressRef.current;

      for (let i = 0; i < VIDEO_CLIPS.length; i++) {
        const clip = VIDEO_CLIPS[i];
        const layer = videoLayerRefs[i].current;
        const v = videoRefs[i].current;
        const op = clipOpacity(p, i);

        if (layer) {
          layer.style.opacity = String(op);
          layer.style.pointerEvents = op > 0.05 ? "auto" : "none";
        }

        const dur = videoDurations.current[i];
        if (v && dur && v.readyState >= 1) {
          if (op > 0.005) {
            try { if (!v.paused) v.pause(); } catch { /* ignore */ }
            const t = Math.min(1, Math.max(0, (p - clip.start) / (clip.end - clip.start)));
            const startTime = clip.scrubStartSec ?? 0;
            const maxTime = clip.scrubEndSec != null ? Math.min(dur, clip.scrubEndSec) : dur;
            const target = Math.max(0, Math.min(maxTime - 0.05, startTime + t * (maxTime - startTime)));
            const lastTarget = videoLastTarget.current[i];
            if (!videoSeeking.current[i] && Math.abs(target - lastTarget) > 0.045) {
              videoLastTarget.current[i] = target;
              try { v.currentTime = target; } catch { /* ignore */ }
            }
          }
        }
      }

      const heroOp = Math.max(0, 1 - p * 16);
      if (heroLayerRef.current) {
        heroLayerRef.current.style.opacity = String(heroOp);
        heroLayerRef.current.style.transform = `translateY(${(1 - heroOp) * -24}px)`;
        heroLayerRef.current.style.pointerEvents = heroOp > 0.05 ? "auto" : "none";
      }
      if (darkOverlayRef.current) darkOverlayRef.current.style.opacity = String(heroOp * 0.6);
      if (scrollCueRef.current) {
        scrollCueRef.current.style.opacity = String(heroOp);

        // Lerp bubble toward cursor
        const ease = 0.1;
        bubblePos.current.x += (mousePos.current.x - bubblePos.current.x) * ease;
        bubblePos.current.y += (mousePos.current.y - bubblePos.current.y) * ease;
        // Offset: 16px right, 24px below cursor
        scrollCueRef.current.style.transform = `translate(${bubblePos.current.x + 16}px, ${bubblePos.current.y + 24}px)`;
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progressRef, videoRefs, videoLayerRefs]);

  return (
    <section ref={sectionRef} id="experience" className="relative w-full" style={{ height: "calc(4500px + 100vh)" }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#040409]">
        {VIDEO_CLIPS.map((clip, i) => (
          <div
            key={clip.src}
            ref={videoLayerRefs[i]}
            className="absolute inset-0 overflow-hidden"
            style={{ zIndex: 5 + (VIDEO_CLIPS.length - i), opacity: i === 0 ? 1 : 0, willChange: "opacity" }}
          >
            <video
              ref={videoRefs[i]}
              key={clip.src}
              src={clip.src}
              poster={i === 0 ? "https://customer-assets.emergentagent.com/job_flow-alive/artifacts/bqglzuvo_Gemini_Generated_Image_nweh43nweh43nweh%20%281%29%20%281%29.png" : undefined}
              muted
              playsInline
              preload="auto"
              loop={false}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: "saturate(0.78) contrast(1.12) brightness(1.03)" }}
            />
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(4,4,9,0.06) 0%, rgba(4,4,9,0.14) 50%, rgba(4,4,9,0.74) 88%, rgba(4,4,9,0.97) 100%)" }} />
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 76% 70% at 50% 44%, transparent 40%, rgba(4,4,9,0.18) 70%, rgba(4,4,9,0.42) 100%)" }} />
            <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(138deg, rgba(255,162,68,0.10) 0%, rgba(255,138,52,0.05) 26%, transparent 55%)" }} />
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 44% at 50% 46%, rgba(255,212,162,0.06) 0%, transparent 100%)" }} />
            <div className="absolute inset-0 pointer-events-none" style={{
              backdropFilter: "blur(5px)",
              WebkitBackdropFilter: "blur(5px)",
              maskImage: "radial-gradient(ellipse 62% 56% at 50% 44%, transparent 0%, transparent 42%, rgba(0,0,0,0.55) 66%, black 100%)",
              WebkitMaskImage: "radial-gradient(ellipse 62% 56% at 50% 44%, transparent 0%, transparent 42%, rgba(0,0,0,0.55) 66%, black 100%)",
            }} />
            <div className="absolute inset-0 grid-bg-fine opacity-[0.06]" />
          </div>
        ))}

        <div className="pointer-events-none absolute inset-0 z-10" style={{ background: "radial-gradient(ellipse 86% 80% at 50% 44%, transparent 38%, rgba(0,0,0,0.14) 65%, rgba(0,0,0,0.32) 100%)" }} />
        <div className="pointer-events-none absolute inset-0 z-10 grid-bg-fine opacity-20" />
        <div className="pointer-events-none absolute inset-0 z-[11]" style={{ background: "linear-gradient(148deg, rgba(255,148,58,0.05) 0%, rgba(255,130,50,0.025) 35%, transparent 60%)", mixBlendMode: "screen" }} />

        <div
          ref={darkOverlayRef}
          className="absolute inset-0 z-[15] pointer-events-none"
          style={{ background: "rgba(4,4,9,0.72)", willChange: "opacity" }}
        />

        <div ref={heroLayerRef} className="absolute inset-0 z-20 flex items-start justify-center pt-[12vh] sm:pt-[10vh]" style={{ opacity: 1, willChange: "opacity, transform" }}>
          <div className="w-full max-w-4xl px-5 md:px-12 text-center">
            <div className="w-full">
              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="font-heading text-[32px] sm:text-6xl lg:text-[80px] leading-[1.0] tracking-[-0.04em] font-extrabold text-white text-center"
              >
                From 2D plans to 3D spaces.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className="mt-5 sm:mt-8 mx-auto max-w-2xl text-base sm:text-xl md:text-2xl text-white/75 leading-relaxed font-bold tracking-[-0.01em]"
              >
                Turn static floor plans into living 3D environments you can walk through, test, and stress before a single thing is built.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="mt-7 sm:mt-9 flex flex-col sm:flex-row items-center justify-center gap-3 pointer-events-auto"
              >
                <button
                  onClick={() => openModal("geminiKey")}
                  className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#1a4fd6] text-white font-extrabold text-sm tracking-[-0.01em] transition-all duration-300 hover:bg-[#1d57f0] active:scale-[0.98]"
                >
                  Try with your API key
                </button>
                <button
                  type="button"
                  onClick={() => openModal("demo")}
                  className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#0a0a0f] text-white/90 font-extrabold text-sm tracking-[-0.01em] border border-white/10 transition-all duration-300 hover:bg-[#111118] hover:border-white/20 active:scale-[0.98] text-center"
                >
                  Watch demo
                </button>
              </motion.div>
            </div>
          </div>
        </div>

        <div
          ref={scrollCueRef}
          className="pointer-events-none z-[9999]"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            opacity: 1,
            willChange: "opacity, transform",
            transform: "translate(-9999px, -9999px)",
          }}
        >
          {/* iMessage bubble */}
          <div
            style={{
              background: "linear-gradient(135deg, #1a8cff 0%, #0a7aff 100%)",
              borderRadius: "18px 18px 18px 4px",
              padding: "9px 14px",
              boxShadow: "0 4px 24px rgba(10,122,255,0.45), 0 1px 4px rgba(0,0,0,0.3)",
              display: "flex",
              alignItems: "center",
              gap: "7px",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#fff", letterSpacing: "-0.01em", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" }}>
              Scroll to begin
            </span>
            <span style={{ fontSize: "11px" }}>👇</span>
          </div>
          {/* Tail */}
          <div
            style={{
              position: "absolute",
              bottom: -6,
              left: 10,
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "7px solid #0a7aff",
            }}
          />
        </div>

        {/* Bottom-exit fade: blends the video section's floor into the blueprint section */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none z-[30]"
          style={{
            height: "220px",
            background: "linear-gradient(to bottom, transparent 0%, rgba(4,4,9,0.6) 50%, #040409 100%)",
          }}
        />

      </div>
    </section>
  );
}
