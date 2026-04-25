// DEPRECATED - replaced by /app/upload/page.tsx (FloorPlan AI upload page)
import Link from "next/link";
import { mockRepos } from "@/lib/mock-data";

const updatedAtFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatUpdatedAt(value: string): string {
  return updatedAtFormatter.format(new Date(value));
}

export default function DashboardPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl p-8">
      <div className="mb-8 flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          AURA Dashboard
        </h1>
        <p className="max-w-2xl text-sm text-foreground/65">
          Placeholder repo overview using mock data. No real backend connection
          yet.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {mockRepos.map((repo) => (
          <article
            key={repo.id}
            className="flex h-full flex-col justify-between rounded-2xl border border-foreground/10 bg-background p-5 shadow-sm"
          >
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-foreground/45">
                  Repository
                </p>
                <h2 className="text-xl font-semibold">{repo.name}</h2>
                <p className="text-sm text-foreground/60">{repo.fullName}</p>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-foreground/5 p-3">
                  <dt className="text-foreground/45">Language</dt>
                  <dd className="mt-1 font-medium">{repo.language}</dd>
                </div>
                <div className="rounded-xl bg-foreground/5 p-3">
                  <dt className="text-foreground/45">Stars</dt>
                  <dd className="mt-1 font-medium">{repo.stargazerCount}</dd>
                </div>
                <div className="col-span-2 rounded-xl bg-foreground/5 p-3">
                  <dt className="text-foreground/45">Updated</dt>
                  <dd className="mt-1 font-medium">
                    {formatUpdatedAt(repo.updatedAt)}
                  </dd>
                </div>
              </dl>
            </div>

            <Link
              href={`/run/${repo.id}`}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
            >
              Run AURA
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
