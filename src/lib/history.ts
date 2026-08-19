import type { AnalysisResult } from "./analysis";

export const HISTORY_KEY = "manipulens.history.v1";

export type HistoryItem = {
  id: string;
  at: number;
  kind?: "text" | "url";
  source?: string;
  result: AnalysisResult;
};

export function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

export function saveHistory(items: HistoryItem[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable */
  }
}

export function randomId() {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);
}

/** Encode a report into a URL-safe payload so any recipient can open it. */
export function encodeReport(result: AnalysisResult): string {
  const json = JSON.stringify(result);
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeReport(payload: string): AnalysisResult | null {
  try {
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as AnalysisResult;
  } catch {
    return null;
  }
}

export function levelOf(score: number): "low" | "moderate" | "high" | "extreme" {
  if (score >= 80) return "extreme";
  if (score >= 60) return "high";
  if (score >= 35) return "moderate";
  return "low";
}
