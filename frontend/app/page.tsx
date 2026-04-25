// DEPRECATED - replaced by /app/page.tsx (FloorPlan AI landing page)
"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <h1 className="text-5xl font-bold tracking-tight">
          A.U.R.A
        </h1>
        <p className="mt-4 text-lg text-foreground/70">
          Automated UI Redesign Assistant
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <Link
          href="/dashboard"
          className="rounded-lg bg-foreground px-6 py-3 text-background transition hover:opacity-90"
        >
          Go to Dashboard
        </Link>
      </motion.div>
    </main>
  );
}
