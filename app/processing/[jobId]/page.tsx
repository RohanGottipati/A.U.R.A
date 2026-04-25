"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import ProgressTracker from "@/components/ProgressTracker";

export default function ProcessingPage() {
  const params = useParams();
  const jobId = params.jobId as string;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="mb-8 text-center">
        <Link
          href="/upload"
          className="text-sm font-medium text-foreground/60 transition hover:text-foreground"
        >
          &larr; Back to Upload
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          Building Your Scene
        </h1>
        <p className="mt-2 text-foreground/60">
          Our AI agents are analyzing your floor plan and configuring the space.
        </p>
      </div>

      <ProgressTracker jobId={jobId} />
    </main>
  );
}
