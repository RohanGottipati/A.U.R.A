"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useModal } from "@/context/ModalContext";

export default function Navigation() {
  const { openModal } = useModal();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "py-3" : "py-5"}`}
    >
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div
          className={`flex items-center justify-between rounded-full px-5 md:px-6 py-3 transition-all duration-500 ${scrolled ? "glass border border-white/5" : "border border-transparent"}`}
        >
          <a href="#top" className="flex items-center gap-2 group">
            <span className="relative inline-block">
              <span className="block w-2.5 h-2.5 rounded-full bg-[#00f0ff] shadow-[0_0_12px_#00f0ff]" />
            </span>
            <span className="font-heading font-medium tracking-[0.18em] text-white text-sm">
              A.U.R.A
            </span>
            <span className="hidden sm:inline font-mono text-[10px] tracking-[0.32em] text-white/30 ml-1">
              / SIM ENGINE
            </span>
          </a>

          <div className="hidden md:flex items-center gap-7 font-mono text-[11px] tracking-[0.22em] uppercase">
            <a href="#experience" className="text-white/55 hover:text-white transition">Simulation</a>
            <a href="#features" className="text-white/55 hover:text-white transition">Product</a>
            <a href="#use-cases" className="text-white/55 hover:text-white transition">Use Cases</a>
            <a href="#architecture" className="text-white/55 hover:text-white transition">Architecture</a>
          </div>

          <button
            onClick={openModal}
            className="cta-primary px-4 py-2 rounded-full font-mono text-[10px] tracking-[0.28em] uppercase flex items-center gap-1.5"
          >
            Get access
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </nav>
  );
}
