"use client";

import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { PIPELINE_STEPS } from "@/lib/pipeline";

const STEP_LABELS: Record<string, string> = {
  clone_repo: "Clone Repository",
  identify_ui_files: "Identify UI Files",
  screenshot_pages: "Screenshot Pages",
  analyze_screenshots: "Analyze Screenshots",
  generate_redesign: "Generate Redesign",
  upload_assets: "Upload Assets",
  open_pr: "Open Pull Request",
};

export default function RunProgressPage() {
  const { jobId } = useParams<{ jobId: string }>();

  // TODO: Fetch real job data via SWR / polling from /api/jobs/[jobId].

  return (
    <main className="mx-auto max-w-3xl p-8">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2 text-3xl font-bold"
      >
        Run Progress
      </motion.h1>

      <p className="mb-8 text-foreground/50">Job ID: {jobId}</p>

      <ol className="space-y-4">
        {PIPELINE_STEPS.map((step, i) => (
          <motion.li
            key={step}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-4 rounded-lg border border-foreground/10 p-4"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-sm font-semibold">
              {i + 1}
            </span>
            <span>{STEP_LABELS[step] ?? step}</span>
            <span className="ml-auto text-xs text-foreground/40">PENDING</span>
          </motion.li>
        ))}
      </ol>
    </main>
  );
}
