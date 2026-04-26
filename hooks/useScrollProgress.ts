"use client";

import { useEffect, useRef, useState } from "react";

export function useScrollProgress(
  ref: React.RefObject<HTMLElement | null>,
  options: { smooth?: boolean; lerp?: number; emitDelta?: number } = {}
): [number, React.MutableRefObject<number>] {
  const { smooth = true, lerp = 0.075, emitDelta = 0.005 } = options;
  const [progress, setProgress] = useState(0);
  const targetRef = useRef(0);
  const displayedRef = useRef(0);
  const lastEmittedRef = useRef(-1);

  useEffect(() => {
    if (!ref.current) return;
    let raf = 0;
    let cachedTop = 0;
    let cachedHeight = 0;
    let cachedWinH = 0;

    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      cachedTop = rect.top + window.scrollY;
      cachedHeight = el.offsetHeight;
      cachedWinH = window.innerHeight;
    };

    const computeTarget = () => {
      const total = cachedHeight - cachedWinH;
      if (total <= 0) return 0;
      const scrolled = window.scrollY - cachedTop;
      return Math.max(0, Math.min(1, scrolled / total));
    };

    const onScroll = () => { targetRef.current = computeTarget(); };
    const onResize = () => { measure(); targetRef.current = computeTarget(); };

    measure();
    targetRef.current = computeTarget();
    displayedRef.current = targetRef.current;
    setProgress(targetRef.current);
    lastEmittedRef.current = targetRef.current;

    // Re-measure after layout-affecting events (fonts loading, images, late hydration).
    // Without this, the first paint can use stale measurements and the page renders
    // in a broken state until a manual reload triggers a fresh layout pass.
    const remeasure = () => {
      measure();
      targetRef.current = computeTarget();
    };
    const remeasureTimers: number[] = [];
    remeasureTimers.push(window.setTimeout(remeasure, 0));
    remeasureTimers.push(window.setTimeout(remeasure, 100));
    remeasureTimers.push(window.setTimeout(remeasure, 400));
    remeasureTimers.push(window.setTimeout(remeasure, 1200));
    window.addEventListener("load", remeasure);
    if (typeof document !== "undefined" && (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts) {
      const fonts = (document as Document & { fonts: { ready?: Promise<unknown> } }).fonts;
      fonts.ready?.then(remeasure).catch(() => {});
    }
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined" && ref.current) {
      ro = new ResizeObserver(remeasure);
      ro.observe(ref.current);
      ro.observe(document.documentElement);
    }

    if (!smooth) {
      const update = () => {
        targetRef.current = computeTarget();
        displayedRef.current = targetRef.current;
        setProgress(targetRef.current);
      };
      window.addEventListener("scroll", update, { passive: true });
      window.addEventListener("resize", update);
      return () => {
        window.removeEventListener("scroll", update);
        window.removeEventListener("resize", update);
        window.removeEventListener("load", remeasure);
        remeasureTimers.forEach((t) => clearTimeout(t));
        ro?.disconnect();
      };
    }

    const tick = () => {
      const target = targetRef.current;
      const cur = displayedRef.current;
      const diff = target - cur;
      const next = Math.abs(diff) < 0.00012 ? target : cur + diff * lerp;
      displayedRef.current = next;
      if (Math.abs(next - lastEmittedRef.current) >= emitDelta) {
        lastEmittedRef.current = next;
        setProgress(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", remeasure);
      remeasureTimers.forEach((t) => clearTimeout(t));
      ro?.disconnect();
    };
  }, [ref, smooth, lerp, emitDelta]);

  return [progress, displayedRef];
}

export function useInView(ref: React.RefObject<HTMLElement | null>, threshold = 0.15) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return inView;
}

export function mapClamp(value: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  const t = Math.max(0, Math.min(1, (value - inMin) / (inMax - inMin)));
  return outMin + (outMax - outMin) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
