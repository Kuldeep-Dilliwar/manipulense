import { z } from "zod";
import type { AnalysisResult } from "./analysis";

export const AnalyzeInputSchema = z.object({
  text: z.string().optional(),
  url: z.string().optional(),
});

export const InoculateInputSchema = z.object({
  text: z.string().min(20),
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

const PROMPT = `You are a manipulation detection expert. Analyze this text and identify psychological manipulation techniques used. Return JSON with: score (0-100), and techniques array where each item has: name, quote (exact text from input), explanation, severity. Be accurate and strict in scoring.
Use exactly one of these lowercase names for "name": fear mongering, false urgency, appeal to authority, bandwagon, gaslighting, cherry picking.
"quote" must be copied character-for-character from the input text (under ~200 characters). "severity" is one of: low, medium, high. Also include a one-sentence "summary".`;

/** Primary model first; fallbacks used when a model is unavailable/overloaded. */
const GEMINI_MODELS = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-flash-lite-latest"];
const geminiUrl = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

export async function analyzeContent(input: {
  text?: string | undefined;
  url?: string | undefined;
}): Promise<AnalysisResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key is not configured.");

  const source = input.url?.trim()
    ? await fetchUrlText(input.url.trim())
    : (input.text ?? "").trim();

  if (source.length < 20) throw new Error("Please provide at least a couple of sentences.");

  const text = source.slice(0, 12000);

  const body = JSON.stringify({
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
  });

  let res!: Response;
  outer: for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await fetch(geminiUrl(model), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body,
      });
      if (res.ok) break outer;
      if (res.status !== 429 && res.status < 500) break outer; // terminal error
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
    }
  }


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

  // Some responses come back on a 0-1 scale; normalize to 0-100.
  const rawScore = parsed.score > 0 && parsed.score <= 1 ? parsed.score * 100 : parsed.score;

  return {
    text,
    score: Math.max(0, Math.min(100, Math.round(rawScore))),
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

const INOCULATE_PROMPT = `Rewrite this text removing all psychological manipulation techniques while keeping core message and facts intact. Make it neutral, honest and direct. Return only the rewritten text, with no preamble or commentary.`;

export async function inoculateContent(input: { text: string }): Promise<{ text: string }> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key is not configured.");

  const source = input.text.trim().slice(0, 12000);
  if (source.length < 20) throw new Error("Please provide at least a couple of sentences.");

  const body = JSON.stringify({
    contents: [
      { role: "user", parts: [{ text: `${INOCULATE_PROMPT}\n\nTEXT:\n"""\n${source}\n"""` }] },
    ],
    generationConfig: { temperature: 0.3 },
  });

  let res!: Response;
  outer: for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await fetch(geminiUrl(model), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body,
      });
      if (res.ok) break outer;
      if (res.status !== 429 && res.status < 500) break outer;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
    }
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini request failed (${res.status}). ${detail.slice(0, 300)}`.trim());
  }

  const payload = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const out = (payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "")
    .trim()
    .replace(/^"""|"""$/g, "")
    .trim();
  if (!out) throw new Error("Gemini returned no rewrite. Try again.");
  return { text: out };
}
