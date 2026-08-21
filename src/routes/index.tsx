import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { analyzeManipulation, inoculateManipulation } from "@/lib/analyze.functions";
import { TECHNIQUES, segmentText, techniqueSlug, type AnalysisResult } from "@/lib/analysis";
import {
  encodeReport,
  loadHistory,
  randomId,
  saveHistory,
  type HistoryItem,
} from "@/lib/history";
import { FoxSignature } from "@/components/FoxSignature";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Eye } from "lucide-react";

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
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [viewed, setViewed] = useState<AnalysisResult | null>(null);
  const [shareState, setShareState] = useState<"idle" | "working" | "copied" | "saved">("idle");
  const [linkState, setLinkState] = useState<"idle" | "copied">("idle");
  const [inoculated, setInoculated] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const shotRef = useRef<HTMLDivElement>(null);
  const analyze = useServerFn(analyzeManipulation);
  const inoculate = useServerFn(inoculateManipulation);

  useEffect(() => setHistory(loadHistory()), []);

  const mutation = useMutation<AnalysisResult, Error, { text?: string; url?: string }>({
    mutationFn: async (input) => (await analyze({ data: input })) as AnalysisResult,
    onSuccess: (data) => {
      setViewed(data);
      setOpen(null);
      setInoculated(null);
      setLinkState("idle");
      setHistory((prev) => {
        const next = [
          {
            id: randomId(),
            at: Date.now(),
            kind: mode,
            ...(mode === "url" ? { source: url.trim() } : {}),
            result: data,
          } satisfies HistoryItem,
          ...prev.filter((h) => h.result.text !== data.text),
        ].slice(0, 50);
        saveHistory(next);
        return next;
      });
    },
  });

  const inoculation = useMutation<{ text: string }, Error, string>({
    mutationFn: async (t) => (await inoculate({ data: { text: t } })) as { text: string },
    onSuccess: (d) => setInoculated(d.text),
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

  const canSubmit = mode === "text" ? text.trim().length >= 20 : url.trim().length > 3;

  function submit() {
    if (!canSubmit) return;
    if (mode === "text") mutation.mutate({ text: text.trim() });
    else mutation.mutate({ url: url.trim() });
  }

  function clear() {
    setText("");
    setUrl("");
    setViewed(null);
    setOpen(null);
    setInoculated(null);
    setShareState("idle");
    setLinkState("idle");
    inoculation.reset();
    mutation.reset();
  }

  async function copyLink() {
    if (!result) return;
    const id = randomId();
    const link = `${window.location.origin}/r/${id}#${encodeReport(result)}`;
    try {
      localStorage.setItem(`manipulens.report.${id}`, JSON.stringify(result));
    } catch {
      /* ignore */
    }
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt("Copy this report link:", link);
    }
    setLinkState("copied");
    setTimeout(() => setLinkState("idle"), 2500);
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
    <main className="min-h-screen bg-background bg-grid">
      <FoxSignature />
      <div className="mx-auto max-w-3xl px-5 py-14">
        <header className="mb-10">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold uppercase tracking-[0.12em]">
              <span className="text-foreground">MANIPU</span>
              <span className="logo-glow">LENS</span>
            </span>
            <Eye className="logo-glow h-6 w-6" strokeWidth={2.5} />
          </div>
          <div className="logo-line mt-3" />
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.25em] text-foreground/75">
            Rhetorical Forensics Engine
          </p>
          <h1 className="mt-8 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            See the <span className="persuasion-glow">persuasion</span> behind the words.
          </h1>
          <p className="mt-4 max-w-xl text-foreground/80">
            Everything is trying to manipulate you. Now you can see it.
          </p>
        </header>

        <div className="gradient-border">
          <Card className="border-0 bg-card p-5">
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
              <Button
                onClick={submit}
                disabled={mutation.isPending || !canSubmit}
                className="analyze-glow"
              >
                {mutation.isPending ? "Analyzing…" : "Analyze"}
              </Button>
              <Button variant="outline" onClick={clear} disabled={mutation.isPending}>
                Clear
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
        </div>

        {history.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Recent analyses
            </h2>
            <div className="grid gap-2 rounded-xl border border-border bg-card/40 p-3 backdrop-blur-sm">
              {history.slice(0, 5).map((h) => (
                <button
                  key={h.id}
                  onClick={() => {
                    setViewed(h.result);
                    setOpen(null);
                    setInoculated(null);
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
            <div ref={shotRef} className="relative space-y-8 rounded-xl bg-background p-1">
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

              <div className="pointer-events-none absolute bottom-2 right-3 text-lg opacity-70">
                🦊
              </div>
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
              <Button variant="secondary" onClick={copyLink}>
                {linkState === "copied" ? "Link copied!" : "Copy link"}
              </Button>
              <Button
                onClick={() => inoculation.mutate(result.text)}
                disabled={inoculation.isPending}
              >
                {inoculation.isPending ? "Purifying…" : "Inoculate this text"}
              </Button>
            </div>

            {inoculation.isError && (
              <p className="text-sm text-destructive">{inoculation.error.message}</p>
            )}

            {inoculated && (
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-5">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Original
                  </h3>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                    {result.text}
                  </p>
                </Card>
                <Card className="p-5">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
                    Inoculated
                  </h3>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                    {inoculated}
                    {"\n\n"}
                    <span className="hidden-sig">Purified by 🦊</span>
                  </p>
                </Card>
              </div>
            )}

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
                      className={`tech-${techniqueSlug(f.technique)} border-l-[5px] rounded-xl p-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg`}
                      style={{ borderLeftColor: "var(--tech)" }}
                    >
                      <button
                        onClick={() => setOpen(isOpen ? null : i)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center justify-between gap-4 p-5 text-left"
                      >
                        <span className="min-w-0">
                          <span className="flex items-center gap-2 text-sm font-semibold capitalize text-foreground">
                            {f.technique}
                            {f.severity && (
                              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                {f.severity}
                              </span>
                            )}
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

        <footer className="mt-16 flex items-center justify-between gap-4 border-t border-border pt-6 text-sm text-foreground/70">
          <span>ManipuLens · Rhetorical Forensics Engine</span>
          <span className="group inline-flex items-center gap-2">
            <span className="text-lg">🦊</span>
            <Link
              to="/dashboard"
              className="text-sm text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus:opacity-100"
            >
              Dashboard
            </Link>
          </span>
        </footer>
      </div>
    </main>
  );
}

function scoreTone(score: number) {
  return score >= 70 ? "var(--fear)" : score >= 40 ? "var(--urgency)" : "var(--bandwagon)";
}

function ScoreDial({ score }: { score: number }) {
  const tone = scoreTone(score);
  const hot = score > 80;
  return (
    <div className={`relative shrink-0 ${hot ? "score-glow" : ""}`}>
      <div
        className="grid h-44 w-44 place-items-center rounded-full transition-all"
        style={{
          background: `conic-gradient(${tone} ${score * 3.6}deg, color-mix(in oklch, var(--muted) 80%, transparent) 0deg)`,
          boxShadow: hot
            ? `0 0 80px color-mix(in oklch, var(--fear) 55%, transparent), 0 0 30px color-mix(in oklch, var(--fear) 35%, transparent)`
            : "none",
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
