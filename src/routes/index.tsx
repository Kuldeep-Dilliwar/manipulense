import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
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

const HISTORY_KEY = "manipulens.history.v1";

type HistoryItem = { id: string; at: number; result: AnalysisResult };

function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

function Index() {
  const [mode, setMode] = useState<"text" | "url">("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [viewed, setViewed] = useState<AnalysisResult | null>(null);
  const [shareState, setShareState] = useState<"idle" | "working" | "copied" | "saved">("idle");
  const [open, setOpen] = useState<number | null>(null);
  const shotRef = useRef<HTMLDivElement>(null);
  const analyze = useServerFn(analyzeManipulation);

  useEffect(() => setHistory(loadHistory()), []);

  const mutation = useMutation<AnalysisResult, Error, { text?: string; url?: string }>({
    mutationFn: async (input) => (await analyze({ data: input })) as AnalysisResult,
    onSuccess: (data) => {
      setViewed(data);
      setOpen(null);
      setHistory((prev) => {
        const next = [
          { id: `${Date.now()}`, at: Date.now(), result: data },
          ...prev.filter((h) => h.result.text !== data.text),
        ].slice(0, 5);
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        } catch {
          /* storage unavailable */
        }
        return next;
      });
    },
  });

  const result = viewed;
  const segments = useMemo(
    () => (result ? segmentText(result.text, result.findings) : []),
    [result],
  );

  const found = useMemo(
    () => new Set(result?.findings.map((f) => f.technique.toLowerCase()) ?? []),
    [result],
  );

  function submit() {
    if (mode === "text") mutation.mutate({ text });
    else mutation.mutate({ url });
  }

  async function share() {
    if (!shotRef.current) return;
    setShareState("working");
    try {
      const { toBlob } = await import("html-to-image");
      const bg = getComputedStyle(document.body).backgroundColor;
      const blob = await toBlob(shotRef.current, { pixelRatio: 2, backgroundColor: bg });
      if (!blob) throw new Error("no blob");
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setShareState("copied");
      } catch {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "manipulens-result.png";
        a.click();
        URL.revokeObjectURL(a.href);
        setShareState("saved");
      }
    } catch {
      setShareState("idle");
    }
    setTimeout(() => setShareState("idle"), 2500);
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

        {history.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Recent analyses
            </h2>
            <div className="grid gap-2">
              {history.map((h) => (
                <button
                  key={h.id}
                  onClick={() => {
                    setViewed(h.result);
                    setOpen(null);
                  }}
                  className={`flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-accent ${
                    result?.text === h.result.text ? "ring-1 ring-primary" : ""
                  }`}
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: `color-mix(in oklch, ${scoreTone(h.result.score)} 25%, transparent)`,
                      color: scoreTone(h.result.score),
                    }}
                  >
                    {h.result.score}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {h.result.text.slice(0, 90)}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(h.at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {result && (
          <section className="mt-10 space-y-8">
            <div ref={shotRef} className="space-y-8 rounded-xl bg-background">
              <Card className="p-8">
                <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
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
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={share} disabled={shareState === "working"}>
                {shareState === "working"
                  ? "Rendering…"
                  : shareState === "copied"
                    ? "Copied image!"
                    : shareState === "saved"
                      ? "Image downloaded"
                      : "Share as image"}
              </Button>
            </div>

            <div>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {result.findings.length} technique
                {result.findings.length === 1 ? "" : "s"} found
              </h2>
              <div className="grid gap-4">
                {result.findings.map((f, i) => {
                  const isOpen = open === i;
                  return (
                    <Card
                      key={i}
                      className={`tech-${techniqueSlug(f.technique)} border-l-4 p-0`}
                      style={{ borderLeftColor: "var(--tech)" }}
                    >
                      <button
                        onClick={() => setOpen(isOpen ? null : i)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center justify-between gap-4 p-5 text-left"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold capitalize text-foreground">
                            {f.technique}
                          </span>
                          <span className="mt-1 block truncate text-sm italic text-muted-foreground">
                            “{f.quote}”
                          </span>
                        </span>
                        <span
                          className={`shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                        >
                          ▾
                        </span>
                      </button>
                      {isOpen && (
                        <div className="border-t border-border p-5 pt-4">
                          <blockquote className="border-l-2 border-border pl-3 text-sm italic text-muted-foreground">
                            “{f.quote}”
                          </blockquote>
                          <p className="mt-3 text-sm text-foreground">{f.explanation}</p>
                        </div>
                      )}
                    </Card>
                  );
                })}
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

function scoreTone(score: number) {
  return score >= 70 ? "var(--fear)" : score >= 40 ? "var(--urgency)" : "var(--bandwagon)";
}

function ScoreDial({ score }: { score: number }) {
  const tone = scoreTone(score);
  const hot = score >= 70;
  return (
    <div className={`relative shrink-0 ${hot ? "score-glow" : ""}`}>
      <div
        className="grid h-44 w-44 place-items-center rounded-full transition-all"
        style={{
          background: `conic-gradient(${tone} ${score * 3.6}deg, color-mix(in oklch, var(--muted) 80%, transparent) 0deg)`,
          boxShadow: hot ? `0 0 60px color-mix(in oklch, var(--fear) 45%, transparent)` : "none",
        }}
      >
        <div className="grid h-[9.5rem] w-[9.5rem] place-items-center rounded-full bg-card">
          <span className="text-5xl font-semibold tabular-nums" style={{ color: tone }}>
            {score}
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            / 100
          </span>
        </div>
      </div>
    </div>
  );
}
