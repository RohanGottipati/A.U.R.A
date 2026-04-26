'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Boxes, Layers, Zap, AlertTriangle, ArrowUpRight } from 'lucide-react';

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
  {
    key: 'agent1',
    stage: '01',
    label: 'Geometry agent',
    sub: 'Reading walls, doors, scale from your floor plan',
    accent: '#00f0ff',
    icon: <Layers className="w-3.5 h-3.5" />,
  },
  {
    key: 'agent2',
    stage: '02',
    label: 'Placement agent',
    sub: 'Composing layout from your scene brief',
    accent: '#0a84ff',
    icon: <Boxes className="w-3.5 h-3.5" />,
  },
  {
    key: 'agent3',
    stage: '03',
    label: 'Scene assembler',
    sub: 'Building the walkable real-time 3D world',
    accent: '#00ffaa',
    icon: <Zap className="w-3.5 h-3.5" />,
  },
];

const LOG_LINES_PER_STATUS: Record<string, string[]> = {
  pending: [
    'queue.enqueue → job accepted',
    'storage.persist → blueprint stored',
    'pipeline.bootstrap → cold start ready',
  ],
  agent1_running: [
    'agent1.geometry → fetching image bytes',
    'agent1.geometry → invoking gemini vision',
    'agent1.geometry → parsing wall polygons',
  ],
  agent1_done: [
    'agent1.geometry → ✓ floor plan normalized',
    'agent1.geometry → handing off to placement',
  ],
  agent2_running: [
    'agent2.placement → reading scene brief',
    'agent2.placement → resolving spatial constraints',
    'agent2.placement → packing objects into rooms',
  ],
  agent2_done: [
    'agent2.placement → ✓ layout solved',
    'agent2.placement → emitting object manifest',
  ],
  agent3_running: [
    'agent3.assembler → constructing meshes',
    'agent3.assembler → baking materials & lights',
    'agent3.assembler → spawning crowd path-finders',
  ],
  complete: [
    'agent3.assembler → ✓ scene compiled',
    'pipeline.exit → handing off to viewer',
  ],
  failed: ['pipeline.error → run halted'],
};

