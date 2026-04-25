"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { JobResponse } from "@/lib/types";

// Mock data so the page renders before the API is wired up.
const MOCK_JOBS: JobResponse[] = [
  {
    id: "job_001",
    repoUrl: "https://github.com/example/my-app",
    branch: "main",
    status: "COMPLETED",
    steps: [],
    prUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "job_002",
    repoUrl: "https://github.com/example/landing-page",
    branch: "main",
    status: "RUNNING",
    steps: [],
    prUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "job_003",
    repoUrl: "https://github.com/example/dashboard-ui",
    branch: "develop",
    status: "PENDING",
    steps: [],
    prUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-500/20 text-yellow-400",
  RUNNING: "bg-blue-500/20 text-blue-400",
  COMPLETED: "bg-green-500/20 text-green-400",
  FAILED: "bg-red-500/20 text-red-400",
};

export default function DashboardPage() {
  // TODO: Replace mock data with SWR / fetch from /api/jobs once the API is live.
  const jobs = MOCK_JOBS;

  return (
    <main className="mx-auto max-w-4xl p-8">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-3xl font-bold"
      >
        Dashboard
      </motion.h1>

      {/* TODO: Add "New Job" form here (Person B). */}
      <section className="mb-8 rounded-lg border border-foreground/10 p-6">
        <p className="text-foreground/60">
          New job form placeholder — connect a GitHub repo and start a redesign
          run.
        </p>
      </section>

      <h2 className="mb-4 text-xl font-semibold">Recent Jobs</h2>

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
    </main>
  );
}
