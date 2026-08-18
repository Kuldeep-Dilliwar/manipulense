export const TECHNIQUES = [
  "fear mongering",
  "false urgency",
  "appeal to authority",
  "bandwagon",
  "gaslighting",
  "cherry picking",
] as const;

export type TechniqueName = (typeof TECHNIQUES)[number];

export type Finding = {
  technique: string;
  quote: string;
  explanation: string;
};

export type AnalysisResult = {
  score: number;
  summary: string;
  text: string;
  findings: Finding[];
};

const SLUGS: Record<string, string> = {
  "fear mongering": "fear",
  "false urgency": "urgency",
  "appeal to authority": "authority",
  bandwagon: "bandwagon",
  gaslighting: "gaslighting",
  "cherry picking": "cherry",
};

export function techniqueSlug(name: string) {
  return SLUGS[name.trim().toLowerCase()] ?? "other";
}

export type Segment = { text: string; slug?: string; technique?: string };

/** Split source text into segments, marking spans matched by findings. */
export function segmentText(text: string, findings: Finding[]): Segment[] {
  type Span = { start: number; end: number; f: Finding };
  const spans: Span[] = [];
  const lower = text.toLowerCase();

  for (const f of findings) {
    const q = f.quote?.trim();
    if (!q) continue;
    const idx = lower.indexOf(q.toLowerCase());
    if (idx === -1) continue;
    const start = idx;
    const end = idx + q.length;
    if (spans.some((s) => start < s.end && end > s.start)) continue;
    spans.push({ start, end, f });
  }

  spans.sort((a, b) => a.start - b.start);
  const out: Segment[] = [];
  let cursor = 0;
  for (const s of spans) {
    if (s.start > cursor) out.push({ text: text.slice(cursor, s.start) });
    out.push({
      text: text.slice(s.start, s.end),
      slug: techniqueSlug(s.f.technique),
      technique: s.f.technique,
    });
    cursor = s.end;
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor) });
  return out;
}
