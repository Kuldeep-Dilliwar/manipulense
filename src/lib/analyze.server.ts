import { z } from "zod";
import type { AnalysisResult } from "./analysis";

export const AnalyzeInputSchema = z.object({
  text: z.string().optional(),
  url: z.string().optional(),
});

const ResultSchema = z.object({
  score: z.number(),
  summary: z.string().optional(),
  techniques: z
    .array(
      z.object({
        name: z.string(),
        quote: z.string(),
        explanation: z.string(),
        severity: z.union([z.string(), z.number()]).optional(),
      }),
    )
    .default([]),
});

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

export async function fetchUrlText(rawUrl: string) {
  const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; ManipuLens/1.0)" },
  });
  if (!res.ok) throw new Error(`Could not fetch that link (status ${res.status}).`);
  const body = await res.text();
  const text = stripHtml(body);
  if (text.length < 40) throw new Error("No readable text found at that link.");
  return text.slice(0, 12000);
}

const PROMPT = `You are a manipulation detection expert. Analyze this text and identify psychological manipulation techniques used. Return JSON with: score (0-100), and techniques array where each item has: name, quote (exact text from input), explanation, severity. Be accurate and strict in scoring.`;

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

export async function analyzeContent(input: {
  text?: string | undefined;
  url?: string | undefined;
}): Promise<AnalysisResult> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) throw new Error("Gemini API key is not configured.");

  const source = input.url?.trim()
    ? await fetchUrlText(input.url.trim())
    : (input.text ?? "").trim();

  if (source.length < 20) throw new Error("Please provide at least a couple of sentences.");

  const text = source.slice(0, 12000);

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `${PROMPT}\n\nTEXT:\n"""\n${text}\n"""` }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            score: { type: "NUMBER" },
            summary: { type: "STRING" },
            techniques: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  quote: { type: "STRING" },
                  explanation: { type: "STRING" },
                  severity: { type: "STRING" },
                },
                required: ["name", "quote", "explanation", "severity"],
              },
            },
          },
          required: ["score", "summary", "techniques"],
        },
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Gemini request failed (${res.status}). ${detail.slice(0, 300)}`.trim(),
    );
  }

  const payload = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const raw = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Gemini returned no analysis. Try again.");

  const parsed = ResultSchema.parse(JSON.parse(match[0]));

  return {
    text,
    score: Math.max(0, Math.min(100, Math.round(parsed.score))),
    summary: parsed.summary ?? "",
    findings: parsed.techniques
      .filter((t) => t.name && t.quote)
      .map((t) => ({
        technique: t.name.toLowerCase(),
        quote: t.quote,
        explanation: t.explanation,
        severity: t.severity !== undefined ? String(t.severity) : undefined,
      })),
  };
}
