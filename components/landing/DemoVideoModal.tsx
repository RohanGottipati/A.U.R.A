"use client";

import { useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useModal } from "@/context/ModalContext";
import { X } from "lucide-react";

// Default playback source is the YouTube-hosted demo — keeps the deploy bundle
// small and lets us update the cut without redeploying. Set
// NEXT_PUBLIC_DEMO_VIDEO_URL to an absolute MP4/HLS URL to switch back to a
// self-hosted <video> element (useful for an offline preview build).
const YOUTUBE_VIDEO_ID = "f_xnGSgf7h4";
const DEMO_VIDEO_URL = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL || "";

export default function DemoVideoModal() {
  const { open, closeModal } = useModal();
  const videoRef = useRef<HTMLVideoElement>(null);
  const isOpen = open === "demo";
  const useYouTube = !DEMO_VIDEO_URL;

  // Pause + reset playback whenever the modal closes so re-opening starts fresh.
  // (The YouTube iframe is fully unmounted by Radix Dialog when isOpen flips
  // false, which already stops playback — this hook only matters for the
  // self-hosted <video> branch.)
  useEffect(() => {
    if (useYouTube) return;
    const v = videoRef.current;
    if (!v) return;
    if (!isOpen) {
      try {
        v.pause();
        v.currentTime = 0;
      } catch {
        /* ignore */
      }
    } else {
      // Best-effort autoplay; browsers require muted for autoplay without gesture.
      v.play().catch(() => {
        /* ignore — user can hit the play control */
      });
    }
  }, [isOpen, useYouTube]);

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && closeModal()}>
      <DialogContent
        className="bg-[#0a0a0f] border border-[#1a1a26] text-white max-w-4xl p-0 overflow-hidden"
      >
        <button
          onClick={closeModal}
          aria-label="Close demo video"
          className="absolute top-3 right-3 z-20 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 p-1.5 text-white/70 hover:text-white hover:border-white/30 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-6 pt-5 pb-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] text-[#00f0ff]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] blink" />
            FLR // PRODUCT DEMO
          </div>
          <span className="font-mono text-[10px] tracking-[0.3em] text-white/30">
            v0.4.1
          </span>
        </div>

        <div className="relative w-full bg-black aspect-video">
          {useYouTube ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&rel=0&modestbranding=1`}
              title="A.U.R.A product demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          ) : (
            <video
              ref={videoRef}
              src={DEMO_VIDEO_URL}
              controls
              playsInline
              preload="metadata"
              className="absolute inset-0 w-full h-full object-contain bg-black"
            />
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between gap-4">
          <div>
            <div className="font-heading text-sm tracking-tight text-white">
              Watch A.U.R.A in motion
            </div>
            <div className="font-mono text-[10px] tracking-[0.22em] text-white/45 mt-1 uppercase">
              Floor plan in. Walkable 3D out.
            </div>
          </div>
          <button
            onClick={closeModal}
            className="font-mono text-[10px] tracking-[0.28em] uppercase text-white/55 hover:text-white transition"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
