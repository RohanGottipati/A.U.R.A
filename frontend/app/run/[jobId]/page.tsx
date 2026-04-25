import Link from "next/link";
import { pipelineSteps } from "@/lib/mock-data";

type RunPageProps = {
  params: {
    jobId: string;
  };
};

function getProgressIndex(jobId: string): number {
  const checksum = jobId
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0);

  return checksum % pipelineSteps.length;
}

function getStepState(stepIndex: number, progressIndex: number): "complete" | "current" | "upcoming" {
  if (stepIndex < progressIndex) {
    return "complete";
  }

  if (stepIndex === progressIndex) {
    return progressIndex === pipelineSteps.length - 1 ? "complete" : "current";
  }

  return "upcoming";
}

export default function RunProgressPage({ params }: RunPageProps) {
  const progressIndex = getProgressIndex(params.jobId);
  const completedStepCount = progressIndex + 1;
  const progressPercent = Math.round(
    (completedStepCount / pipelineSteps.length) * 100,
  );
  const isComplete = progressIndex === pipelineSteps.length - 1;
  const placeholderPrUrl = `https://github.com/example/aura-demo/pull/${completedStepCount + 100}`;

  return (
    <main className="mx-auto min-h-screen max-w-5xl p-8">
      <div className="mb-8 flex flex-col gap-3">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-foreground/60 transition hover:text-foreground"
        >
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">
          AURA Run Progress
        </h1>
        <p className="text-sm text-foreground/60">
          Placeholder progress for job <span className="font-medium">{params.jobId}</span>.
        </p>
      </div>

      <section className="mb-6 rounded-2xl border border-foreground/10 p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-foreground/50">Current Step</p>
            <p className="mt-1 text-lg font-medium">
              {pipelineSteps[progressIndex]}
            </p>
          </div>
          <div className="rounded-full bg-foreground/5 px-3 py-1 text-sm font-medium">
            {progressPercent}%
          </div>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-foreground transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p className="mt-3 text-sm text-foreground/60">
          {isComplete
            ? "This placeholder run is complete."
            : "This is mock progress only. No real pipeline is running yet."}
        </p>
      </section>

      <section className="mb-6 rounded-2xl border border-foreground/10 p-6">
        <h2 className="mb-4 text-xl font-semibold">Pipeline Steps</h2>
        <ol className="space-y-3">
          {pipelineSteps.map((step, index) => {
            const state = getStepState(index, progressIndex);
            const stateStyles = {
              complete: "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300",
              current: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
              upcoming: "border-foreground/10 bg-transparent text-foreground/65",
            }[state];

            const stateLabel = {
              complete: "Complete",
              current: "In Progress",
              upcoming: "Pending",
            }[state];

            return (
              <li
                key={step}
                className={`flex items-center justify-between rounded-xl border p-4 ${stateStyles}`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-background text-sm font-semibold text-foreground shadow-sm">
                    {index + 1}
                  </span>
                  <span className="font-medium">{step}</span>
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                  {stateLabel}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mb-6 rounded-2xl border border-foreground/10 p-6">
        <h2 className="mb-4 text-xl font-semibold">Before / After Screenshots</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-foreground/20 bg-foreground/5 text-sm text-foreground/55">
            Before screenshot placeholder
          </div>
          <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-foreground/20 bg-foreground/5 text-sm text-foreground/55">
            After screenshot placeholder
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-foreground/10 p-6">
        <h2 className="mb-4 text-xl font-semibold">Pull Request</h2>
        {isComplete ? (
          <a
            href={placeholderPrUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
          >
            View Placeholder PR
          </a>
        ) : (
          <div className="rounded-xl border border-dashed border-foreground/20 bg-foreground/5 p-4 text-sm text-foreground/60">
            Placeholder PR link will appear here when the mock run reaches the
            final step.
          </div>
        )}
      </section>
    </main>
  );
}
