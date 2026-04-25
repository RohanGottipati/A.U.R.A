"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { getJob } from "@/lib/api";
import type { JobResponse } from "@/lib/types";

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
  const [job, setJob] = useState<JobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadJob() {
      try {
        const nextJob = await getJob(jobId);

        if (!cancelled) {
          setJob(nextJob);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load job progress from the backend.",
          );
        }
      }
    }

    if (jobId) {
      void loadJob();
    }

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  if (error) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </p>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <p className="text-foreground/50">Loading job progress...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2 text-3xl font-bold"
      >
        Run Progress
      </motion.h1>

      <p className="mb-2 text-foreground/50">Job ID: {jobId}</p>
      <p className="mb-8 text-sm text-foreground/50">
        {job.repoUrl} on {job.branch} • {job.status}
      </p>

      <ol className="space-y-4">
        {job.steps.map((step, i) => (
          <motion.li
            key={step.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-4 rounded-lg border border-foreground/10 p-4"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-sm font-semibold">
              {i + 1}
            </span>
            <span>{STEP_LABELS[step.name] ?? step.name}</span>
            <span className="ml-auto text-xs text-foreground/40">
              {step.status}
            </span>
          </motion.li>
        ))}
      </ol>
    </main>
  );
}
