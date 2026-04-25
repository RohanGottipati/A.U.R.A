"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const USE_CASES = [
  {
    title: "Hackathon",
    icon: "\uD83D\uDCBB",
    prompt: "Hacking stations along walls, sponsor booths in center, ceremony stage at front",
  },
  {
    title: "Events & Galas",
    icon: "\uD83C\uDF89",
    prompt: "200 person gala with round tables, a dance floor, and a bar on the east wall",
  },
  {
    title: "Office Planning",
    icon: "\uD83C\uDFE2",
    prompt: "Open plan with 40 desks, 3 meeting rooms, and a lounge near the entrance",
  },
  {
    title: "Factory Layout",
    icon: "\u2699\uFE0F",
    prompt: "Assembly line with 3 workstations, forklift path down center, storage in back",
  },
];

const STEPS = [
  { number: "1", title: "Upload your floor plan", desc: "JPG, PNG, or WebP image of any floor plan" },
  { number: "2", title: "Describe your use case", desc: "Plain English — just say what you need" },
  { number: "3", title: "Walk through in 3D", desc: "Explore your configured space interactively" },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="flex min-h-screen flex-col items-center justify-center gap-8 p-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-balance text-5xl font-bold tracking-tight md:text-7xl">
            Upload any floor plan.
            <br />
            <span className="text-accent">Configure any space.</span>
            <br />
            In seconds.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-foreground/60">
            AI reads your floor plan and use case, then builds a walkable 3D scene of your configured space.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Link
            href="/upload"
            className="rounded-xl bg-accent px-8 py-4 text-lg font-semibold text-white transition hover:opacity-90"
          >
            Get Started
          </Link>
        </motion.div>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-6xl px-8 py-24">
        <h2 className="mb-12 text-center text-3xl font-bold">How It Works</h2>
        <div className="grid gap-8 md:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="rounded-2xl border border-foreground/10 p-8 text-center"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/20 text-2xl font-bold text-accent">
                {step.number}
              </div>
              <h3 className="mb-2 text-xl font-semibold">{step.title}</h3>
              <p className="text-sm text-foreground/60">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Use Cases */}
      <section className="mx-auto max-w-6xl px-8 py-24">
        <h2 className="mb-12 text-center text-3xl font-bold">Any Space, Any Use Case</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {USE_CASES.map((uc) => (
            <div
              key={uc.title}
              className="rounded-2xl border border-foreground/10 p-6 transition hover:border-accent/30"
            >
              <div className="mb-3 text-4xl">{uc.icon}</div>
              <h3 className="mb-2 text-lg font-semibold">{uc.title}</h3>
              <p className="text-sm italic text-foreground/50">&ldquo;{uc.prompt}&rdquo;</p>
            </div>
          ))}
        </div>
      </section>

      {/* Powered By */}
      <section className="border-t border-foreground/10 px-8 py-16 text-center">
        <p className="mb-6 text-sm uppercase tracking-widest text-foreground/40">Powered By</p>
        <div className="flex flex-wrap items-center justify-center gap-8 text-lg font-medium text-foreground/50">
          <span>Gemini</span>
          <span>&middot;</span>
          <span>Three.js</span>
          <span>&middot;</span>
          <span>Vultr</span>
          <span>&middot;</span>
          <span>Backboard</span>
        </div>
      </section>
    </main>
  );
}
