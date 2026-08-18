import { createServerFn } from "@tanstack/react-start";
import { AnalyzeInputSchema, analyzeContent } from "./analyze.server";

export const analyzeManipulation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AnalyzeInputSchema.parse(input))
  .handler(async ({ data }) => analyzeContent(data));
