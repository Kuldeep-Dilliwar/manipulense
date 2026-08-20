import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { techniqueSlug } from "@/lib/analysis";
import { levelOf, loadHistory, type HistoryItem } from "@/lib/history";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Manipulation Dashboard — ManipuLens" },
      {
        name: "description",
        content:
          "Your private ManipuLens dashboard: totals, average manipulation score, most detected technique and a diary of every past analysis.",
      },
      { property: "og:title", content: "Manipulation Dashboard — ManipuLens" },
      {
        property: "og:description",
        content: "Stats and a timeline diary of everything you've analyzed with ManipuLens.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

const LEVELS = ["low", "moderate", "high", "extreme"] as const;

function Dashboard() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  useEffect(() => setHistory(loadHistory()), []);

  const stats = useMemo(() => {
    const total = history.length;
    const avg = total
      ? Math.round(history.reduce((s, h) => s + h.result.score, 0) / total)
      : 0;

    const counts = new Map<string, number>();
    for (const h of history)
      for (const f of h.result.findings) {
        const k = f.technique.toLowerCase();
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];

    const dist = LEVELS.map((l) => ({
      level: l,
      count: history.filter((h) => levelOf(h.result.score) === l).length,
    }));

    const urls = history.filter((h) => h.kind === "url").length;
    const contentType = total === 0 ? "—" : urls > total - urls ? "Links" : "Pasted text";

    return { total, avg, top, dist, contentType };
  }, [history]);

  const maxCount = Math.max(1, ...stats.dist.map((d) => d.count));

  return (
    <main className="min-h-screen bg-background bg-grid">
      <div className="mx-auto max-w-4xl px-5 py-14">
        <header className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              Private dashboard
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
              Your manipulation diary
            </h1>
          </div>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back
          </Link>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total analyses" value={String(stats.total)} />
          <Stat label="Average score" value={`${stats.avg}`} />
          <Stat
            label="Most detected"
            value={stats.top ? stats.top[0] : "—"}
            hint={stats.top ? `${stats.top[1]}×` : undefined}
          />
          <Stat label="Most analyzed" value={stats.contentType} />
        </div>

        <Card className="mt-8 p-6">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Manipulation level distribution
          </h2>
          <div className="space-y-3">
            {stats.dist.map((d) => (
              <div key={d.level} className="flex items-center gap-3">
                <span className="w-20 text-xs capitalize text-muted-foreground">{d.level}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(d.count / maxCount) * 100}%`,
                      backgroundColor:
                        d.level === "extreme"
                          ? "var(--fear)"
                          : d.level === "high"
                            ? "var(--urgency)"
                            : d.level === "moderate"
                              ? "var(--cherry)"
                              : "var(--bandwagon)",
                    }}
                  />
                </div>
                <span className="w-6 text-right text-xs tabular-nums text-muted-foreground">
                  {d.count}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <section className="mt-10">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Manipulation diary
          </h2>
          {history.length === 0 ? (
            <Card className="p-6 text-sm text-muted-foreground">
              Nothing analyzed yet. Run your first analysis on the home page.
            </Card>
          ) : (
            <ol className="relative space-y-4 border-l border-border pl-6">
              {history.map((h) => (
                <li key={h.id} className="relative">
                  <span
                    className="absolute -left-[1.9rem] top-4 h-3 w-3 rounded-full"
                    style={{
                      backgroundColor:
                        h.result.score >= 70 ? "var(--fear)" : "var(--bandwagon)",
                    }}
                  />
                  <Card className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground">
                        {new Date(h.at).toLocaleString()}
                        {h.kind === "url" ? " · link" : " · text"}
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {h.result.score}/100
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-foreground">
                      {h.result.text.slice(0, 200)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[...new Set(h.result.findings.map((f) => f.technique.toLowerCase()))].map(
                        (t) => (
                          <span
                            key={t}
                            className={`mark-technique tech-${techniqueSlug(t)} text-xs capitalize`}
                          >
                            {t}
                          </span>
                        ),
                      )}
                    </div>
                  </Card>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string | undefined;
}) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 truncate text-2xl font-semibold capitalize text-foreground">
        {value}
        {hint && <span className="ml-2 text-sm text-muted-foreground">{hint}</span>}
      </p>
    </Card>
  );
}
