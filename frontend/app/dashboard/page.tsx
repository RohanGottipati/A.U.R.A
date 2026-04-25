"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { listJobs } from "@/lib/api";
import type { JobResponse } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-500/20 text-yellow-400",
  RUNNING: "bg-blue-500/20 text-blue-400",
  COMPLETED: "bg-green-500/20 text-green-400",
  FAILED: "bg-red-500/20 text-red-400",
};

export default function DashboardPage() {
  const [jobs, setJobs] = useState<JobResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadJobs() {
      try {
        const data = await listJobs();

        if (!cancelled) {
          setJobs(data.jobs);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load jobs from the backend.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadJobs();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto max-w-4xl p-8">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-3xl font-bold"
      >
        Dashboard
      </motion.h1>

      <section className="mb-8 rounded-lg border border-foreground/10 p-6">
        <p className="text-foreground/60">
          Backend calls now flow through the separate API app. The new job form
          can be wired here once the create-job UX is ready.
        </p>
      </section>

      {error ? (
        <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </p>
      ) : null}

      <h2 className="mb-4 text-xl font-semibold">Recent Jobs</h2>

      {isLoading ? (
        <p className="text-foreground/50">Loading jobs from the backend...</p>
      ) : jobs.length === 0 ? (
        <section className="rounded-lg border border-foreground/10 p-6 text-foreground/60">
          No jobs yet. Create one from the backend-connected dashboard flow.
        </section>
      ) : (
        <div className="space-y-4">
          {jobs.map((job, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                href={`/run/${job.id}`}
                className="flex items-center justify-between rounded-lg border border-foreground/10 p-4 transition hover:border-foreground/30"
              >
                <div>
                  <p className="font-medium">{job.repoUrl}</p>
                  <p className="text-sm text-foreground/50">
                    {job.branch} &middot; {job.id}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[job.status] ?? ""}`}
                >
                  {job.status}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </main>
  );
}