function getStepState(status: string, stepPrefix: string): 'waiting' | 'running' | 'done' {
  const order = [
    'pending',
    'agent1_running',
    'agent1_done',
    'agent2_running',
    'agent2_done',
    'agent3_running',
    'complete',
  ];
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
    label: 'Preparing your floor plan…',
    progress: 5,
    sceneId: null,
    error: null,
  });
  const [logLines, setLogLines] = useState<string[]>(['pipeline.bootstrap → connecting to engine']);
  const [elapsed, setElapsed] = useState(0);
  const seenStatuses = useRef<Set<string>>(new Set(['pending']));
  const startTime = useRef(Date.now());

  // Poll job status
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/job/${jobId}`);
        const data: JobStatus = await res.json();
        setJobStatus(data);

        if (!seenStatuses.current.has(data.status)) {
          seenStatuses.current.add(data.status);
          const newLines = LOG_LINES_PER_STATUS[data.status] ?? [];
          setLogLines((prev) => [...prev, ...newLines].slice(-12));
        }

        if (data.status === 'complete' && data.sceneId) {
          clearInterval(interval);
          setTimeout(() => router.push(`/scene/${data.sceneId}`), 600);
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

  // Tick elapsed time
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime.current) / 1000)), 250);
    return () => clearInterval(t);
  }, []);

  const elapsedLabel = useMemo(() => {
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, [elapsed]);

  const failed = jobStatus.status === 'failed';
  const complete = jobStatus.status === 'complete';

  return (
    <div className="space-y-6">
      {/* ─── Master status panel ──────────────────────────────────── */}
      <div className="glass rounded-2xl p-6 md:p-8 relative overflow-hidden">
        {/* Corner brackets */}
        <span className="absolute top-0 left-0 w-5 h-5 border-t border-l border-[#00f0ff]/40 rounded-tl-2xl" />
        <span className="absolute top-0 right-0 w-5 h-5 border-t border-r border-[#00f0ff]/40 rounded-tr-2xl" />
        <span className="absolute bottom-0 left-0 w-5 h-5 border-b border-l border-[#00f0ff]/40 rounded-bl-2xl" />
        <span className="absolute bottom-0 right-0 w-5 h-5 border-b border-r border-[#00f0ff]/40 rounded-br-2xl" />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] uppercase text-[#00f0ff]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] blink" />
            FLR // Pipeline stream
          </div>
          <div className="flex items-center gap-4 font-mono text-[10px] tracking-[0.3em] uppercase text-white/40">
            <span>ELAPSED · {elapsedLabel}</span>
            <span className="text-white/20">/</span>
            <span>JOB {jobId.slice(0, 8)}</span>
          </div>
        </div>

        <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
          <p className="font-heading text-2xl sm:text-3xl tracking-tight text-white">
            {jobStatus.label}
          </p>
          <span
            className="font-mono text-3xl sm:text-4xl tracking-tight"
            style={{
              color: failed ? '#ff3b30' : complete ? '#00ffaa' : '#00f0ff',
              textShadow: !failed
                ? `0 0 24px ${complete ? 'rgba(0,255,170,0.4)' : 'rgba(0,240,255,0.4)'}`
                : undefined,
            }}
          >
            {jobStatus.progress}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="relative h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 transition-all duration-700"
            style={{
              width: `${jobStatus.progress}%`,
              background: failed
                ? 'linear-gradient(90deg, #ff3b30, #ff6b6b)'
                : complete
                  ? 'linear-gradient(90deg, #00f0ff, #00ffaa)'
                  : 'linear-gradient(90deg, #0a84ff, #00f0ff)',
              boxShadow: !failed
                ? `0 0 18px ${complete ? 'rgba(0,255,170,0.45)' : 'rgba(0,240,255,0.45)'}`
                : undefined,
            }}
          />
          {!failed && !complete && (
            <div
              className="absolute inset-y-0 w-24 opacity-50"
              style={{
                left: `${Math.max(0, jobStatus.progress - 6)}%`,
                background:
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                animation: 'shimmer 1.6s ease-in-out infinite',
              }}
            />
          )}
        </div>

        {/* Status meta */}
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] tracking-[0.28em] uppercase">
          <Meta label="State" value={jobStatus.status.replace('_', ' ')} accent="#00f0ff" />
          <Meta label="Step" value={`${stepIndex(jobStatus.status)} of 03`} />
          <Meta label="Mode" value="Realtime" />
          <Meta
            label="Health"
            value={failed ? 'Halted' : 'Nominal'}
            accent={failed ? '#ff3b30' : '#00ffaa'}
          />
        </div>
      </div>

      {/* ─── Pipeline stages ─────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">
        {AGENT_STEPS.map((step) => {
          const state = getStepState(jobStatus.status, step.key);
          const active = state === 'running';
          const done = state === 'done';
          return (
            <div
              key={step.key}
              className="relative rounded-xl glass p-5 transition-all overflow-hidden"
              style={{
                boxShadow: active
                  ? `0 0 0 1px ${step.accent}66, 0 0 32px ${step.accent}33`
                  : done
                    ? `0 0 0 1px ${step.accent}33`
                    : undefined,
              }}
            >
              {active && (
                <div
                  className="absolute inset-0 pointer-events-none opacity-30"
                  style={{
                    background: `radial-gradient(ellipse 80% 60% at 0% 0%, ${step.accent}33, transparent 65%)`,
                  }}
                />
              )}

              <div className="relative flex items-center justify-between mb-3">
                <span className="font-mono text-[10px] tracking-[0.32em] text-white/40">
                  STAGE {step.stage}
                </span>
                <div className="flex items-center gap-2">
                  <span style={{ color: done || active ? step.accent : 'rgba(255,255,255,0.25)' }}>
                    {step.icon}
                  </span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${active ? 'blink' : ''}`}
                    style={{
                      background:
                        done || active ? step.accent : 'rgba(255,255,255,0.18)',
                      boxShadow: done || active ? `0 0 12px ${step.accent}` : undefined,
                    }}
                  />
                </div>
              </div>

              <div className="relative font-heading text-base tracking-tight text-white">
                {step.label}
              </div>
              <div className="relative font-mono text-[10px] tracking-[0.18em] text-white/45 mt-1 leading-relaxed">
                {step.sub}
              </div>

              <div className="relative mt-4 h-1 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full transition-all duration-700"
                  style={{
                    width: done ? '100%' : active ? '55%' : '0%',
                    background: step.accent,
                    boxShadow: active || done ? `0 0 10px ${step.accent}` : undefined,
                  }}
                />
              </div>

              <div className="relative mt-3 font-mono text-[10px] tracking-[0.3em] uppercase">
                {done ? (
                  <span style={{ color: step.accent }}>✓ Complete</span>
                ) : active ? (
                  <span style={{ color: step.accent }} className="blink">
                    Processing
                  </span>
                ) : (
                  <span className="text-white/30">Standby</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Live log stream ─────────────────────────────────────── */}
      <div className="glass rounded-xl p-5 md:p-6 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
          <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/50 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ffaa] blink" />
            {"// Engine telemetry"}
          </span>
          <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/30">
            stdout · live
          </span>
        </div>
        <ul className="space-y-1.5 font-mono text-[11px] leading-relaxed">
          {logLines.slice(-8).map((line, i, arr) => {
            const dim = i < arr.length - 1;
            const isLast = i === arr.length - 1;
            return (
              <li
                key={`${line}-${i}`}
                className={`flex items-start gap-3 ${dim ? 'text-white/35' : 'text-white/85'}`}
              >
                <span className="text-[#00f0ff]/70 select-none shrink-0">
                  [{String(i).padStart(2, '0')}]
                </span>
                <span className="break-all">
                  {line}
                  {isLast && !failed && !complete && (
                    <span className="ml-1 inline-block w-1.5 h-3 -mb-0.5 bg-[#00f0ff] blink align-middle" />
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ─── Error / Complete states ─────────────────────────────── */}
      {failed && jobStatus.error && (
        <div className="rounded-xl border border-[#ff3b30]/30 bg-[#ff3b30]/5 p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 mt-0.5 text-[#ff3b30] shrink-0" />
          <div className="flex-1">
            <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-[#ff3b30] mb-1">
              Pipeline halted
            </div>
            <div className="text-sm text-white/80 mb-4">{jobStatus.error}</div>
            <a
              href="/upload"
              className="cta-secondary inline-flex items-center gap-2 px-5 py-2.5 rounded-md font-mono text-[10px] tracking-[0.28em] uppercase"
            >
              Try another floor plan
              <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {complete && jobStatus.sceneId && (
        <div className="rounded-xl border border-[#00ffaa]/30 bg-[#00ffaa]/5 p-5 text-center">
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-[#00ffaa] mb-2">
            ✓ Scene assembled · redirecting
          </div>
          <div className="font-heading text-xl text-white">Welcome inside.</div>
        </div>
      )}
    </div>
  );
}

function Meta({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <span className="flex items-center gap-2">
      <span className="text-white/30">{label}</span>
      <span style={{ color: accent ?? 'rgba(255,255,255,0.85)' }}>{value}</span>
    </span>
  );
}

function stepIndex(status: string): string {
  if (status === 'pending') return '01';
  if (status.startsWith('agent1')) return '01';
  if (status.startsWith('agent2')) return '02';
  if (status.startsWith('agent3') || status === 'complete') return '03';
  return '01';
}
