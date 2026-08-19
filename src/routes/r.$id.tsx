import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { segmentText, techniqueSlug, type AnalysisResult } from "@/lib/analysis";
import { decodeReport } from "@/lib/history";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/r/$id")({
  head: () => ({
    meta: [
      { title: "Shared Manipulation Report — ManipuLens" },
      {
        name: "description",
        content:
          "A shared ManipuLens report: manipulation score, highlighted techniques and explanations for a piece of text.",
      },
      { property: "og:title", content: "Shared Manipulation Report — ManipuLens" },
      {
        property: "og:description",
        content: "See the manipulation score and highlighted techniques for this text.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SharedReport,
});

function SharedReport() {
  const { id } = Route.useParams();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    const fromHash = hash ? decodeReport(hash) : null;
    if (fromHash) {
      setResult(fromHash);
    } else {
      try {
        const raw = localStorage.getItem(`manipulens.report.${id}`);
        if (raw) setResult(JSON.parse(raw) as AnalysisResult);
      } catch {
        /* ignore */
      }
    }
    setReady(true);
  }, [id]);

  const segments = useMemo(
    () => (result ? segmentText(result.text, result.findings) : []),
    [result],
  );

  return (
    <main className="min-h-screen bg-background bg-grid">
      <div className="mx-auto max-w-3xl px-5 py-14">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              ManipuLens report
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              Shared analysis
            </h1>
          </div>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            Analyze your own →
          </Link>
        </header>

        {!ready ? null : !result ? (
          <Card className="p-6 text-sm text-muted-foreground">
            This report link is missing its data. Ask the sender to copy the full link.
          </Card>
        ) : (
          <div className="relative space-y-8">
            <Card className="flex items-center gap-6 p-8">
              <span
                className="grid h-24 w-24 shrink-0 place-items-center rounded-full text-3xl font-semibold tabular-nums"
                style={{
                  backgroundColor: "color-mix(in oklch, var(--fear) 18%, transparent)",
                  color: result.score >= 70 ? "var(--fear)" : "var(--urgency)",
                }}
              >
                {result.score}
              </span>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Manipulation score</h2>
                <p className="mt-1 text-sm text-muted-foreground">{result.summary}</p>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Annotated text
              </h2>
              <p className="whitespace-pre-wrap text-[15px] leading-8 text-foreground">
                {segments.map((s, i) =>
                  s.slug ? (
                    <mark key={i} className={`mark-technique tech-${s.slug}`} title={s.technique}>
                      {s.text}
                    </mark>
                  ) : (
                    <span key={i}>{s.text}</span>
                  ),
                )}
              </p>
            </Card>

            <div className="grid gap-4">
              {result.findings.map((f, i) => (
                <Card
                  key={i}
                  className={`tech-${techniqueSlug(f.technique)} rounded-xl border-l-[5px] p-5`}
                  style={{ borderLeftColor: "var(--tech)" }}
                >
                  <p className="text-sm font-semibold capitalize text-foreground">{f.technique}</p>
                  <p className="mt-1 text-sm italic text-muted-foreground">“{f.quote}”</p>
                  <p className="mt-2 text-sm text-foreground">{f.explanation}</p>
                </Card>
              ))}
            </div>

            <div className="flex justify-end pr-1 text-lg opacity-60">🦊</div>
          </div>
        )}
      </div>
    </main>
  );
}
