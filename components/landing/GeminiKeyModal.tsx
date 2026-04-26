"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useModal } from "@/context/ModalContext";
import { ArrowRight, Check, Eye, EyeOff, KeyRound, X } from "lucide-react";

export const GEMINI_KEY_STORAGE = "aura_gemini_api_key";

// Google API keys are typically ~39 chars and start with "AIza".
function looksLikeGeminiKey(value: string): boolean {
  const v = value.trim();
  if (v.length < 20) return false;
  return /^AIza[0-9A-Za-z_-]{20,}$/.test(v) || v.length >= 32;
}

export default function GeminiKeyModal() {
  const router = useRouter();
  const { open, closeModal } = useModal();
  const isOpen = open === "geminiKey";

  const [apiKey, setApiKey] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Pre-fill if the user already configured one previously.
  useEffect(() => {
    if (!isOpen) return;
    try {
      const existing = localStorage.getItem(GEMINI_KEY_STORAGE) ?? "";
      setApiKey(existing);
    } catch {
      /* localStorage may be blocked; ignore */
    }
    setError(null);
    setSaved(false);
    setShow(false);
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = apiKey.trim();

    if (!trimmed) {
      setError("Paste your Gemini API key to continue.");
      return;
    }
    if (!looksLikeGeminiKey(trimmed)) {
      setError("That doesn't look like a valid Gemini API key.");
      return;
    }

    try {
      localStorage.setItem(GEMINI_KEY_STORAGE, trimmed);
    } catch {
      setError("Couldn't save the key locally. Check browser storage settings.");
      return;
    }

    setError(null);
    setSaved(true);
    // Brief success state, then route into the simulator.
    setTimeout(() => {
      closeModal();
      router.push("/upload");
    }, 700);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && closeModal()}>
      <DialogContent className="bg-[#0a0a0f] border border-[#1a1a26] text-white max-w-md p-0 overflow-hidden">
        <button
          onClick={closeModal}
          aria-label="Close API key dialog"
          className="absolute top-4 right-4 z-10 text-white/40 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-6 pt-5 pb-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] text-[#00f0ff]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] blink" />
            FLR // GEMINI KEY
          </div>
          <span className="font-mono text-[10px] tracking-[0.3em] text-white/30">
            v0.4.1
          </span>
        </div>

        <DialogHeader className="px-6 pt-6 pb-2 text-left">
          <DialogTitle className="font-heading text-2xl tracking-tight text-white flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#00f0ff]" />
            {saved ? "Key locked in." : "Bring your own key."}
          </DialogTitle>
          <p className="text-sm text-white/55 mt-1">
            {saved
              ? "Routing you to the simulator…"
              : "Paste your Gemini API key to run a real simulation. Stored locally in this browser only."}
          </p>
        </DialogHeader>

        {saved ? (
          <div className="px-6 py-10 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full border border-[#00ffaa]/40 bg-[#00ffaa]/5 flex items-center justify-center mb-4">
              <Check className="w-5 h-5 text-[#00ffaa]" />
            </div>
            <p className="font-mono text-[11px] tracking-[0.3em] text-[#00ffaa]">
              KEY READY
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 pt-4 pb-6 space-y-5">
            <div>
              <div className="font-mono text-[10px] tracking-[0.3em] text-white/40 mb-2">
                GEMINI API KEY
              </div>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="AIza…"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full bg-transparent border-0 border-b border-white/10 focus:border-[#00f0ff] outline-none py-2 pr-9 text-white placeholder:text-white/25 font-mono text-sm tracking-tight transition"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Hide key" : "Show key"}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition p-1"
                >
                  {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {error && (
                <div className="mt-2 font-mono text-[10px] tracking-[0.18em] uppercase text-[#ff3b30]">
                  {error}
                </div>
              )}
            </div>

            <div className="rounded border border-white/10 bg-white/[0.02] p-3 text-[11px] leading-relaxed text-white/60">
              Don&apos;t have one yet?{" "}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer noopener"
                className="text-[#00f0ff] hover:underline"
              >
                Generate a free key in Google AI Studio
              </a>
              . Your key never leaves your browser except when you submit a simulation.
            </div>

            <button
              type="submit"
              disabled={!apiKey.trim()}
              className="cta-primary w-full px-5 py-3 rounded font-mono text-xs tracking-[0.28em] uppercase flex items-center justify-center gap-2 disabled:opacity-40"
            >
              Use this key
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <p className="text-[10px] font-mono tracking-[0.18em] text-white/25 text-center">
              You can clear the key anytime from your browser&apos;s storage.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
