import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import type { AnalysisResult } from "./analysis";

export const AnalyzeInputSchema = z.object({
  text: z.string().optional(),
  url: z.string().optional(),
});

const ResultSchema = z.object({
  score: z.number(),
  summary: z.string(),
  findings: z.array(
    z.object({
      technique: z.string(),
      quote: z.string(),
      explanation: z.string(),
    }),
  ),
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

const SYSTEM = `You analyze text for psychological manipulation techniques.
Only consider these techniques: fear mongering, false urgency, appeal to authority, bandwagon, gaslighting, cherry picking.
For each instance, return the EXACT verbatim substring from the text as "quote" (copy it character-for-character, keep it under ~200 characters), the technique name in lowercase exactly as listed, and a 1-2 sentence explanation of why it manipulates.
Return a manipulation score from 0 (neutral, factual) to 100 (extremely manipulative), and a one-sentence summary.
If the text is clean, return an empty findings array and a low score.`;

export async function analyzeContent(input: {
  text?: string | undefined;
  url?: string | undefined;
}): Promise<AnalysisResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured.");

  const source = input.url?.trim()
    ? await fetchUrlText(input.url.trim())
    : (input.text ?? "").trim();

  if (source.length < 20) throw new Error("Please provide at least a couple of sentences.");

  const gateway = createLovableAiGatewayProvider(apiKey);
  const text = source.slice(0, 12000);

  let parsed: z.infer<typeof ResultSchema>;
  try {
    const result = await generateText({
      model: gateway("google/gemini-3.6-flash"),
      system: SYSTEM,
      prompt: `Analyze this text:\n\n"""\n${text}\n"""`,
      output: Output.object({ schema: ResultSchema }),
    });
    parsed = result.output;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error) && error.text) {
      const match = error.text.match(/\{[\s\S]*\}/);
      if (!match) throw error;
      parsed = ResultSchema.parse(JSON.parse(match[0]));
    } else {
      throw error;
    }
  }

  return {
    text,
    score: Math.max(0, Math.min(100, Math.round(parsed.score))),
    summary: parsed.summary,
    findings: parsed.findings.filter((f) => f.quote && f.technique),
  };
}
