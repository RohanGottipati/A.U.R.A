'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  jobId: string;
}

interface JobStatus {
  status: string;
  label: string;
  progress: number;
  sceneId: string | null;
  error: string | null;
}

const AGENT_STEPS = [
  { key: 'agent1', label: 'Reading floor plan geometry', statusPrefix: 'agent1' },
  { key: 'agent2', label: 'Planning object placement', statusPrefix: 'agent2' },
  { key: 'agent3', label: 'Assembling 3D scene', statusPrefix: 'agent3' },
];

function getStepState(status: string, stepPrefix: string): 'waiting' | 'running' | 'done' {
  const order = ['pending', 'agent1_running', 'agent1_done', 'agent2_running', 'agent2_done', 'agent3_running', 'complete'];
  const currentIdx = order.indexOf(status);
  const runningIdx = order.indexOf(`${stepPrefix}_running`);
  const doneIdx = order.indexOf(`${stepPrefix}_done`);

  if (status === 'complete') return 'done';
  if (currentIdx >= doneIdx && doneIdx >= 0) return 'done';
  if (currentIdx >= runningIdx && runningIdx >= 0) return 'running';
  return 'waiting';
}

export default function ProgressTracker({ jobId }: Props) {
  const router = useRouter();
  const [jobStatus, setJobStatus] = useState<JobStatus>({
    status: 'pending',
    label: 'Preparing your floor plan...',
    progress: 5,
    sceneId: null,
    error: null,
  });

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/job/${jobId}`);
        const data: JobStatus = await res.json();
        setJobStatus(data);

        if (data.status === 'complete' && data.sceneId) {
          clearInterval(interval);
          router.push(`/scene/${data.sceneId}`);
        }
        if (data.status === 'failed') {
          clearInterval(interval);
        }
      } catch {
        // retry on next interval
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, router]);

  return (
    <div className="mx-auto max-w-xl space-y-8">
      {/* Progress bar */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-lg font-medium">{jobStatus.label}</p>
          <span className="rounded-full bg-foreground/5 px-3 py-1 text-sm font-medium">
            {jobStatus.progress}%
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${jobStatus.progress}%` }}
          />
        </div>
      </div>

      {/* Agent steps */}
      <div className="space-y-3">
        {AGENT_STEPS.map((step, idx) => {
          const state = getStepState(jobStatus.status, step.statusPrefix);
          return (
            <div
              key={step.key}
              className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${
                state === 'done'
                  ? 'border-green-500/30 bg-green-500/10'
                  : state === 'running'
                    ? 'border-accent/30 bg-accent/10'
                    : 'border-foreground/10'
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full">
                {state === 'done' ? (
                  <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : state === 'running' ? (
                  <svg className="h-6 w-6 animate-spin text-accent" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <span className="h-6 w-6 rounded-full border-2 border-foreground/20" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground/40">Step {idx + 1}</p>
                <p className="font-medium">{step.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error */}
      {jobStatus.error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          <p className="font-semibold">Processing failed</p>
          <p className="mt-1">{jobStatus.error}</p>
        </div>
      )}
    </div>
  );
}
