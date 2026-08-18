import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { analyzeManipulation } from "@/lib/analyze.functions";
import { TECHNIQUES, segmentText, techniqueSlug, type AnalysisResult } from "@/lib/analysis";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ManipuLens — Spot Manipulation in Any Text" },
      {
        name: "description",
        content:
          "Paste text or a link and ManipuLens highlights fear mongering, false urgency, gaslighting and more, with a manipulation score out of 100.",
      },
      { property: "og:title", content: "ManipuLens — Spot Manipulation in Any Text" },
      {
        property: "og:description",
        content:
          "AI analysis that highlights psychological manipulation techniques and scores how manipulative a text is.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const SAMPLE = `Time is running out — only 3 spots left before midnight, and once they're gone, you'll be left behind while everyone else moves forward. Leading experts agree this is the single most important decision you'll make this year. Thousands of people just like you have already joined. If you feel hesitant, that's just your fear talking; you've always been the type to overthink things that are perfectly obvious. Every single customer who joined last month reported better results.`;

function Index() {
  const [mode, setMode] = useState<"text" | "url">("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const analyze = useServerFn(analyzeManipulation);

  const mutation = useMutation<AnalysisResult, Error, { text?: string; url?: string }>({
    mutationFn: async (input) => (await analyze({ data: input })) as AnalysisResult,
  });

  const result = mutation.data;
  const segments = useMemo(
    () => (result ? segmentText(result.text, result.findings) : []),
    [result],
  );

  const found = useMemo(() => {
    const set = new Set(result?.findings.map((f) => f.technique.toLowerCase()) ?? []);
    return set;
  }, [result]);

  function submit() {
    if (mode === "text") mutation.mutate({ text });
    else mutation.mutate({ url });
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-14">
        <header className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            ManipuLens
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            See the persuasion behind the words.
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Paste any text or drop in a link. ManipuLens highlights manipulation techniques
            sentence by sentence and scores how hard it is pushing you.
          </p>
        </header>

        <Card className="p-5">
          <div className="mb-4 inline-flex rounded-lg bg-muted p-1">
            {(["text", "url"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  mode === m
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "text" ? "Paste text" : "Enter URL"}
              </button>
            ))}
          </div>

          {mode === "text" ? (
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder="Paste an article, email, ad or message…"
              className="resize-y"
            />
          ) : (
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
            />
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button onClick={submit} disabled={mutation.isPending}>
              {mutation.isPending ? "Analyzing…" : "Analyze"}
            </Button>
            {mode === "text" && (
              <Button variant="ghost" onClick={() => setText(SAMPLE)} disabled={mutation.isPending}>
                Try a sample
              </Button>
            )}
          </div>

          {mutation.isError && (
            <p className="mt-4 text-sm text-destructive">{mutation.error.message}</p>
          )}
        </Card>

        {result && (
          <section className="mt-10 space-y-8">
            <Card className="p-6">
              <div className="flex items-center gap-6">
                <ScoreDial score={result.score} />
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Manipulation score</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{result.summary}</p>
                </div>
              </div>
            </Card>

            <div className="flex flex-wrap gap-2">
              {TECHNIQUES.map((t) => (
                <span
                  key={t}
                  className={`mark-technique tech-${techniqueSlug(t)} text-xs font-medium capitalize ${
                    found.has(t) ? "" : "opacity-35"
                  }`}
                >
                  {t}
                </span>
              ))}
            </div>

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

            <div>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {result.findings.length} technique
                {result.findings.length === 1 ? "" : "s"} found
              </h2>
              <div className="grid gap-4">
                {result.findings.map((f, i) => (
                  <Card
                    key={i}
                    className={`tech-${techniqueSlug(f.technique)} border-l-4 p-5`}
                    style={{ borderLeftColor: "var(--tech)" }}
                  >
                    <p className="text-sm font-semibold capitalize text-foreground">
                      {f.technique}
                    </p>
                    <blockquote className="mt-2 border-l-2 border-border pl-3 text-sm italic text-muted-foreground">
                      “{f.quote}”
                    </blockquote>
                    <p className="mt-3 text-sm text-foreground">{f.explanation}</p>
                  </Card>
                ))}
                {result.findings.length === 0 && (
                  <Card className="p-5 text-sm text-muted-foreground">
                    No manipulation techniques detected in this text.
                  </Card>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function ScoreDial({ score }: { score: number }) {
  const tone = score >= 66 ? "var(--fear)" : score >= 33 ? "var(--urgency)" : "var(--bandwagon)";
  return (
    <div
      className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full"
      style={{
        background: `conic-gradient(${tone} ${score * 3.6}deg, color-mix(in oklch, var(--muted) 90%, transparent) 0deg)`,
      }}
    >
      <div className="grid h-[74px] w-[74px] place-items-center rounded-full bg-card">
        <span className="text-2xl font-semibold text-foreground">{score}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}
